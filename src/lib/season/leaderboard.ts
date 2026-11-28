/**
 * Fantasy leaderboard: every team's score for a season.
 *
 * Team points = Σ each picked DRep's season points. (Until 2026-11-27 gains
 * were multiplied by an underdog multiplier; it now lives only in the DRep
 * Match-maker, and multiplier fields here are always 1.) Season points are process-only (voting,
 * explaining, voting on time), so the leaderboard never rewards which way a
 * DRep voted (Cardinal Rule).
 */

import { supabaseAdmin } from '@/lib/sync/supabase-admin';
import { getSeasonData } from './data';
import { getCards } from '@/lib/cards/data';
import { draftSeason, type DraftSeason } from './fantasy';
import { pickContribution } from './points';
import { isMissingSchema } from './schema';

export type SeasonStatus = 'upcoming' | 'live' | 'final';

export interface LeaderboardPick {
  drep_id: string;
  name: string | null;
  image: string | null;
  points: number;
  multiplier: number;
  contribution: number;
  /** Set when this slot replaced a retired DRep mid-season. */
  swapped_from?: { drep_id: string; name: string | null; points: number; multiplier: number; swap_epoch: number };
}

export interface LeaderboardTeam {
  rank: number;
  name: string;
  /** Server-only: the team's stake address. Stripped by publicBoard() before any response. */
  owner?: string;
  /** Competing for prizes: delegated since before the lock (null before the check). */
  eligible: boolean | null;
  mine: boolean;
  points: number;
  picks: LeaderboardPick[];
}

export interface Leaderboard {
  season: Pick<DraftSeason, 'season_number' | 'start_epoch' | 'end_epoch' | 'starts_at' | 'draft_locks_at' | 'ends_at'> & { status: SeasonStatus };
  teams: LeaderboardTeam[];
  computed_at: string;
  scope: LeaderboardScope;
}

/** 'global' = teams in the global game; otherwise the members of one league. */
export type LeaderboardScope = { kind: 'global' } | { kind: 'league'; league_id: string; name: string };

export interface RosterPickRow {
  drep_id: string;
  underdog_multiplier: number;
  swapped_from?: string | null;
  swapped_from_multiplier?: number | null;
  swap_epoch?: number | null;
}

export interface RosterRow {
  stake_address: string;
  team_name: string | null;
  created_at: string;
  in_global?: boolean;
  /** Delegated since before the roster lock (null until checked after the lock). */
  eligible_at_lock?: boolean | null;
  /** Qualified for prizes at the season's end (null until the season is finalized). */
  prize_eligible?: boolean | null;
  picks: RosterPickRow[];
}

/** Points a DRep earned in epochs [from, to). */
function pointsBetween(byEpoch: Record<number, number> | undefined, from: number, to: number): number {
  let sum = 0;
  for (const [e, pts] of Object.entries(byEpoch ?? {})) {
    const epoch = Number(e);
    if (epoch >= from && epoch < to) sum += pts;
  }
  return sum;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Display name that never reveals the full stake address. */
export function teamName(row: Pick<RosterRow, 'team_name' | 'stake_address'>): string {
  return row.team_name?.trim() || `Team ${row.stake_address.slice(-6)}`;
}

/** Pure scoring, kept separate so it can be tested without a database. */
export function rankTeams(
  rosters: RosterRow[],
  points: Map<string, number>,
  people: Map<string, { name: string | null; image: string | null }>,
  me: string | null,
  byEpoch: Map<string, Record<number, number>> = new Map()
): LeaderboardTeam[] {
  const teams = rosters.map((r) => {
    const picks = r.picks.map((p): LeaderboardPick => {
      const who = people.get(p.drep_id);
      if (p.swapped_from && p.swap_epoch != null) {
        // The slot keeps the retired DRep's points from before the swap and the replacement's after it.
        const oldPts = pointsBetween(byEpoch.get(p.swapped_from), -Infinity, p.swap_epoch);
        const newPts = pointsBetween(byEpoch.get(p.drep_id), p.swap_epoch, Infinity);
        const oldMult = 1;
        return {
          drep_id: p.drep_id,
          name: who?.name ?? null,
          image: who?.image ?? null,
          points: newPts,
          multiplier: 1,
          contribution: round1(pickContribution(oldPts, oldMult) + pickContribution(newPts, 1)),
          swapped_from: { drep_id: p.swapped_from, name: people.get(p.swapped_from)?.name ?? null, points: oldPts, multiplier: oldMult, swap_epoch: p.swap_epoch },
        };
      }
      const pts = points.get(p.drep_id) ?? 0;
      return { drep_id: p.drep_id, name: who?.name ?? null, image: who?.image ?? null, points: pts, multiplier: 1, contribution: round1(pickContribution(pts, 1)) };
    });
    return { row: r, picks, points: round1(picks.reduce((s, p) => s + p.contribution, 0)) };
  });
  // Ties: the team that drafted first ranks higher, then by name, so the order is stable.
  teams.sort((a, b) => b.points - a.points || a.row.created_at.localeCompare(b.row.created_at) || teamName(a.row).localeCompare(teamName(b.row)));
  let rank = 0;
  return teams.map((t, i) => {
    if (i === 0 || t.points !== teams[i - 1].points) rank = i + 1;
    return { rank, name: teamName(t.row), owner: t.row.stake_address, eligible: t.row.prize_eligible ?? t.row.eligible_at_lock ?? null, mine: me !== null && t.row.stake_address === me, points: t.points, picks: t.picks.sort((a, b) => b.contribution - a.contribution) };
  });
}

const PICK_COLUMNS = 'drep_id, underdog_multiplier, swapped_from, swapped_from_multiplier, swap_epoch';

export async function loadRosters(seasonNumber: number): Promise<RosterRow[]> {
  // Newest schema first; older column sets keep the game running until migrations 014/016 are applied.
  const selects = [
    `stake_address, team_name, created_at, in_global, eligible_at_lock, prize_eligible, fantasy_roster_picks(${PICK_COLUMNS})`,
    `stake_address, team_name, created_at, in_global, fantasy_roster_picks(${PICK_COLUMNS})`,
    'stake_address, team_name, created_at, fantasy_roster_picks(drep_id, underdog_multiplier)',
  ];
  let data: unknown[] | null = null;
  let error: { code?: string; message: string } | null = null;
  for (const columns of selects) {
    const res = await supabaseAdmin.from('fantasy_rosters').select(columns).eq('season_number', seasonNumber);
    data = res.data;
    error = res.error;
    if (!isMissingSchema(error)) break;
  }
  if (error) throw new Error(`Couldn't load game teams: ${error.message}`);
  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    stake_address: r.stake_address as string,
    team_name: (r.team_name as string | null) ?? null,
    created_at: r.created_at as string,
    in_global: r.in_global === undefined ? true : Boolean(r.in_global),
    eligible_at_lock: (r.eligible_at_lock as boolean | null | undefined) ?? null,
    prize_eligible: (r.prize_eligible as boolean | null | undefined) ?? null,
    picks: (r.fantasy_roster_picks as Array<Record<string, unknown>>).map((p) => ({
      drep_id: p.drep_id as string,
      underdog_multiplier: Number(p.underdog_multiplier),
      swapped_from: (p.swapped_from as string | null | undefined) ?? null,
      swapped_from_multiplier: p.swapped_from_multiplier == null ? null : Number(p.swapped_from_multiplier),
      swap_epoch: p.swap_epoch == null ? null : Number(p.swap_epoch),
    })),
  }));
}

