/**
 * Fantasy leaderboard: every team's score for a season.
 *
 * Team points = Σ (each picked DRep's season points × the underdog multiplier
 * locked in when it was picked). Season points are process-only (voting,
 * explaining, voting on time), so the leaderboard never rewards which way a
 * DRep voted (Cardinal Rule).
 */

import { supabaseAdmin } from '@/lib/sync/supabase-admin';
import { getSeasonData } from './data';
import { getCards } from '@/lib/cards/data';
import { draftSeason, type DraftSeason } from './fantasy';

export type SeasonStatus = 'upcoming' | 'live' | 'final';

export interface LeaderboardPick {
  drep_id: string;
  name: string | null;
  image: string | null;
  points: number;
  multiplier: number;
  contribution: number;
}

export interface LeaderboardTeam {
  rank: number;
  name: string;
  mine: boolean;
  points: number;
  picks: LeaderboardPick[];
}

export interface Leaderboard {
  season: Pick<DraftSeason, 'season_number' | 'start_epoch' | 'end_epoch' | 'starts_at' | 'draft_locks_at' | 'ends_at'> & { status: SeasonStatus };
  teams: LeaderboardTeam[];
  computed_at: string;
}

export interface RosterRow {
  stake_address: string;
  team_name: string | null;
  created_at: string;
  picks: Array<{ drep_id: string; underdog_multiplier: number }>;
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
  me: string | null
): LeaderboardTeam[] {
  const teams = rosters.map((r) => {
    const picks = r.picks.map((p) => {
      const pts = points.get(p.drep_id) ?? 0;
      const who = people.get(p.drep_id);
      return { drep_id: p.drep_id, name: who?.name ?? null, image: who?.image ?? null, points: pts, multiplier: p.underdog_multiplier, contribution: round1(pts * p.underdog_multiplier) };
    });
    return { row: r, picks, points: round1(picks.reduce((s, p) => s + p.contribution, 0)) };
  });
  // Ties: the team that drafted first ranks higher, then by name, so the order is stable.
  teams.sort((a, b) => b.points - a.points || a.row.created_at.localeCompare(b.row.created_at) || teamName(a.row).localeCompare(teamName(b.row)));
  let rank = 0;
  return teams.map((t, i) => {
    if (i === 0 || t.points !== teams[i - 1].points) rank = i + 1;
    return { rank, name: teamName(t.row), mine: me !== null && t.row.stake_address === me, points: t.points, picks: t.picks.sort((a, b) => b.contribution - a.contribution) };
  });
}

async function loadRosters(seasonNumber: number): Promise<RosterRow[]> {
  const { data, error } = await supabaseAdmin
    .from('fantasy_rosters')
    .select('stake_address, team_name, created_at, fantasy_roster_picks(drep_id, underdog_multiplier)')
    .eq('season_number', seasonNumber);
  if (error) throw new Error(`Couldn't load fantasy teams: ${error.message}`);
  return (data ?? []).map((r) => ({
    stake_address: r.stake_address as string,
    team_name: (r.team_name as string | null) ?? null,
    created_at: r.created_at as string,
    picks: (r.fantasy_roster_picks as Array<{ drep_id: string; underdog_multiplier: number | string }>).map((p) => ({
      drep_id: p.drep_id,
      underdog_multiplier: Number(p.underdog_multiplier),
    })),
  }));
}

/** The season to show: the one being played, else the last one played, else the next one. */
async function pickSeason(requested: number | null, now: Date): Promise<(DraftSeason & { status: SeasonStatus }) | null> {
  const { data, error } = await supabaseAdmin.from('seasons').select('*').order('season_number', { ascending: false });
  if (error) throw new Error(`Couldn't load seasons: ${error.message}`);
  const rows = (data ?? []) as DraftSeason[];
  // No team saved yet means no season row yet: fall back to the season open for drafting.
  if (rows.length === 0) {
    const next = await draftSeason(now);
    if (next) rows.push(next);
  }
  const status = (s: DraftSeason): SeasonStatus => (now < new Date(s.starts_at) ? 'upcoming' : now < new Date(s.ends_at) ? 'live' : 'final');
  const chosen =
    requested !== null
      ? rows.find((s) => s.season_number === requested)
      : rows.find((s) => status(s) === 'live') ?? rows.find((s) => status(s) === 'final') ?? rows[rows.length - 1];
  return chosen ? { ...chosen, status: status(chosen) } : null;
}

const TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { at: number; data: Omit<Leaderboard, 'teams'> & { rosters: RosterRow[]; points: Map<string, number>; people: Map<string, { name: string | null; image: string | null }> } }>();

export async function getLeaderboard(options: { season?: number | null; me?: string | null } = {}): Promise<Leaderboard | null> {
  const key = String(options.season ?? 'current');
  let entry = cache.get(key);
  if (!entry || Date.now() - entry.at > TTL_MS) {
    const season = await pickSeason(options.season ?? null, new Date());
    if (!season) return null;
    const [rosters, cards] = await Promise.all([loadRosters(season.season_number), getCards()]);
    const points = new Map<string, number>();
    if (season.status !== 'upcoming') {
      const data = await getSeasonData({ window: season.grid_window });
      for (const s of data.standings) points.set(s.drep_id, s.points);
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
    entry = { at: Date.now(), data: { season: shown, computed_at: new Date().toISOString(), rosters, points, people } };
    cache.set(key, entry);
  }
  const { rosters, points, people, ...meta } = entry.data;
  return { ...meta, teams: rankTeams(rosters, points, people, options.me ?? null) };
}
