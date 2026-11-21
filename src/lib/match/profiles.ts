/**
 * Builds the data the Find My DRep quiz matches against: each eligible DRep's
 * position on every measurable topic, plus a few recent, contested proposals
 * for the "real vote" questions. Everything is derived from on-chain data by
 * fixed rules (no AI), and is recomputed after each 6-hour sync.
 */

import { z } from 'zod';
import { koiosFetch } from '@/lib/koios/client';
import { supabaseAdmin } from '@/lib/sync/supabase-admin';
import { toDisplayProfile } from '@/lib/metadata/profile-display';
import { TOPICS, MATCH_RULES, type Topic } from './topics';

const DB_PAGE_SIZE = 1000;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

export interface TopicPosition {
  /** Position in [0, 1] on the topic's agree scale (percentile or shrunk rate) */
  value: number;
  /** Observed rate before shrinkage, for explanations */
  rate: number;
  /** Number of votes behind the position */
  n: number;
}

export interface MatchDRep {
  drep_id: string;
  name: string | null;
  image: string | null;
  ada: number;
  participation: number;
  votes_cast: number;
  positions: Record<string, TopicPosition>;
  /** proposal_id -> 'yes' | 'no' | 'abstain' for the real-vote questions */
  real_votes: Record<string, 'yes' | 'no' | 'abstain'>;
}

export interface RealVoteQuestion {
  proposal_id: string;
  title: string;
  summary: string;
  action_type: string;
  proposed_epoch: number;
  yes: number;
  no: number;
}

export interface MatchData {
  computed_at: string;
  epoch: number;
  eligible_count: number;
  dreps: MatchDRep[];
  real_votes: RealVoteQuestion[];
}

export type Vote = { drep_id: string; proposal_id: string; vote: 'yes' | 'no' | 'abstain'; rationale_url: string | null };
export type Proposal = { proposal_id: string; action_type: string; proposed_epoch: number; title: string | null; abstract: string | null };

async function loadAll<T>(table: string, columns: string, orderBy: string): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += DB_PAGE_SIZE) {
    const { data, error } = await supabaseAdmin
      .from(table)
      .select(columns)
      .order(orderBy)
      .range(from, from + DB_PAGE_SIZE - 1);
    if (error) throw new Error(`Failed to read ${table} for matching: ${error.message}. Check table grants (migration 006).`);
    rows.push(...((data ?? []) as T[]));
    if (!data || data.length < DB_PAGE_SIZE) return rows;
  }
}

const ParamProposalSchema = z.object({
  proposal_id: z.string(),
  proposed_epoch: z.number().int(),
  proposal_description: z.unknown(),
});

/**
 * For each parameter-change proposal, whether passing it would move each
 * 'params' topic toward agreement (+1), away from it (-1), or neither.
 * Direction comes from comparing the proposed values with the values in force
 * when it was proposed.
 */
export async function paramDirections(): Promise<Map<string, Record<string, 1 | -1>>> {
  const raw = await koiosFetch<unknown>(
    '/proposal_list?proposal_type=eq.ParameterChange&select=proposal_id,proposed_epoch,proposal_description',
    { method: 'GET' }
  );
  const proposals = z.array(ParamProposalSchema).parse(raw);
  const paramTopics = TOPICS.filter((t) => t.source === 'params');
  const result = new Map<string, Record<string, 1 | -1>>();
  const epochCache = new Map<number, Record<string, unknown>>();

  for (const p of proposals) {
    const contents = (p.proposal_description as { contents?: unknown[] } | null)?.contents ?? [];
    const changes = contents.find(
      (c): c is Record<string, unknown> => typeof c === 'object' && c !== null && !('txId' in c)
    );
    if (!changes) continue;

    const relevant = paramTopics.some((t) => t.paramRules?.some((r) => r.param in changes));
    if (!relevant) continue;

    if (!epochCache.has(p.proposed_epoch)) {
      const params = await koiosFetch<Array<Record<string, unknown>>>(`/epoch_params?_epoch_no=${p.proposed_epoch}`, { method: 'GET' });
      epochCache.set(p.proposed_epoch, params[0] ?? {});
    }
    const before = epochCache.get(p.proposed_epoch) ?? {};

    const directions: Record<string, 1 | -1> = {};
    for (const topic of paramTopics) {
      let sum = 0;
      for (const rule of topic.paramRules ?? []) {
        if (!(rule.param in changes)) continue;
        const next = Number(changes[rule.param]);
        const prev = Number(before[rule.epochParam]);
        if (!Number.isFinite(next) || !Number.isFinite(prev) || next === prev) continue;
        const increased = next > prev;
        sum += (rule.agreeWhen === 'increase') === increased ? 1 : -1;
      }
      // Mixed changes (one setting each way) are ambiguous, so they don't count.
      if (sum !== 0) directions[topic.id] = sum > 0 ? 1 : -1;
    }
    if (Object.keys(directions).length > 0) result.set(p.proposal_id, directions);
  }
  return result;
}

