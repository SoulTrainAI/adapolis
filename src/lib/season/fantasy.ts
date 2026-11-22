/**
 * Fantasy drafting: which season is open for drafting, the draft pool, and
 * saving rosters. Server-only (service role).
 *
 * Every registered DRep is draftable. Each pick's underdog multiplier is
 * size-based (never rank-based) and is fixed when the DRep is first picked.
 * The scale is built from DReps active in the window before the draft
 * season, so it doesn't drift while people draft.
 */

import { supabaseAdmin } from '@/lib/sync/supabase-admin';
import { fetchCurrentEpoch } from '@/lib/koios';
import { loadAll } from '@/lib/scoring/govscore-v1';
import { toDisplayProfile } from '@/lib/metadata/profile-display';
import { getSeasonData } from './data';
import { seasonOneStartEpoch, underdogScale, windowEpochs, windowForEpoch } from './points';

export const ROSTER_SIZE = 5;
const DRAFT_LOCK_MS = 24 * 60 * 60 * 1000;

// Shelley-era epochs are exactly 5 days from epoch 208 (checked against Koios epoch_info).
const SHELLEY_EPOCH = 208;
const SHELLEY_START_S = 1596059091;
const EPOCH_S = 432_000;

export function epochStart(epoch: number): Date {
  return new Date((SHELLEY_START_S + (epoch - SHELLEY_EPOCH) * EPOCH_S) * 1000);
}

export interface DraftSeason {
  season_number: number;
  grid_window: number;
  start_epoch: number;
  end_epoch: number;
  starts_at: string;
  draft_locks_at: string;
  ends_at: string;
}

function seasonFor(seasonNumber: number, launchWindow: number): DraftSeason {
  const window = launchWindow + seasonNumber - 1;
  const { start, end } = windowEpochs(window);
  const startsAt = epochStart(start);
  return {
    season_number: seasonNumber,
    grid_window: window,
    start_epoch: start,
    end_epoch: end,
    starts_at: startsAt.toISOString(),
    draft_locks_at: new Date(startsAt.getTime() + DRAFT_LOCK_MS).toISOString(),
    ends_at: epochStart(end + 1).toISOString(),
  };
}

/**
 * The season people can draft for now: the earliest season whose lock is
 * still ahead. Null only when SEASON_ONE_START_EPOCH is "off".
 */
export async function draftSeason(now = new Date()): Promise<(DraftSeason & { reference_window: number }) | null> {
  const launch = seasonOneStartEpoch();
  if (launch === null) return null;
  const launchWindow = windowForEpoch(launch);
  const currentWindow = windowForEpoch(await fetchCurrentEpoch());
  let n = Math.max(1, currentWindow - launchWindow + 1);
  while (new Date(seasonFor(n, launchWindow).draft_locks_at) <= now) n++;
  const season = seasonFor(n, launchWindow);
  // Multipliers are scaled on the latest finished window, so they hold still while people
  // draft, even when drafting opens weeks before the season.
  return { ...season, reference_window: Math.min(season.grid_window, currentWindow) - 1 };
}

/** Creates the season row on first use; rosters reference it. */
async function ensureSeasonRow(season: DraftSeason): Promise<void> {
  const row: DraftSeason = {
    season_number: season.season_number,
    grid_window: season.grid_window,
    start_epoch: season.start_epoch,
    end_epoch: season.end_epoch,
    starts_at: season.starts_at,
    draft_locks_at: season.draft_locks_at,
    ends_at: season.ends_at,
  };
  const { error } = await supabaseAdmin.from('seasons').upsert(row, { onConflict: 'season_number', ignoreDuplicates: true });
  if (error) {
    throw new Error(`Couldn't create season ${season.season_number}: ${error.message}. Run supabase/migrations/010_fantasy_seasons.sql if the table is missing.`);
  }
}

