/**
 * Who holds each of a season's six trophies, with the climbs to draw.
 * A finished season uses its season-end snapshot (season_champions ranks 1–3,
 * season_podium places 1–3), so the art always matches the record. A season
 * still being played is shown as a preview from the live standings.
 * Server-only. Never exposes stake addresses.
 */

import { supabaseAdmin } from '@/lib/sync/supabase-admin';
import { getCards } from '@/lib/cards/data';
import { getSeasonData } from './data';
import { getLeaderboard, type LeaderboardTeam } from './leaderboard';
import { seasonLabel, type PointEvent } from './points';
import { isMissingSchema } from './schema';
import type { Climber } from './mountain';
import { medalFor, teamClimb, type Medal, type TrophyKind } from './trophy';
import type { DraftSeason } from './fantasy';

const FIELD = 10;
const TTL_MS = 10 * 60 * 1000;

export interface TrophyWinner {
  kind: TrophyKind;
  medal: Medal;
  place: number;
  /** The climber to light up in the art. */
  climber_id: string;
  name: string;
  image: string | null;
  points: number;
  drep_id?: string;
  /** Team trophies: the DReps the team drafted. */
  picks?: string[];
}

export interface SeasonTrophies {
  season_number: number;
  label: string;
  start_epoch: number;
  end_epoch: number;
  starts_at: number;
  ends_at: number;
  /** Art is drawn up to here. */
  until: number;
  /** True once the season-end snapshot exists; otherwise a preview. */
  final: boolean;
  drep_field: number;
  team_field: number;
  drep_climbers: Climber[];
  team_climbers: Climber[];
  winners: TrophyWinner[];
}

const toSec = (iso: string) => Math.floor(new Date(iso).getTime() / 1000);
const round1 = (n: number) => Math.round(n * 10) / 10;

async function seasonRow(n: number): Promise<DraftSeason | null> {
  const { data, error } = await supabaseAdmin
    .from('seasons')
    .select('season_number, grid_window, start_epoch, end_epoch, starts_at, draft_locks_at, ends_at')
    .eq('season_number', n)
    .maybeSingle();
  if (error) throw new Error(`Couldn't load season ${n}: ${error.message}`);
  return (data as DraftSeason | null) ?? null;
}

async function snapshot(n: number): Promise<{ dreps: string[]; teams: Array<{ stake_address: string; team_name: string }> } | null> {
  const [champs, podium] = await Promise.all([
    supabaseAdmin.from('season_champions').select('rank, drep_id').eq('season_number', n).lte('rank', 3).order('rank'),
    supabaseAdmin.from('season_podium').select('place, stake_address, team_name').eq('season_number', n).lte('place', 3).order('place'),
  ]);
  if (champs.error || podium.error) {
    const err = champs.error ?? podium.error;
    if (isMissingSchema(err)) return null;
    throw new Error(`Couldn't load season ${n}'s results: ${err?.message}`);
  }
  if (!champs.data?.length) return null;
  return {
    dreps: champs.data.map((c) => c.drep_id as string),
    teams: (podium.data ?? []).map((p) => ({ stake_address: p.stake_address as string, team_name: p.team_name as string })),
  };
}

async function compute(requested: number | null): Promise<SeasonTrophies | null> {
  const board = await getLeaderboard({ season: requested, scope: { kind: 'global' } });
  if (!board || board.season.status === 'upcoming') return null;
  const season = await seasonRow(board.season.season_number);
  if (!season) return null;

  const [data, cards, snap] = await Promise.all([getSeasonData({ window: season.grid_window }), getCards(), snapshot(season.season_number)]);
  const card = new Map(cards.cards.map((c) => [c.drep_id, c]));
  const now = Math.floor(Date.now() / 1000);
  const starts_at = toSec(season.starts_at);
  const ends_at = toSec(season.ends_at);
  const until = Math.min(now, ends_at);
  // Points dated after "now" (the running epoch's streak) are already in the totals: show them as of now.
  const asOf = (events: PointEvent[]) => events.map((e) => (e.t > until ? { ...e, t: until } : e));
  const eventsByDrep = new Map(data.standings.map((s) => [s.drep_id, asOf(s.events)]));
  const name = (id: string) => card.get(id)?.name ?? data.standings.find((s) => s.drep_id === id)?.profile.name ?? `${id.slice(0, 12)}…`;

  // DReps: the field is the season's top 10; the winners come from the snapshot when there is one.
  const drepWinners = snap?.dreps ?? data.standings.filter((s) => s.points > 0).slice(0, 3).map((s) => s.drep_id);
  const drepIds = Array.from(new Set([...data.standings.slice(0, FIELD).map((s) => s.drep_id), ...drepWinners]));
  const drep_climbers = drepIds.map((id) => ({ drep_id: id, events: eventsByDrep.get(id) ?? [] }));

  // Teams: prize-eligible global teams; the snapshot decides the podium once the season is final.
  const eligible = board.teams.filter((t) => t.eligible !== false);
  const podium: LeaderboardTeam[] = snap
    ? snap.teams.map((p) => board.teams.find((t) => t.owner === p.stake_address) ?? board.teams.find((t) => t.name === p.team_name)).filter((t): t is LeaderboardTeam => !!t)
    : eligible.slice(0, 3);
  const field = Array.from(new Set([...eligible.slice(0, FIELD), ...podium]));
  const teamKey = new Map(field.map((t, i) => [t, `team:${i}`]));
  const team_climbers = field.map((t) => ({
    drep_id: teamKey.get(t)!,
    events: teamClimb(
      t.picks.map((p) => ({
        drep_id: p.drep_id,
        multiplier: p.multiplier,
        swapped_from: p.swapped_from?.drep_id ?? null,
        swapped_from_multiplier: p.swapped_from?.multiplier ?? null,
        swap_epoch: p.swapped_from?.swap_epoch ?? null,
      })),
      eventsByDrep
    ),
  }));

  const winners: TrophyWinner[] = [];
  drepWinners.forEach((id, i) => {
    const medal = medalFor(i + 1);
    if (!medal) return;
    const s = data.standings.find((x) => x.drep_id === id);
    winners.push({ kind: 'drep', medal, place: i + 1, climber_id: id, name: name(id), image: card.get(id)?.image ?? null, points: s?.points ?? 0, drep_id: id });
  });
  podium.forEach((t, i) => {
    const medal = medalFor(i + 1);
    if (!medal) return;
    winners.push({ kind: 'team', medal, place: i + 1, climber_id: teamKey.get(t)!, name: t.name, image: null, points: round1(t.points), picks: t.picks.map((p) => name(p.drep_id)) });
  });

  return {
    season_number: season.season_number,
    label: seasonLabel(season.season_number),
    start_epoch: season.start_epoch,
    end_epoch: season.end_epoch,
    starts_at,
    ends_at,
    until,
    final: snap !== null,
    drep_field: data.standings.length,
    team_field: eligible.length,
    drep_climbers,
    team_climbers,
    winners,
  };
}

const cache = new Map<string, { at: number; data: SeasonTrophies | null }>();

/** A season's trophies; `null` season = the one being played (or the last one finished). */
export async function getSeasonTrophies(season: number | null = null): Promise<SeasonTrophies | null> {
  const key = String(season ?? 'current');
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data;
  const data = await compute(season);
  cache.set(key, { at: Date.now(), data });
  return data;
}