function percentileRanks(values: Map<string, number>): Map<string, number> {
  const sorted = Array.from(values.entries()).sort((a, b) => a[1] - b[1]);
  const ranks = new Map<string, number>();
  const last = Math.max(1, sorted.length - 1);
  sorted.forEach(([id, v], i) => {
    // Ties share the average rank of their group so identical records match identically.
    let lo = i;
    while (lo > 0 && sorted[lo - 1][1] === v) lo--;
    let hi = i;
    while (hi < sorted.length - 1 && sorted[hi + 1][1] === v) hi++;
    ranks.set(id, (lo + hi) / 2 / last);
  });
  return ranks;
}

export interface MatchInputs {
  dreps: Array<{ drep_id: string; amount_lovelace: number | string | null; is_registered: boolean; metadata: unknown; metadata_fetch_status: string | null }>;
  scores: Array<{ drep_id: string; epoch: number; participation_rate: number | null; votes_cast: number | null }>;
  votes: Vote[];
  proposals: Proposal[];
  directions: Map<string, Record<string, 1 | -1>>;
}

async function computeMatchData(): Promise<MatchData> {
  const [dreps, scores, votes, proposals, directions] = await Promise.all([
    loadAll<{ drep_id: string; amount_lovelace: number | string | null; is_registered: boolean; metadata: unknown; metadata_fetch_status: string | null }>(
      'dreps', 'drep_id, amount_lovelace, is_registered, metadata, metadata_fetch_status', 'drep_id'
    ),
    loadAll<{ drep_id: string; epoch: number; participation_rate: number | null; votes_cast: number | null }>(
      'drep_scores', 'drep_id, epoch, participation_rate, votes_cast', 'drep_id'
    ),
    loadAll<Vote>('votes', 'drep_id, proposal_id, vote, rationale_url', 'vote_id'),
    loadAll<Proposal>('proposals', 'proposal_id, action_type, proposed_epoch, title, abstract', 'proposal_id'),
    paramDirections(),
  ]);
  return buildMatchData({ dreps, scores, votes, proposals, directions });
}

/** Pure: turns loaded records into match data. Separated from I/O for testing. */
export function buildMatchData({ dreps, scores, votes, proposals, directions }: MatchInputs): MatchData {
  const epoch = scores.reduce((max, s) => Math.max(max, s.epoch), 0);
  const latestScore = new Map(scores.filter((s) => s.epoch === epoch).map((s) => [s.drep_id, s]));
  const proposalById = new Map(proposals.map((p) => [p.proposal_id, p]));

  const eligible = dreps.filter((d) => {
    const s = latestScore.get(d.drep_id);
    const profile = toDisplayProfile(d.metadata, d.metadata_fetch_status);
    return (
      d.is_registered &&
      !profile.doNotList &&
      (s?.votes_cast ?? 0) >= MATCH_RULES.minVotesCast &&
      (s?.participation_rate ?? 0) >= MATCH_RULES.minParticipation
    );
  });
  const eligibleIds = new Set(eligible.map((d) => d.drep_id));

  const votesByDRep = new Map<string, Vote[]>();
  for (const v of votes) {
    if (!eligibleIds.has(v.drep_id)) continue;
    const list = votesByDRep.get(v.drep_id) ?? [];
    list.push(v);
    votesByDRep.set(v.drep_id, list);
  }

  // Observed agreement per topic: average of per-vote scores in [0, 1].
  const observed = new Map<string, Map<string, { sum: number; n: number }>>();
  const record = (topicId: string, drepId: string, value: number) => {
    const byDRep = observed.get(topicId) ?? new Map<string, { sum: number; n: number }>();
    const cur = byDRep.get(drepId) ?? { sum: 0, n: 0 };
    byDRep.set(drepId, { sum: cur.sum + value, n: cur.n + 1 });
    observed.set(topicId, byDRep);
  };
  const voteValue = (vote: Vote['vote'], yesAgrees: boolean) =>
    vote === 'abstain' ? 0.5 : (vote === 'yes') === yesAgrees ? 1 : 0;

  for (const [drepId, list] of Array.from(votesByDRep.entries())) {
    for (const v of list) {
      const proposal = proposalById.get(v.proposal_id);
      if (!proposal) continue;
      for (const topic of TOPICS) {
        if (topic.source === 'votes' && topic.actionTypes && proposal.action_type in topic.actionTypes) {
          record(topic.id, drepId, voteValue(v.vote, topic.actionTypes[proposal.action_type] === 1));
        }
        if (topic.source === 'params') {
          const dir = directions.get(v.proposal_id)?.[topic.id];
          if (dir) record(topic.id, drepId, voteValue(v.vote, dir === 1));
        }
      }
      record('transparency', drepId, v.rationale_url ? 1 : 0);
    }
  }

  const k = MATCH_RULES.shrinkagePriorVotes;
  const positions = new Map<string, Record<string, TopicPosition>>();
  for (const d of eligible) positions.set(d.drep_id, {});

  for (const topic of TOPICS) {
    if (topic.source === 'stated') continue;

    const shrunk = new Map<string, number>();
    const meta = new Map<string, { rate: number; n: number }>();

    if (topic.source === 'stake') {
      for (const d of eligible) {
        shrunk.set(d.drep_id, Number(d.amount_lovelace ?? 0));
        meta.set(d.drep_id, { rate: Number(d.amount_lovelace ?? 0) / 1_000_000, n: 1 });
      }
    } else {
      const byDRep = observed.get(topic.id) ?? new Map<string, { sum: number; n: number }>();
      const totals = Array.from(byDRep.values()).reduce((a, o) => ({ sum: a.sum + o.sum, n: a.n + o.n }), { sum: 0, n: 0 });
      // Thin records are pulled toward the average DRep, not toward an extreme.
      const prior = totals.n > 0 ? totals.sum / totals.n : 0.5;
      for (const d of eligible) {
        const o = byDRep.get(d.drep_id) ?? { sum: 0, n: 0 };
        shrunk.set(d.drep_id, (o.sum + prior * k) / (o.n + k));
        meta.set(d.drep_id, { rate: o.n > 0 ? o.sum / o.n : prior, n: o.n });
      }
    }

    const finalValues = topic.scale === 'percentile' ? percentileRanks(shrunk) : shrunk;
    for (const d of eligible) {
      let value = finalValues.get(d.drep_id) ?? 0.5;
      // "Smaller DRep" agreement is the inverse of delegated-stake percentile.
      if (topic.source === 'stake') value = 1 - value;
      const m = meta.get(d.drep_id) ?? { rate: 0.5, n: 0 };
      positions.get(d.drep_id)![topic.id] = { value, rate: m.rate, n: m.n };
    }
  }

  const realVotes = pickRealVotes(proposals, votes, eligibleIds, epoch);
  const realIds = new Set(realVotes.map((r) => r.proposal_id));

  return {
    computed_at: new Date().toISOString(),
    epoch,
    eligible_count: eligible.length,
    real_votes: realVotes,
    dreps: eligible.map((d) => {
      const profile = toDisplayProfile(d.metadata, d.metadata_fetch_status);
      const s = latestScore.get(d.drep_id);
      const real: MatchDRep['real_votes'] = {};
      for (const v of votesByDRep.get(d.drep_id) ?? []) if (realIds.has(v.proposal_id)) real[v.proposal_id] = v.vote;
      return {
        drep_id: d.drep_id,
        name: profile.name,
        image: profile.image,
        ada: Number(d.amount_lovelace ?? 0) / 1_000_000,
        participation: s?.participation_rate ?? 0,
        votes_cast: s?.votes_cast ?? 0,
        positions: positions.get(d.drep_id) ?? {},
        real_votes: real,
      };
    }),
  };
}

