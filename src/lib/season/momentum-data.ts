/**
 * Loads the snapshots Momentum needs and computes it for one season window.
 * Server-only. Until migration 025 is run this returns no Momentum, so season
 * points are simply unchanged.
 */

import { supabaseAdmin } from '@/lib/sync/supabase-admin';
import { momentumFor, type BackingSnapshot, type Momentum, type WalletSnapshot } from './momentum';
import { seasonNumber, windowEpochs } from './points';
import { isMissingSchema } from './schema';

const PAGE = 1000;

async function pageAll<T>(table: string, columns: string, from: number, to: number, order: [string, string]): Promise<T[] | null> {
  const rows: T[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabaseAdmin
      .from(table)
      .select(columns)
      .gte('epoch', from)
      .lte('epoch', to)
      .order(order[0])
      .order(order[1])
      .range(offset, offset + PAGE - 1);
    if (error) {
      if (isMissingSchema(error)) return null;
      throw new Error(`Failed to read ${table} for Momentum: ${error.message}. Run supabase/migrations/025_backing_snapshots.sql if it hasn't been.`);
    }
    rows.push(...((data ?? []) as T[]));
    if (!data || data.length < PAGE) return rows;
  }
}

/** Team wallets of the season played in `window`, and the DReps each drafted. */
async function draftedBy(window: number): Promise<Map<string, Set<string>>> {
  const out = new Map<string, Set<string>>();
  const season = seasonNumber(window);
  if (season === null) return out;
  const { data, error } = await supabaseAdmin
    .from('fantasy_roster_picks')
    .select('drep_id, fantasy_rosters!inner(stake_address, season_number)')
    .eq('fantasy_rosters.season_number', season);
  if (error) return out;
  for (const row of (data ?? []) as Array<{ drep_id: string; fantasy_rosters: { stake_address: string } | Array<{ stake_address: string }> }>) {
    const roster = Array.isArray(row.fantasy_rosters) ? row.fantasy_rosters[0] : row.fantasy_rosters;
    if (!roster) continue;
    const set = out.get(roster.stake_address) ?? new Set<string>();
    set.add(row.drep_id);
    out.set(roster.stake_address, set);
  }
  return out;
}

/** Momentum per DRep for a season window; empty before the Preseason or without snapshots. */
export async function loadMomentum(window: number): Promise<Map<string, Momentum>> {
  if (seasonNumber(window) === null) return new Map();
  const from = windowEpochs(window - 1).start;
  const to = windowEpochs(window).end;
  try {
    const [backing, wallets, drafted] = await Promise.all([
      pageAll<{ drep_id: string; epoch: number; amount_lovelace: number | string; delegators: number | null; qualified_delegators: number | null }>(
        'drep_backing_snapshots',
        'drep_id, epoch, amount_lovelace, delegators, qualified_delegators',
        from,
        to,
        ['drep_id', 'epoch']
      ),
      pageAll<{ stake_address: string; epoch: number; drep_id: string | null; amount_lovelace: number | string }>(
        'team_wallet_snapshots',
        'stake_address, epoch, drep_id, amount_lovelace',
        from,
        to,
        ['stake_address', 'epoch']
      ),
      draftedBy(window),
    ]);
    if (!backing) return new Map();
    const snaps: BackingSnapshot[] = backing.map((r) => ({
      drep_id: r.drep_id,
      epoch: r.epoch,
      ada: Number(r.amount_lovelace) / 1_000_000,
      delegators: r.delegators,
      qualified: r.qualified_delegators,
    }));
    const walletSnaps: WalletSnapshot[] = (wallets ?? []).map((w) => ({
      stake_address: w.stake_address,
      epoch: w.epoch,
      drep_id: w.drep_id,
      ada: Number(w.amount_lovelace) / 1_000_000,
    }));
    return momentumFor(snaps, window, walletSnaps, drafted);
  } catch (error) {
    // Momentum is a bonus: if it can't be read, season points stand without it.
    console.error(JSON.stringify({ event: 'momentum_load_failed', window, error: error instanceof Error ? error.message : String(error) }));
    return new Map();
  }
}