/** The season to show: the one being played, else the last one played, else the next one. */
async function pickSeason(requested: number | null, now: Date): Promise<(DraftSeason & { status: SeasonStatus }) | null> {
  const { data, error } = await supabaseAdmin.from('seasons').select('*').order('season_number', { ascending: false });
  if (error) throw new Error(`Couldn't load seasons: ${error.message}`);
  const rows = (data ?? []) as DraftSeason[];
  // The season open for drafting may not have a row yet (no team saved): include it.
  const next = await draftSeason(now);
  if (next && !rows.some((s) => s.season_number === next.season_number)) rows.push(next);
  const status = (s: DraftSeason): SeasonStatus => (now < new Date(s.starts_at) ? 'upcoming' : now < new Date(s.ends_at) ? 'live' : 'final');
  const upcoming = rows.filter((s) => status(s) === 'upcoming').sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const finals = rows.filter((s) => status(s) === 'final').sort((a, b) => b.ends_at.localeCompare(a.ends_at));
  // Show the season being played, else the next one to start, else the last one played.
  const chosen =
    requested !== null
      ? rows.find((s) => s.season_number === requested)
      : rows.find((s) => status(s) === 'live') ?? upcoming[0] ?? finals[0];
  return chosen ? { ...chosen, status: status(chosen) } : null;
}

const TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { at: number; data: Omit<Leaderboard, 'teams' | 'scope'> & { rosters: RosterRow[]; points: Map<string, number>; byEpoch: Map<string, Record<number, number>>; people: Map<string, { name: string | null; image: string | null }> } }>();

export async function getLeaderboard(
  options: { season?: number | null; me?: string | null; scope?: LeaderboardScope; members?: Set<string> } = {}
): Promise<Leaderboard | null> {
  const key = String(options.season ?? 'current');
  let entry = cache.get(key);
  if (!entry || Date.now() - entry.at > TTL_MS) {
    const season = await pickSeason(options.season ?? null, new Date());
    if (!season) return null;
    const [rosters, cards] = await Promise.all([loadRosters(season.season_number), getCards()]);
    const points = new Map<string, number>();
    const byEpoch = new Map<string, Record<number, number>>();
    if (season.status !== 'upcoming') {
      const data = await getSeasonData({ window: season.grid_window });
      for (const s of data.standings) {
        points.set(s.drep_id, s.points);
        byEpoch.set(s.drep_id, s.by_epoch);
      }
    }
    const people = new Map(cards.cards.map((c) => [c.drep_id, { name: c.name, image: c.image }]));
    const shown = {
      season_number: season.season_number,
      start_epoch: season.start_epoch,
      end_epoch: season.end_epoch,
      starts_at: season.starts_at,
      draft_locks_at: season.draft_locks_at,
      ends_at: season.ends_at,
      status: season.status,
    };
    entry = { at: Date.now(), data: { season: shown, computed_at: new Date().toISOString(), rosters, points, byEpoch, people } };
    cache.set(key, entry);
  }
  const { rosters, points, byEpoch, people, ...meta } = entry.data;
  const scope = options.scope ?? { kind: 'global' };
  const shownRosters =
    scope.kind === 'global' ? rosters.filter((r) => r.in_global !== false) : rosters.filter((r) => options.members?.has(r.stake_address));
  return { ...meta, scope, teams: rankTeams(shownRosters, points, people, options.me ?? null, byEpoch) };
}

/** The leaderboard as sent to browsers: never includes stake addresses. */
export function publicBoard(board: Leaderboard): Leaderboard {
  return {
    ...board,
    teams: board.teams.map((t) => {
      const copy = { ...t };
      delete copy.owner;
      return copy;
    }),
  };
}

/** Drop cached standings so a saved team or swap shows up right away. */
export function clearLeaderboardCache(): void {
  cache.clear();
}