export interface PoolDRep {
  drep_id: string;
  name: string | null;
  image: string | null;
  ada: number;
  delegators: number;
  underdog: number;
  /** Points in the reference window (the one before the draft season) */
  last_points: number | null;
  last_votes: number;
  drafted_by: number;
  do_not_list: boolean;
}

export interface RosterPick {
  slot: number;
  drep_id: string;
  underdog_multiplier: number;
  picked_at: string;
}

export interface Roster {
  roster_id: string;
  team_name: string | null;
  picks: RosterPick[];
}

export interface DraftData {
  season: DraftSeason & { reference_window: number };
  reference_window: { start_epoch: number; end_epoch: number };
  pool: PoolDRep[];
  roster: Roster | null;
}

async function loadRoster(seasonNumber: number, stakeAddress: string): Promise<Roster | null> {
  const { data, error } = await supabaseAdmin
    .from('fantasy_rosters')
    .select('roster_id, team_name, fantasy_roster_picks(slot, drep_id, underdog_multiplier, picked_at)')
    .eq('season_number', seasonNumber)
    .eq('stake_address', stakeAddress)
    .maybeSingle();
  if (error) throw new Error(`Couldn't load your roster: ${error.message}`);
  if (!data) return null;
  const picks = (data.fantasy_roster_picks as Array<{ slot: number; drep_id: string; underdog_multiplier: number | string; picked_at: string }>)
    .map((p) => ({ slot: p.slot, drep_id: p.drep_id, underdog_multiplier: Number(p.underdog_multiplier), picked_at: p.picked_at }))
    .sort((a, b) => a.slot - b.slot);
  return { roster_id: data.roster_id as string, team_name: (data.team_name as string | null) ?? null, picks };
}

async function draftCounts(seasonNumber: number): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  const { data, error } = await supabaseAdmin
    .from('fantasy_roster_picks')
    .select('drep_id, fantasy_rosters!inner(season_number)')
    .eq('fantasy_rosters.season_number', seasonNumber);
  if (error) return counts;
  for (const row of data ?? []) counts.set(row.drep_id as string, (counts.get(row.drep_id as string) ?? 0) + 1);
  return counts;
}

/** Multiplier scale for a draft season, plus the reference window's standings. */
async function draftScale(season: { reference_window: number }) {
  const reference = await getSeasonData({ window: season.reference_window });
  const scale = underdogScale(
    reference.standings.map((s) => ({ drep_id: s.drep_id, amount_lovelace: s.amount_lovelace, delegator_count: s.delegator_count }))
  );
  return { reference, scale };
}

export async function getDraftData(stakeAddress: string | null): Promise<DraftData | null> {
  const season = await draftSeason();
  if (!season) return null;
  const [{ reference, scale }, dreps, counts, roster] = await Promise.all([
    draftScale(season),
    loadAll<{
      drep_id: string;
      is_registered: boolean | null;
      amount_lovelace: number | string | null;
      delegator_count: number | null;
      metadata: unknown;
      metadata_fetch_status: string | null;
    }>('dreps', 'drep_id, is_registered, amount_lovelace, delegator_count, metadata, metadata_fetch_status'),
    draftCounts(season.season_number),
    stakeAddress ? loadRoster(season.season_number, stakeAddress) : Promise.resolve(null),
  ]);
  const standings = new Map(reference.standings.map((s) => [s.drep_id, s]));

  const pool = dreps
    .filter((d) => d.is_registered !== false)
    .map((d) => {
      const profile = toDisplayProfile(d.metadata, d.metadata_fetch_status, d.drep_id);
      const size = { amount_lovelace: Number(d.amount_lovelace ?? 0), delegator_count: d.delegator_count ?? 0 };
      const s = standings.get(d.drep_id);
      return {
        drep_id: d.drep_id,
        name: profile.name,
        image: profile.image,
        ada: size.amount_lovelace / 1_000_000,
        delegators: size.delegator_count,
        underdog: scale(size),
        last_points: s ? s.points : null,
        last_votes: s ? s.votes_cast : 0,
        drafted_by: counts.get(d.drep_id) ?? 0,
        do_not_list: profile.doNotList,
      };
    })
    .sort((a, b) => (b.last_points ?? -1e9) - (a.last_points ?? -1e9) || b.ada - a.ada);

  return {
    season,
    reference_window: { start_epoch: reference.start_epoch, end_epoch: reference.end_epoch },
    pool,
    roster,
  };
}

