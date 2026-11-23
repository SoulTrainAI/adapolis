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
import { clearLeaderboardCache } from './leaderboard';
import { isMissingSchema } from './schema';
import { epochStart, seasonOneStartEpoch, underdogScale, windowEpochs, windowForEpoch } from './points';

export { epochStart };

export const ROSTER_SIZE = 5;
const DRAFT_LOCK_MS = 24 * 60 * 60 * 1000;

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
  // Season 0 is the Preseason: playable before Season 1, never minted.
  let n = Math.max(0, currentWindow - launchWindow + 1);
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
  swapped_from: string | null;
  swap_epoch: number | null;
}

export interface Roster {
  roster_id: string;
  team_name: string | null;
  /** Competes in the global game (Season Trophies). */
  in_global: boolean;
  /** The one free replacement for a retired DRep has been used. */
  swap_used: boolean;
  picks: RosterPick[];
}

export interface DraftData {
  season: DraftSeason & { reference_window: number };
  reference_window: { start_epoch: number; end_epoch: number };
  pool: PoolDRep[];
  roster: Roster | null;
}

async function loadRoster(seasonNumber: number, stakeAddress: string): Promise<Roster | null> {
  const full = await supabaseAdmin
    .from('fantasy_rosters')
    .select('roster_id, team_name, in_global, swap_used, fantasy_roster_picks(slot, drep_id, underdog_multiplier, picked_at, swapped_from, swap_epoch)')
    .eq('season_number', seasonNumber)
    .eq('stake_address', stakeAddress)
    .maybeSingle();
  let data: Record<string, unknown> | null = full.data;
  let error = full.error;
  if (isMissingSchema(error)) {
    const legacy = await supabaseAdmin
      .from('fantasy_rosters')
      .select('roster_id, team_name, fantasy_roster_picks(slot, drep_id, underdog_multiplier, picked_at)')
      .eq('season_number', seasonNumber)
      .eq('stake_address', stakeAddress)
      .maybeSingle();
    data = legacy.data;
    error = legacy.error;
  }
  if (error) throw new Error(`Couldn't load your roster: ${error.message}`);
  if (!data) return null;
  const picks = (data.fantasy_roster_picks as Array<Record<string, unknown>>)
    .map((p) => ({
      slot: Number(p.slot),
      drep_id: p.drep_id as string,
      underdog_multiplier: Number(p.underdog_multiplier),
      picked_at: p.picked_at as string,
      swapped_from: (p.swapped_from as string | null | undefined) ?? null,
      swap_epoch: p.swap_epoch == null ? null : Number(p.swap_epoch),
    }))
    .sort((a, b) => a.slot - b.slot);
  return {
    roster_id: data.roster_id as string,
    team_name: (data.team_name as string | null) ?? null,
    in_global: data.in_global === undefined ? true : Boolean(data.in_global),
    swap_used: Boolean(data.swap_used),
    picks,
  };
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
export async function saveRoster(stakeAddress: string, input: { team_name: string | null; drep_ids: string[]; in_global?: boolean }): Promise<Roster> {
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
  if (input.in_global !== undefined) {
    const { error: globalError } = await supabaseAdmin.from('fantasy_rosters').update({ in_global: input.in_global }).eq('roster_id', rosterId);
    if (globalError && !isMissingSchema(globalError)) throw new Error(`Couldn't save your global-game choice: ${globalError.message}`);
  }

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
  clearLeaderboardCache();
  return (await loadRoster(season.season_number, stakeAddress))!;
}

/** The season being played right now (rosters locked), if any. */
export async function liveSeason(now = new Date()): Promise<DraftSeason | null> {
  const { data, error } = await supabaseAdmin
    .from('seasons')
    .select('season_number, grid_window, start_epoch, end_epoch, starts_at, draft_locks_at, ends_at')
    .lte('draft_locks_at', now.toISOString())
    .gt('ends_at', now.toISOString())
    .maybeSingle();
  if (error) throw new Error(`Couldn't load the live season: ${error.message}`);
  return (data as DraftSeason | null) ?? null;
}

export interface SwapState {
  season: DraftSeason;
  roster: Roster;
  /** Slots whose DRep has deregistered (eligible for the swap). */
  retired_slots: number[];
}

/** The signed-in player's live team and which picks have retired. */
export async function getSwapState(stakeAddress: string): Promise<SwapState | null> {
  const season = await liveSeason();
  if (!season) return null;
  const roster = await loadRoster(season.season_number, stakeAddress);
  if (!roster) return null;
  const { data, error } = await supabaseAdmin
    .from('dreps')
    .select('drep_id, is_registered')
    .in('drep_id', roster.picks.map((p) => p.drep_id));
  if (error) throw new Error(`Couldn't check your DReps: ${error.message}`);
  const retired = new Set((data ?? []).filter((d) => d.is_registered === false).map((d) => d.drep_id as string));
  return { season, roster, retired_slots: roster.picks.filter((p) => retired.has(p.drep_id)).map((p) => p.slot) };
}

/**
 * Replaces a retired DRep, once per team per season. The slot keeps the
 * retired DRep's points from before this epoch; the replacement scores from
 * this epoch on, at their multiplier now.
 */
export async function swapRetired(stakeAddress: string, slot: number, newDrepId: string): Promise<Roster> {
  const state = await getSwapState(stakeAddress);
  if (!state) throw new DraftError('Swaps are only possible while a season is being played and you have a team in it.', 409);
  const { season, roster } = state;
  if (roster.swap_used) throw new DraftError('You have already used your one replacement this season.', 409);
  if (!state.retired_slots.includes(slot)) throw new DraftError('Only a DRep who has retired (deregistered) can be replaced.', 400);
  if (roster.picks.some((p) => p.drep_id === newDrepId)) throw new DraftError('That DRep is already on your team.', 400);

  const { data: d, error: drepError } = await supabaseAdmin
    .from('dreps')
    .select('drep_id, is_registered, amount_lovelace, delegator_count')
    .eq('drep_id', newDrepId)
    .maybeSingle();
  if (drepError) throw new Error(`Couldn't check the replacement: ${drepError.message}`);
  if (!d || d.is_registered === false) throw new DraftError('The replacement must be a registered DRep.', 400);

  const old = roster.picks.find((p) => p.slot === slot)!;
  const { scale } = await draftScale({ reference_window: season.grid_window - 1 });
  const epoch = await fetchCurrentEpoch();
  const { error: pickError } = await supabaseAdmin
    .from('fantasy_roster_picks')
    .update({
      drep_id: newDrepId,
      underdog_multiplier: scale({ amount_lovelace: Number(d.amount_lovelace ?? 0), delegator_count: d.delegator_count ?? 0 }),
      picked_at: new Date().toISOString(),
      swapped_from: old.drep_id,
      swapped_from_multiplier: old.underdog_multiplier,
      swap_epoch: epoch,
    })
    .eq('roster_id', roster.roster_id)
    .eq('slot', slot);
  if (pickError) {
    if (isMissingSchema(pickError)) throw new DraftError('Replacements open once the site’s database update (migration 014) is applied.', 503);
    throw new Error(`Couldn't save the replacement: ${pickError.message}. Your team is unchanged.`);
  }
  const { error: usedError } = await supabaseAdmin.from('fantasy_rosters').update({ swap_used: true }).eq('roster_id', roster.roster_id);
  if (usedError) throw new Error(`Replacement saved, but marking it used failed: ${usedError.message}`);
  console.log(JSON.stringify({ event: 'roster_swap', season: season.season_number, stake_address: stakeAddress, slot, from: old.drep_id, to: newDrepId, epoch }));
  clearLeaderboardCache();
  return (await loadRoster(season.season_number, stakeAddress))!;
}

