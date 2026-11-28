/**
 * Backing snapshots for Momentum (see lib/season/momentum.ts), once per epoch:
 *  1. each registered DRep's ADA, delegators, and delegators with 100+ ADA;
 *  2. where each fantasy team wallet is delegated (so a wallet's delegation to
 *     a DRep it drafted can be ignored);
 *  3. a one-time backfill of ADA from Koios power history for this season and
 *     the last, so the first comparison has a baseline.
 * Needs migration 025; skips quietly without it.
 */

import { z } from 'zod';
import { koiosFetch } from '@/lib/koios/client';
import { fetchCurrentEpoch } from '@/lib/koios';
import { supabaseAdmin } from './supabase-admin';
import { MOMENTUM } from '@/lib/season/momentum';
import { windowEpochs, windowForEpoch } from '@/lib/season/points';
import { isMissingSchema } from '@/lib/season/schema';

const MAX_PAGED_DELEGATORS = 1000;
const CONCURRENCY = 4;
const WRITE_BATCH = 500;

const DelegatorAmounts = z.array(z.object({ amount: z.string() }));
const PowerRows = z.array(z.object({ drep_id: z.string(), amount: z.string() }));
const Accounts = z.array(z.object({ stake_address: z.string(), delegated_drep: z.string().nullable(), total_balance: z.string().nullable().optional() }));

export interface BackingResult {
  skipped?: string;
  epoch: number;
  dreps: number;
  counted: number;
  wallets: number;
  backfilled: number;
}

async function inBatches<T>(items: T[], size: number, fn: (batch: T[]) => Promise<void>) {
  for (let i = 0; i < items.length; i += size) await fn(items.slice(i, i + size));
}

/** Delegators with 100+ ADA, or null for DReps too large to page cheaply (their raw count is used instead). */
async function qualifiedCount(drepId: string, delegators: number): Promise<number | null> {
  if (delegators === 0) return 0;
  if (delegators > MAX_PAGED_DELEGATORS) return null;
  try {
    const rows = DelegatorAmounts.parse(
      await koiosFetch<unknown>(`/drep_delegators?_drep_id=${encodeURIComponent(drepId)}&select=amount&limit=${MAX_PAGED_DELEGATORS}`, { method: 'GET' })
    );
    const min = MOMENTUM.minDelegatorAda * 1_000_000;
    return rows.filter((r) => Number(r.amount) >= min).length;
  } catch {
    return null;
  }
}

async function backfillPower(epochs: number[], known: Set<string>): Promise<number> {
  let written = 0;
  for (const epoch of epochs) {
    const rows: Array<{ drep_id: string; epoch: number; amount_lovelace: string }> = [];
    for (let offset = 0; ; offset += 1000) {
      const page = PowerRows.parse(
        await koiosFetch<unknown>(`/drep_voting_power_history?_epoch_no=${epoch}&select=drep_id,amount&offset=${offset}&limit=1000`, { method: 'GET' })
      );
      for (const p of page) if (known.has(p.drep_id)) rows.push({ drep_id: p.drep_id, epoch, amount_lovelace: p.amount });
      if (page.length < 1000) break;
    }
    await inBatches(rows, WRITE_BATCH, async (batch) => {
      const { error } = await supabaseAdmin.from('drep_backing_snapshots').upsert(batch, { onConflict: 'drep_id,epoch', ignoreDuplicates: true });
      if (error) throw new Error(`Failed to backfill backing for epoch ${epoch}: ${error.message}`);
    });
    written += rows.length;
  }
  return written;
}

export async function syncBacking(options: { force?: boolean } = {}): Promise<BackingResult> {
  const epoch = await fetchCurrentEpoch();
  const result: BackingResult = { epoch, dreps: 0, counted: 0, wallets: 0, backfilled: 0 };

  const existing = await supabaseAdmin.from('drep_backing_snapshots').select('epoch').eq('epoch', epoch).not('delegators', 'is', null).limit(1);
  if (existing.error) {
    if (isMissingSchema(existing.error)) return { ...result, skipped: 'Run supabase/migrations/025_backing_snapshots.sql to start Momentum snapshots.' };
    throw new Error(`Failed to read backing snapshots: ${existing.error.message}`);
  }

  const { data: dreps, error } = await supabaseAdmin.from('dreps').select('drep_id, is_registered, amount_lovelace, delegator_count');
  if (error) throw new Error(`Failed to read DReps for backing snapshots: ${error.message}. Check SUPABASE_SERVICE_ROLE_KEY.`);
  const all = (dreps ?? []) as Array<{ drep_id: string; is_registered: boolean | null; amount_lovelace: number | string | null; delegator_count: number | null }>;
  const known = new Set(all.map((d) => d.drep_id));

  // Baseline: ADA from Koios history for epochs of this window and the last that have no snapshot yet.
  const window = windowForEpoch(epoch);
  const wanted: number[] = [];
  for (let e = windowEpochs(window - 1).start; e < epoch; e++) wanted.push(e);
  const missing: number[] = [];
  for (const e of wanted) {
    const { count } = await supabaseAdmin.from('drep_backing_snapshots').select('epoch', { count: 'exact', head: true }).eq('epoch', e);
    if (!count) missing.push(e);
  }
  result.backfilled = await backfillPower(missing, known);

  if (!existing.data?.length || options.force) {
    const registered = all.filter((d) => d.is_registered !== false);
    const rows: Array<{ drep_id: string; epoch: number; amount_lovelace: string; delegators: number; qualified_delegators: number | null; captured_at: string }> = [];
    const queue = registered.slice();
    const now = new Date().toISOString();
    await Promise.all(
      Array.from({ length: CONCURRENCY }, async () => {
        for (let d = queue.shift(); d; d = queue.shift()) {
          const delegators = d.delegator_count ?? 0;
          const qualified = await qualifiedCount(d.drep_id, delegators);
          if (qualified !== null) result.counted++;
          rows.push({ drep_id: d.drep_id, epoch, amount_lovelace: String(d.amount_lovelace ?? 0), delegators, qualified_delegators: qualified, captured_at: now });
        }
      })
    );
    await inBatches(rows, WRITE_BATCH, async (batch) => {
      const { error: e } = await supabaseAdmin.from('drep_backing_snapshots').upsert(batch, { onConflict: 'drep_id,epoch' });
      if (e) throw new Error(`Failed to save backing snapshots: ${e.message}`);
    });
    result.dreps = rows.length;
  }

  // Team wallets of recent seasons: where each is delegated now.
  const { data: rosters } = await supabaseAdmin.from('fantasy_rosters').select('stake_address').order('season_number', { ascending: false }).limit(5000);
  const addresses = Array.from(new Set((rosters ?? []).map((r: { stake_address: string }) => r.stake_address)));
  await inBatches(addresses, 50, async (batch) => {
    const info = Accounts.parse(await koiosFetch<unknown>('/account_info', { method: 'POST', body: { _stake_addresses: batch } }));
    const rows = info.map((a) => ({
      stake_address: a.stake_address,
      epoch,
      drep_id: a.delegated_drep,
      amount_lovelace: a.total_balance ?? '0',
      captured_at: new Date().toISOString(),
    }));
    const { error: e } = await supabaseAdmin.from('team_wallet_snapshots').upsert(rows, { onConflict: 'stake_address,epoch' });
    if (e) throw new Error(`Failed to save team wallet snapshots: ${e.message}`);
    result.wallets += rows.length;
  });

  return result;
}
