/**
 * GET /api/dreps
 * The scoreboard: every DRep's latest score, filtered, sorted and paged.
 *
 * All rows (≈1.7k) are loaded once and cached, then filtered in memory, so the
 * total always matches the filters and any column can be sorted.
 *
 * pool=active (default): registered, has voted, and holds delegated ADA.
 * pool=registered: every registered DRep. pool=all: retired ones too.
 * No auth required (public data).
 */

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/sync/supabase-admin';
import { toDisplayProfile, type DisplayProfile } from '@/lib/metadata/profile-display';

export const dynamic = 'force-dynamic';

interface DRepScoreRow {
  drep_id: string;
  hex_id: string | null;
  is_registered: boolean;
  amount_lovelace: string | null;
  delegator_count: number | null;
  raw_govscore: number | null;
  adjusted_govscore: number | null;
  participation_rate: number | null;
  voting_streak_epochs: number | null;
  votes_cast: number | null;
  votes_eligible: number | null;
  epoch: number;
  profile: DisplayProfile;
  vote_summary: { yes: number; no: number; abstain: number };
}

type Pool = 'active' | 'registered' | 'all';

const SORTS = {
  adjusted_govscore: (r: DRepScoreRow) => r.adjusted_govscore ?? -1,
  raw_govscore: (r: DRepScoreRow) => r.raw_govscore ?? -1,
  participation_rate: (r: DRepScoreRow) => r.participation_rate ?? -1,
  amount_lovelace: (r: DRepScoreRow) => Number(r.amount_lovelace ?? 0),
  delegator_count: (r: DRepScoreRow) => r.delegator_count ?? 0,
  voting_streak_epochs: (r: DRepScoreRow) => r.voting_streak_epochs ?? 0,
} as const;

const PAGE = 1000;
const TTL_MS = 10 * 60 * 1000;
let cache: { at: number; epoch: number; rows: DRepScoreRow[] } | null = null;
let inflight: Promise<{ epoch: number; rows: DRepScoreRow[] }> | null = null;

async function loadRows(): Promise<{ epoch: number; rows: DRepScoreRow[] }> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache;
  inflight ??= (async () => {
    const { data: latest, error: epochError } = await supabaseAdmin.from('drep_scores').select('epoch').order('epoch', { ascending: false }).limit(1);
    if (epochError || !latest?.length) throw new Error(`Couldn't read the latest scored epoch: ${epochError?.message ?? 'no scores yet'}. Run the cron.`);
    const epoch = (latest[0] as { epoch: number }).epoch;

    type Score = Omit<DRepScoreRow, 'hex_id' | 'is_registered' | 'amount_lovelace' | 'delegator_count' | 'profile' | 'vote_summary'>;
    type DRep = { drep_id: string; hex_id: string | null; is_registered: boolean; amount_lovelace: string | null; delegator_count: number | null; metadata: unknown; metadata_fetch_status: string | null };
    const scores: Score[] = [];
    const dreps: DRep[] = [];
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabaseAdmin
        .from('drep_scores')
        .select('epoch, drep_id, raw_govscore, adjusted_govscore, participation_rate, voting_streak_epochs, votes_cast, votes_eligible')
        .eq('epoch', epoch)
        .order('drep_id')
        .range(from, from + PAGE - 1);
      if (error) throw new Error(`Couldn't read drep_scores: ${error.message}`);
      scores.push(...((data ?? []) as Score[]));
      if (!data || data.length < PAGE) break;
    }
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabaseAdmin
        .from('dreps')
        .select('drep_id, hex_id, is_registered, amount_lovelace, delegator_count, metadata, metadata_fetch_status')
        .order('drep_id')
        .range(from, from + PAGE - 1);
      if (error) throw new Error(`Couldn't read dreps: ${error.message}`);
      dreps.push(...((data ?? []) as DRep[]));
      if (!data || data.length < PAGE) break;
    }
    const byId = new Map(dreps.map((d) => [d.drep_id, d]));
    const rows: DRepScoreRow[] = [];
    for (const s of scores) {
      const d = byId.get(s.drep_id);
      if (!d) continue;
      rows.push({
        ...s,
        hex_id: d.hex_id,
        is_registered: d.is_registered,
        amount_lovelace: d.amount_lovelace === null ? null : String(d.amount_lovelace),
        delegator_count: d.delegator_count,
        profile: toDisplayProfile(d.metadata, d.metadata_fetch_status, d.drep_id),
        vote_summary: { yes: 0, no: 0, abstain: 0 },
      });
    }
    cache = { at: Date.now(), epoch, rows };
    return cache;
  })().finally(() => {
    inflight = null;
  });
  return inflight;
}

