/**
 * The Hall of Fame: the last finished season's top 10 DReps (with the card as
 * it looked at the final whistle) and the six trophy winners. DRep Trophies
 * are the season's top 3 DReps (ranks 1–3 of season_champions); Team Trophies
 * are the top 3 prize-eligible global teams (season_podium places 1–3).
 * Server-only; reads the public season-end snapshots.
 */

import { supabaseAdmin } from '@/lib/sync/supabase-admin';
import type { CardSummary } from '@/lib/cards/types';
import { isMissingSchema } from './schema';
import type { Edition } from './finalize';

export interface HallChampion {
  rank: number;
  drep_id: string;
  edition: Edition;
  season_points: number;
  card: CardSummary | null;
}

export interface HallTeam {
  place: number;
  team_name: string;
  points: number;
  picks: Array<{ drep_id: string; name: string | null; points: number }>;
}

export interface HallOfFame {
  season_number: number;
  champions: HallChampion[];
  teams: HallTeam[];
}

function isCard(v: unknown): v is CardSummary {
  return typeof v === 'object' && v !== null && 'drep_id' in v && 'govscore' in v;
}

export async function getHallOfFame(): Promise<HallOfFame | null> {
  const { data: latest, error } = await supabaseAdmin.from('season_champions').select('season_number').order('season_number', { ascending: false }).limit(1);
  if (error) {
    if (isMissingSchema(error)) return null;
    throw new Error(`Couldn't load the Hall of Fame: ${error.message}`);
  }
  if (!latest?.length) return null;
  const season = latest[0].season_number as number;
  const [{ data: champs, error: e1 }, { data: podium, error: e2 }] = await Promise.all([
    supabaseAdmin.from('season_champions').select('rank, drep_id, edition, season_points, card').eq('season_number', season).order('rank'),
    supabaseAdmin.from('season_podium').select('place, team_name, points, picks').eq('season_number', season).lte('place', 3).order('place'),
  ]);
  if (e1 || e2) throw new Error(`Couldn't load the Hall of Fame: ${(e1 ?? e2)?.message}`);
  return {
    season_number: season,
    champions: (champs ?? []).map((c) => ({
      rank: Number(c.rank),
      drep_id: c.drep_id as string,
      edition: c.edition as Edition,
      season_points: Number(c.season_points),
      card: isCard(c.card) ? c.card : null,
    })),
    // Team names only; the wallet behind a team is never published.
    teams: (podium ?? []).map((p) => ({
      place: Number(p.place),
      team_name: p.team_name as string,
      points: Number(p.points),
      picks: ((p.picks ?? []) as Array<{ drep_id: string; name: string | null; points: number }>).map((x) => ({ drep_id: x.drep_id, name: x.name, points: x.points })),
    })),
  };
}
