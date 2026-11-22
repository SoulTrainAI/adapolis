/**
 * Loads everything the trading cards need and caches it for 6 hours (the
 * cron refreshes it). Server-only.
 */

import { loadAll, proposalWindow } from '@/lib/scoring/govscore-v1';
import { blockTimeToEpoch, fetchDRepRegistrationPeriods } from '@/lib/koios/drep-registrations';
import { fetchCurrentEpoch } from '@/lib/koios';
import { toDisplayProfile } from '@/lib/metadata/profile-display';
import { supabaseAdmin } from '@/lib/sync/supabase-admin';
import { draftSeason } from '@/lib/season/fantasy';
import { computeCards, type CardComputation } from './compute';
import { tierFor, type CardDetail, type CardsPayload, type CardSummary } from './types';

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

interface Loaded extends CardComputation {
  computedAt: string;
  currentEpoch: number;
  profiles: Map<string, { bio: string | null; links: Array<{ label: string; url: string }> }>;
  tallies: Map<string, { yes: number; no: number; abstain: number }>;
}

async function ownership(): Promise<{ rosters: number; picks: Map<string, number> }> {
  const picks = new Map<string, number>();
  try {
    const season = await draftSeason();
    if (!season) return { rosters: 0, picks };
    const { count } = await supabaseAdmin
      .from('fantasy_rosters')
      .select('*', { count: 'exact', head: true })
      .eq('season_number', season.season_number);
    const { data } = await supabaseAdmin
      .from('fantasy_roster_picks')
      .select('drep_id, fantasy_rosters!inner(season_number)')
      .eq('fantasy_rosters.season_number', season.season_number);
    for (const row of data ?? []) picks.set(row.drep_id as string, (picks.get(row.drep_id as string) ?? 0) + 1);
    return { rosters: count ?? 0, picks };
  } catch {
    // Ownership is a nice-to-have; cards still render without it.
    return { rosters: 0, picks };
  }
}

async function load(): Promise<Loaded> {
  const [currentEpoch, dreps, proposalRows, voteRows, scoreRows, periods, own] = await Promise.all([
    fetchCurrentEpoch(),
    loadAll<{
      drep_id: string;
      is_registered: boolean | null;
      amount_lovelace: number | string | null;
      delegator_count: number | null;
      metadata: unknown;
      metadata_fetch_status: string | null;
    }>('dreps', 'drep_id, is_registered, amount_lovelace, delegator_count, metadata, metadata_fetch_status'),
    loadAll<{
      proposal_id: string;
      proposed_epoch: number;
      status: string;
      ratified_epoch: number | null;
      expired_epoch: number | null;
      voting_ends_epoch: number | null;
    }>('proposals', 'proposal_id, proposed_epoch, status, ratified_epoch, expired_epoch, voting_ends_epoch'),
    loadAll<{
      drep_id: string;
      proposal_id: string;
      vote: string;
      block_time: string;
      rationale_url: string | null;
      rationale_hash: string | null;
    }>('votes', 'drep_id, proposal_id, vote, block_time, rationale_url, rationale_hash'),
    loadAll<{
      drep_id: string;
      epoch: number;
      adjusted_govscore: number | null;
      participation_rate: number | null;
      votes_cast: number | null;
      votes_eligible: number | null;
      voting_streak_epochs: number | null;
    }>('drep_scores', 'drep_id, epoch, adjusted_govscore, participation_rate, votes_cast, votes_eligible, voting_streak_epochs'),
    fetchDRepRegistrationPeriods(),
    ownership(),
  ]);

  const latestEpoch = scoreRows.reduce((m, r) => Math.max(m, r.epoch), 0);
  const latest = new Map(
    scoreRows
      .filter((r) => r.epoch === latestEpoch)
      .map((r) => [
        r.drep_id,
        {
          govscore: r.adjusted_govscore === null ? null : Math.round(r.adjusted_govscore * 10) / 10,
          participation: r.participation_rate,
          votes_cast: r.votes_cast ?? 0,
          votes_eligible: r.votes_eligible ?? 0,
          streak: r.voting_streak_epochs ?? 0,
        },
      ])
  );

  const profiles = new Map<string, { bio: string | null; links: Array<{ label: string; url: string }> }>();
  const cardDreps = dreps.map((d) => {
    const profile = toDisplayProfile(d.metadata, d.metadata_fetch_status);
    profiles.set(d.drep_id, { bio: profile.bio, links: profile.links });
    return {
      drep_id: d.drep_id,
      registered: d.is_registered !== false,
      ada: Number(d.amount_lovelace ?? 0) / 1_000_000,
      delegators: d.delegator_count ?? 0,
      name: profile.name,
      image: profile.image,
      do_not_list: profile.doNotList,
    };
  });

  const tallies = new Map<string, { yes: number; no: number; abstain: number }>();
  for (const v of voteRows) {
    const t = tallies.get(v.drep_id) ?? { yes: 0, no: 0, abstain: 0 };
    const k = v.vote.toLowerCase() as keyof typeof t;
    if (k in t) t[k]++;
    tallies.set(v.drep_id, t);
  }

  const computed = computeCards({
    currentEpoch,
    dreps: cardDreps,
    proposals: proposalRows.map((p) => ({ ...proposalWindow(p), expiration: p.voting_ends_epoch })),
    votes: voteRows.map((v) => ({
      drep_id: v.drep_id,
      proposal_id: v.proposal_id,
      epoch: blockTimeToEpoch(Math.floor(new Date(v.block_time).getTime() / 1000)),
      rationale_url: v.rationale_url,
      rationale_hash: v.rationale_hash,
    })),
    periods,
    latest,
    ownership: own,
  });

  return { ...computed, computedAt: new Date().toISOString(), currentEpoch, profiles, tallies };
}