function inPool(r: DRepScoreRow, pool: Pool): boolean {
  if (pool === 'all') return true;
  if (!r.is_registered) return false;
  if (pool === 'registered') return true;
  return (r.votes_cast ?? 0) > 0 && Number(r.amount_lovelace ?? 0) > 0;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sort = (searchParams.get('sort') || 'adjusted_govscore') as keyof typeof SORTS;
    const order = (searchParams.get('order') || 'desc').toLowerCase();
    if (!(sort in SORTS)) return NextResponse.json({ error: `Invalid sort field. Must be one of: ${Object.keys(SORTS).join(', ')}` }, { status: 400 });
    if (order !== 'asc' && order !== 'desc') return NextResponse.json({ error: 'Order must be asc or desc' }, { status: 400 });

    const search = (searchParams.get('search') ?? '').trim().toLowerCase().slice(0, 64);
    const minParticipation = parseFloat(searchParams.get('min_participation') || '0');
    // ADA bounds arrive in millions of ADA (the filter bar's unit).
    const minAda = parseFloat(searchParams.get('min_ada') || '0');
    const maxAda = parseFloat(searchParams.get('max_ada') || '999999999');
    const poolParam = searchParams.get('pool');
    const pool: Pool = poolParam === 'registered' || poolParam === 'all' ? poolParam : searchParams.get('registered') === 'false' ? 'all' : 'active';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const perPage = Math.min(100, Math.max(1, parseInt(searchParams.get('per_page') || '50', 10)));

    const { epoch, rows } = await loadRows();
    const minLovelace = minAda * 1e12;
    const maxLovelace = maxAda * 1e12;
    const key = SORTS[sort];
    const sign = order === 'asc' ? 1 : -1;
    const filtered = rows
      .filter(
        (r) =>
          inPool(r, pool) &&
          (minParticipation <= 0 || (r.participation_rate ?? 0) >= minParticipation / 100) &&
          (minAda <= 0 || Number(r.amount_lovelace ?? 0) >= minLovelace) &&
          (maxAda >= 999999999 || Number(r.amount_lovelace ?? 0) <= maxLovelace) &&
          (!search ||
            r.drep_id.toLowerCase().includes(search) ||
            (r.hex_id ?? '').toLowerCase().includes(search) ||
            (r.profile.name ?? '').toLowerCase().includes(search))
      )
      .sort((a, b) => sign * (key(a) - key(b)) || (b.adjusted_govscore ?? -1) - (a.adjusted_govscore ?? -1));

    const pageRows = filtered.slice((page - 1) * perPage, page * perPage).map((r) => ({ ...r }));
    if (pageRows.length) {
      const { data: summaries, error } = await supabaseAdmin.rpc('get_vote_summaries', { drep_ids: pageRows.map((d) => d.drep_id) });
      if (error) console.error(JSON.stringify({ event: 'vote_summary_error', error: error.message }));
      const byDRep = new Map(
        ((summaries ?? []) as Array<{ drep_id: string; yes_count: number; no_count: number; abstain_count: number }>).map((r) => [
          r.drep_id,
          { yes: Number(r.yes_count), no: Number(r.no_count), abstain: Number(r.abstain_count) },
        ])
      );
      for (const d of pageRows) d.vote_summary = byDRep.get(d.drep_id) ?? d.vote_summary;
    }

    return NextResponse.json({
      dreps: pageRows,
      total: filtered.length,
      page,
      total_pages: Math.ceil(filtered.length / perPage),
      epoch,
      pool,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(JSON.stringify({ event: 'dreps_api_failed', error: message }));
    return NextResponse.json({ error: `Couldn't load the scoreboard: ${message}` }, { status: 500 });
  }
}