/**
 * Picks recent proposals where eligible DReps split most evenly, so each
 * question actually distinguishes between DReps. Only proposals with their
 * own title and summary are used, since that text is shown to the user.
 */
function pickRealVotes(proposals: Proposal[], votes: Vote[], eligibleIds: Set<string>, epoch: number): RealVoteQuestion[] {
  const tally = new Map<string, { yes: number; no: number }>();
  for (const v of votes) {
    if (!eligibleIds.has(v.drep_id) || v.vote === 'abstain') continue;
    const t = tally.get(v.proposal_id) ?? { yes: 0, no: 0 };
    t[v.vote]++;
    tally.set(v.proposal_id, t);
  }

  return proposals
    .filter(
      (p) =>
        p.title &&
        p.abstract &&
        p.abstract.trim().length >= 40 &&
        p.proposed_epoch >= epoch - MATCH_RULES.realVoteWindowEpochs
    )
    .map((p) => ({ p, t: tally.get(p.proposal_id) ?? { yes: 0, no: 0 } }))
    .filter(({ t }) => t.yes + t.no >= MATCH_RULES.minVotersForRealVote)
    .sort((a, b) => {
      const split = (t: { yes: number; no: number }) => Math.min(t.yes, t.no) / (t.yes + t.no);
      return split(b.t) - split(a.t) || b.p.proposed_epoch - a.p.proposed_epoch;
    })
    .slice(0, MATCH_RULES.realVoteCount)
    .map(({ p, t }) => ({
      proposal_id: p.proposal_id,
      title: (p.title ?? '').trim().slice(0, 160),
      summary: (p.abstract ?? '').replace(/\s+/g, ' ').trim().slice(0, 500),
      action_type: p.action_type,
      proposed_epoch: p.proposed_epoch,
      yes: t.yes,
      no: t.no,
    }));
}

let cache: { data: MatchData; at: number } | null = null;
let inflight: Promise<MatchData> | null = null;

/** Cached for 6 hours; the cron pipeline refreshes it after each sync. */
export async function getMatchData(options: { force?: boolean } = {}): Promise<MatchData> {
  if (!options.force && cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.data;
  if (inflight) return inflight;
  inflight = computeMatchData()
    .then((data) => {
      cache = { data, at: Date.now() };
      return data;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export type { Topic };