let cache: { data: Loaded; at: number } | null = null;
let inflight: Promise<Loaded> | null = null;

async function getLoaded(force = false): Promise<Loaded> {
  if (!force && cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.data;
  if (inflight) return inflight;
  inflight = load()
    .then((data) => {
      cache = { data, at: Date.now() };
      return data;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export async function getCards(options: { force?: boolean } = {}): Promise<CardsPayload> {
  const data = await getLoaded(options.force);
  return {
    computed_at: data.computedAt,
    current_epoch: data.currentEpoch,
    current_window: data.currentWindow,
    cards: Array.from(data.summaries.values()).filter((c) => c.registered),
  };
}

/** Attributes a minted card would carry: the same process stats, frozen at mint time. */
export function cardMetadata(s: CardSummary, seasonLabel: string): Record<string, string | number> {
  const meta: Record<string, string | number> = {
    name: `${s.name ?? s.drep_id.slice(0, 16)} · ADApolis ${seasonLabel}`,
    drep_id: s.drep_id,
    set: seasonLabel,
    rarity: tierFor(s.rank).label,
    card_number: s.rank ? `${s.rank}/${s.total}` : 'unranked',
    govscore: s.govscore ?? 0,
    season_points: s.season.points,
    lifetime_votes: s.lifetime.votes,
    lifetime_points: s.lifetime.points,
    seasons_played: s.lifetime.seasons,
    best_season_points: s.best_points,
    rationale_pct: s.lifetime.rationale_rate === null ? 0 : Math.round(s.lifetime.rationale_rate * 100),
    archetype: s.archetype?.label ?? 'None',
    abilities: s.abilities.map((a) => a.label).join(', ') || 'None',
    rookie: s.rookie ? 'Yes' : 'No',
  };
  return meta;
}

export async function getCardDetail(drepId: string): Promise<CardDetail | null> {
  const data = await getLoaded();
  const summary = data.summaries.get(drepId);
  if (!summary) return null;
  const profile = data.profiles.get(drepId) ?? { bio: null, links: [] };
  return {
    summary,
    seasons: data.lines.get(drepId) ?? [],
    bio: profile.bio,
    links: profile.links,
    votes: data.tallies.get(drepId) ?? { yes: 0, no: 0, abstain: 0 },
    metadata: cardMetadata(summary, summary.season.label),
  };
}
