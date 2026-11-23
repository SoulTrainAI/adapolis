/**
 * Season-end snapshots (docs/GAME.md 2.2–2.4), run by the cron once a season
 * has ended. Records, once and publicly:
 *  - the top 10 DReps by season points (Champion Cards) with their card stats,
 *  - who may claim a copy: the DRep (5), each team that drafted them (1),
 *    each wallet delegating to them now (1, within 7 days),
 *  - the final global top 10 teams (places 1–3 win Season Trophies).
 * Idempotent: upserts, then marks the season finalized. Minting is separate
 * and not built yet.
 */

import { z } from 'zod';
import { supabaseAdmin } from '@/lib/sync/supabase-admin';
import { koiosFetch } from '@/lib/koios/client';
import { getCards } from '@/lib/cards/data';
import { getSeasonData } from './data';
import { getLeaderboard, loadRosters } from './leaderboard';
import { isMissingSchema, MIGRATION_HINT } from './schema';
import type { DraftSeason } from './fantasy';

const CHAMPIONS = 10;
const DREP_COPIES = 5;
const DELEGATOR_CLAIM_DAYS = 7;
const PAGE = 1000;
const MAX_PAGES = 100;
const CHUNK = 500;

export type Edition = 'gold' | 'silver' | 'bronze' | 'holo';

export function editionFor(rank: number): Edition {
  return rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : 'holo';
}

const DelegatorSchema = z.array(z.object({ stake_address: z.string() }));

async function delegatorsOf(drepId: string): Promise<string[]> {
  const out: string[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const raw = await koiosFetch<unknown>(`/drep_delegators?_drep_id=${drepId}&select=stake_address&offset=${page * PAGE}&limit=${PAGE}`, { method: 'GET' });
    const rows = DelegatorSchema.parse(raw);
    out.push(...rows.map((r) => r.stake_address).filter((a) => /^stake1u[02-9ac-hj-np-z]{52}$/.test(a)));
    if (rows.length < PAGE) break;
  }
  return out;
}

async function upsertChunks(table: string, rows: Array<Record<string, unknown>>, onConflict: string): Promise<void> {
  for (let i = 0; i < rows.length; i += CHUNK) {
    const { error } = await supabaseAdmin.from(table).upsert(rows.slice(i, i + CHUNK), { onConflict });
    if (error) throw new Error(`Couldn't write ${table}: ${error.message}`);
  }
}

async function finalizeSeason(season: DraftSeason): Promise<{ season: number; champions: number; claims: number; podium: number }> {
  const [data, cards, rosters] = await Promise.all([getSeasonData({ window: season.grid_window, force: true }), getCards({ force: true }), loadRosters(season.season_number)]);
  const cardById = new Map(cards.cards.map((c) => [c.drep_id, c]));
  const top = data.standings.filter((s) => s.points > 0).slice(0, CHAMPIONS);
  const closes = new Date(new Date(season.ends_at).getTime() + DELEGATOR_CLAIM_DAYS * 86_400_000).toISOString();

  const champions = top.map((s, i) => ({
    season_number: season.season_number,
    rank: i + 1,
    drep_id: s.drep_id,
    edition: editionFor(i + 1),
    season_points: s.points,
    card: cardById.get(s.drep_id) ?? { drep_id: s.drep_id, name: s.profile.name, season_points: s.points },
  }));

  const claims: Array<Record<string, unknown>> = [];
  for (const c of champions) {
    claims.push({ season_number: season.season_number, drep_id: c.drep_id, claimant: c.drep_id, claimant_type: 'drep', copies: DREP_COPIES });
    for (const r of rosters) {
      if (r.picks.some((p) => p.drep_id === c.drep_id || p.swapped_from === c.drep_id)) {
        claims.push({ season_number: season.season_number, drep_id: c.drep_id, claimant: r.stake_address, claimant_type: 'team', copies: 1 });
      }
    }
    for (const stake of await delegatorsOf(c.drep_id)) {
      claims.push({ season_number: season.season_number, drep_id: c.drep_id, claimant: stake, claimant_type: 'delegator', copies: 1, claim_closes_at: closes });
    }
  }

  const board = await getLeaderboard({ season: season.season_number, scope: { kind: 'global' } });
  const podium = (board?.teams ?? []).slice(0, 10).map((t, i) => {
    return {
      season_number: season.season_number,
      place: i + 1,
      stake_address: t.owner ?? '',
      team_name: t.name,
      points: t.points,
      picks: t.picks.map((p) => ({ drep_id: p.drep_id, name: p.name, points: p.points, multiplier: p.multiplier, contribution: p.contribution })),
    };
  });

  await upsertChunks('season_champions', champions, 'season_number,rank');
  await upsertChunks('season_claims', claims, 'season_number,drep_id,claimant,claimant_type');
  await upsertChunks('season_podium', podium.filter((p) => p.stake_address), 'season_number,place');
  const { error } = await supabaseAdmin.from('seasons').update({ finalized_at: new Date().toISOString() }).eq('season_number', season.season_number);
  if (error) throw new Error(`Snapshots saved but marking season ${season.season_number} final failed: ${error.message}`);
  return { season: season.season_number, champions: champions.length, claims: claims.length, podium: podium.length };
}

/** Finalizes every season that has ended and isn't finalized yet. */
export async function finalizeEndedSeasons(now = new Date()): Promise<Array<{ season: number; champions: number; claims: number; podium: number }>> {
  const { data, error } = await supabaseAdmin
    .from('seasons')
    .select('season_number, grid_window, start_epoch, end_epoch, starts_at, draft_locks_at, ends_at')
    .lte('ends_at', now.toISOString())
    .is('finalized_at', null)
    .order('season_number');
  if (error) throw new Error(`Couldn't find seasons to finalize: ${error.message}`);
  const done = [];
  for (const season of (data ?? []) as DraftSeason[]) {
    try {
      done.push(await finalizeSeason(season));
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if (isMissingSchema({ message })) throw new Error(`Season ${season.season_number} ended but can't be finalized yet. ${MIGRATION_HINT}`);
      throw e;
    }
  }
  return done;
}