export class DraftError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

/**
 * Saves a roster for the open draft season. DReps kept from the previous
 * save keep their slot and their original multiplier; new picks are
 * snapshotted now. One upsert, so the roster is never left half-written.
 */
export async function saveRoster(stakeAddress: string, input: { team_name: string | null; drep_ids: string[] }): Promise<Roster> {
  const season = await draftSeason();
  if (!season) throw new DraftError('Drafting opens when Season 1 is scheduled.', 409);
  if (Date.now() >= new Date(season.draft_locks_at).getTime()) {
    throw new DraftError('This season’s rosters are locked. Draft again when the next season opens.', 409);
  }
  const ids = Array.from(new Set(input.drep_ids));
  if (ids.length !== ROSTER_SIZE) throw new DraftError(`Pick exactly ${ROSTER_SIZE} different DReps.`, 400);

  const { data: dreps, error: drepError } = await supabaseAdmin
    .from('dreps')
    .select('drep_id, is_registered, amount_lovelace, delegator_count')
    .in('drep_id', ids);
  if (drepError) throw new Error(`Couldn't check your picks: ${drepError.message}`);
  const found = new Map((dreps ?? []).map((d) => [d.drep_id as string, d]));
  const invalid = ids.filter((id) => !found.has(id) || found.get(id)?.is_registered === false);
  if (invalid.length > 0) throw new DraftError(`Not a registered DRep: ${invalid.join(', ')}`, 400);

  await ensureSeasonRow(season);
  const { scale } = await draftScale(season);

  const { data: rosterRow, error: rosterError } = await supabaseAdmin
    .from('fantasy_rosters')
    .upsert(
      {
        season_number: season.season_number,
        stake_address: stakeAddress,
        team_name: input.team_name,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'season_number,stake_address' }
    )
    .select('roster_id')
    .single();
  if (rosterError || !rosterRow) throw new Error(`Couldn't save your team: ${rosterError?.message ?? 'no row returned'}`);
  const rosterId = rosterRow.roster_id as string;

  const existing = (await loadRoster(season.season_number, stakeAddress))?.picks ?? [];
  const kept = existing.filter((p) => ids.includes(p.drep_id));
  const keptIds = new Set(kept.map((p) => p.drep_id));
  const freeSlots = [1, 2, 3, 4, 5].filter((slot) => !kept.some((p) => p.slot === slot));
  const now = new Date().toISOString();
  const rows = [
    ...kept.map((p) => ({
      roster_id: rosterId,
      slot: p.slot,
      drep_id: p.drep_id,
      underdog_multiplier: p.underdog_multiplier,
      picked_at: p.picked_at,
    })),
    ...ids
      .filter((id) => !keptIds.has(id))
      .map((id, i) => {
        const d = found.get(id)!;
        return {
          roster_id: rosterId,
          slot: freeSlots[i],
          drep_id: id,
          underdog_multiplier: scale({ amount_lovelace: Number(d.amount_lovelace ?? 0), delegator_count: d.delegator_count ?? 0 }),
          picked_at: now,
        };
      }),
  ];
  const { error: picksError } = await supabaseAdmin.from('fantasy_roster_picks').upsert(rows, { onConflict: 'roster_id,slot' });
  if (picksError) throw new Error(`Couldn't save your picks: ${picksError.message}. Your previous roster is unchanged; try again.`);

  console.log(JSON.stringify({ event: 'roster_saved', season: season.season_number, stake_address: stakeAddress, kept: kept.length }));
  return (await loadRoster(season.season_number, stakeAddress))!;
}

