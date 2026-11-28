/**
 * Season-end snapshots (docs/GAME.md 2.2–2.4), run by the cron once a season
 * has ended. Records, once and publicly:
 *  - the top 10 DReps by season points (DRep All-Stars) with their card stats,
 *  - a basic Season Card for every other DRep who voted that season,
 *  - which global teams qualify for prizes (delegated since before the lock
 *    and still delegating 100+ ADA at the end; docs/GAME.md),
 *  - who may claim a copy (claims.ts): the DRep (5), each of the top 25
 *    qualifying teams (1 per pick) and the ADApolis house set (1 of every
 *    card), all within one mint window (opens 48 h after the season ends,
 *    closes 3 epochs after it ends),
 *  - the final top 10 qualifying teams (places 1–3 win Team Trophies; the
 *    top 3 DReps win DRep Trophies).
 * Idempotent: upserts, then marks the season finalized. Minting is separate
 * and not built yet.
 */

import { supabaseAdmin } from '@/lib/sync/supabase-admin';
import { delegationOf, eligibleAtEnd, eligibleAtLock } from './eligibility';
import { getCards } from '@/lib/cards/data';
import { getSeasonData } from './data';
import { getLeaderboard, loadRosters } from './leaderboard';
import { isMissingSchema, MIGRATION_HINT } from './schema';
import type { DraftSeason } from './fantasy';
import { mintWindow } from './mint-window';
import { ALL_STARS, buildSeasonClaims } from './claims';

const CHUNK = 500;

export type Edition = 'gold' | 'silver' | 'bronze' | 'holo';

export function editionFor(rank: number): Edition {
  return rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : 'holo';
}

async function upsertChunks(table: string, rows: object[], onConflict: string): Promise<void> {
  for (let i = 0; i < rows.length; i += CHUNK) {
    const { error } = await supabaseAdmin.from(table).upsert(rows.slice(i, i + CHUNK), { onConflict });
    if (error) throw new Error(`Couldn't write ${table}: ${error.message}`);
  }
}

async function finalizeSeason(season: DraftSeason): Promise<{ season: number; champions: number; claims: number; podium: number }> {
  const [data, cards, rosters] = await Promise.all([getSeasonData({ window: season.grid_window, force: true }), getCards({ force: true }), loadRosters(season.season_number)]);
  const cardById = new Map(cards.cards.map((c) => [c.drep_id, c]));
  const top = data.standings.filter((s) => s.points > 0).slice(0, ALL_STARS);
  const allStars = new Set(top.map((s) => s.drep_id));
  // One hard deadline for every claim, DReps included: 3 epochs after the season ends.
  const closes = mintWindow(new Date(season.ends_at)).closes.toISOString();

  const champions = top.map((s, i) => ({
    season_number: season.season_number,
    rank: i + 1,
    drep_id: s.drep_id,
    edition: editionFor(i + 1),
    season_points: s.points,
    card: cardById.get(s.drep_id) ?? { drep_id: s.drep_id, name: s.profile.name, season_points: s.points },
  }));

  // Every DRep who voted this season gets a card: All-Star for the top 10, basic Season Card for the rest.
  const seasonCards = data.standings.map((s) => ({
    season_number: season.season_number,
    drep_id: s.drep_id,
    season_rank: s.rank,
    season_points: s.points,
    all_star: allStars.has(s.drep_id),
    card: cardById.get(s.drep_id) ?? { drep_id: s.drep_id, name: s.profile.name, season_points: s.points },
  }));

  // Prize eligibility for global teams: delegated since before the lock, 100+ ADA in the final snapshot.
  const prizeEligible = new Set<string>();
  for (const r of rosters) {
    if (r.in_global === false || r.eligible_at_lock === false) continue;
    const d = await delegationOf(r.stake_address);
    const ok = (r.eligible_at_lock ?? eligibleAtLock(d, season.start_epoch)) && eligibleAtEnd(d);
    if (ok) prizeEligible.add(r.stake_address);
    await supabaseAdmin.from('fantasy_rosters').update({ prize_eligible: ok }).eq('season_number', season.season_number).eq('stake_address', r.stake_address);
  }

  const board = await getLeaderboard({ season: season.season_number, scope: { kind: 'global' } });
  const qualified = (board?.teams ?? []).filter((t) => t.owner && prizeEligible.has(t.owner));
  const claims = buildSeasonClaims({
    season_number: season.season_number,
    closes,
    played: seasonCards.map((c) => c.drep_id),
    prizeTeams: qualified.flatMap((t) => {
      const row = rosters.find((r) => r.stake_address === t.owner);
      return row ? [{ stake_address: row.stake_address, picks: row.picks }] : [];
    }),
  });

  const podium = qualified.slice(0, 10).map((t, i) => ({
    season_number: season.season_number,
    place: i + 1,
    stake_address: t.owner ?? '',
    team_name: t.name,
    points: t.points,
    picks: t.picks.map((p) => ({ drep_id: p.drep_id, name: p.name, points: p.points, multiplier: p.multiplier, contribution: p.contribution })),
  }));

  await upsertChunks('season_champions', champions, 'season_number,rank');
  await upsertChunks('season_cards', seasonCards, 'season_number,drep_id');
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
      if (isMissingSchema({ message })) throw new Error(`Season ${season.season_number} ended but can't be finalized yet. ${MIGRATION_HINT} Also run 026_season_cards.sql (Season Cards and the house set).`);
      throw e;
    }
  }
  return done;
}
