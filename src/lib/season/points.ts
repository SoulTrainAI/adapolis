/**
 * Season points for the fantasy layer.
 *
 * Cardinal Rule (CONCEPT.md 2.4): every point comes from HOW a DRep does the
 * job — showing up, explaining, voting in time — never from HOW it voted.
 * Yes, No and Abstain earn exactly the same. Nothing here reads vote outcomes.
 */

import type { ProposalWindow } from '@/lib/scoring/govscore-v1';
import type { RegistrationPeriod } from '@/lib/koios/drep-registrations';

export const POINT_RULES = {
  vote: 10,
  rationale: 10,
  /** Rationale whose hash this DRep hasn't attached to any earlier vote. */
  freshRationale: 5,
  /** Voted in the first half of the action's voting window. */
  early: 5,
  /** Action closed while the DRep was registered and it never voted. */
  missed: -5,
  /** Per consecutive clean epoch (voted, missed nothing), capped. */
  streakStep: 5,
  streakCap: 4,
  /** Underdog multiplier for the smallest DReps; scales down smoothly with size. */
  maxUnderdogBonus: 0.5,
} as const;

// Seasons are 6-epoch windows on a fixed grid. Until a launch epoch is set,
// every window is a public preview with no drafting.
export const SEASON_LENGTH_EPOCHS = 6;
const GRID_START_EPOCH = 666;

export function windowForEpoch(epoch: number): number {
  return Math.floor((epoch - GRID_START_EPOCH) / SEASON_LENGTH_EPOCHS);
}

export function windowEpochs(window: number): { start: number; end: number } {
  const start = GRID_START_EPOCH + window * SEASON_LENGTH_EPOCHS;
  return { start, end: start + SEASON_LENGTH_EPOCHS - 1 };
}

/** Season 1's first epoch (Jason, 2026-11-21): Jan 4, 2027. Drafting opens now. */
const DEFAULT_SEASON_ONE_START_EPOCH = 678;

/**
 * Season 1's first epoch. SEASON_ONE_START_EPOCH overrides the default;
 * "off" turns seasons back into previews.
 */
export function seasonOneStartEpoch(): number | null {
  const raw = process.env.SEASON_ONE_START_EPOCH?.trim();
  if (raw === 'off') return null;
  const epoch = raw && /^\d+$/.test(raw) ? Number(raw) : DEFAULT_SEASON_ONE_START_EPOCH;
  // Snap to the grid so seasons never straddle two windows.
  return windowEpochs(windowForEpoch(epoch)).start;
}

/** Season number for a window, or null while it is a preview. */
export function seasonNumber(window: number): number | null {
  const launch = seasonOneStartEpoch();
  if (launch === null) return null;
  const n = window - windowForEpoch(launch) + 1;
  return n >= 1 ? n : null;
}

export interface SeasonVote {
  drep_id: string;
  proposal_id: string;
  epoch: number;
  rationale_url: string | null;
  rationale_hash: string | null;
}

export interface SeasonProposal extends ProposalWindow {
  /** Last epoch voting was allowed; used for the early-vote half-way mark. */
  expiration: number | null;
}

export interface PointBreakdown {
  votes: number;
  rationales: number;
  fresh: number;
  early: number;
  missed: number;
  streak: number;
}

export interface DRepSeasonPoints {
  drep_id: string;
  points: number;
  breakdown: PointBreakdown;
  votes_cast: number;
  actions_missed: number;
  by_epoch: Record<number, number>;
}

function wasRegisteredAt(periods: RegistrationPeriod[], epoch: number): boolean {
  return periods.some((r) => r.from <= epoch && (r.to === null || r.to >= epoch));
}

/**
 * Pure: points every DRep earned in epochs [from, to]. `allVotes` must include
 * votes before `from` so "fresh rationale" can see earlier reuse, and streaks
 * are counted from the first epoch of the range.
 */
export function computeSeasonPoints(
  drepIds: string[],
  proposals: SeasonProposal[],
  allVotes: SeasonVote[],
  periods: Map<string, RegistrationPeriod[]>,
  range: { from: number; to: number }
): DRepSeasonPoints[] {
  const proposalById = new Map(proposals.map((p) => [p.proposal_id, p]));
  const votesByDRep = new Map<string, SeasonVote[]>();
  for (const v of allVotes) {
    const list = votesByDRep.get(v.drep_id) ?? [];
    list.push(v);
    votesByDRep.set(v.drep_id, list);
  }

  return drepIds.map((drepId) => {
    const breakdown: PointBreakdown = { votes: 0, rationales: 0, fresh: 0, early: 0, missed: 0, streak: 0 };
    const byEpoch: Record<number, number> = {};
    const add = (epoch: number, key: keyof PointBreakdown, pts: number) => {
      breakdown[key] += pts;
      byEpoch[epoch] = (byEpoch[epoch] ?? 0) + pts;
    };
    const votedEpochs = new Set<number>();
    const missedEpochs = new Set<number>();

    const votes = (votesByDRep.get(drepId) ?? []).slice().sort((a, b) => a.epoch - b.epoch);
    const seenHashes = new Set<string>();
    const voted = new Set<string>();
    let votesCast = 0;

    for (const v of votes) {
      voted.add(v.proposal_id);
      const isFresh = v.rationale_hash !== null && !seenHashes.has(v.rationale_hash);
      if (v.rationale_hash) seenHashes.add(v.rationale_hash);
      if (v.epoch < range.from || v.epoch > range.to) continue;
      const p = proposalById.get(v.proposal_id);
      if (!p) continue;

      votesCast++;
      votedEpochs.add(v.epoch);
      add(v.epoch, 'votes', POINT_RULES.vote);
      if (v.rationale_url) {
        add(v.epoch, 'rationales', POINT_RULES.rationale);
        if (isFresh) add(v.epoch, 'fresh', POINT_RULES.freshRationale);
      }
      const lastEpoch = p.end ?? p.expiration;
      if (lastEpoch !== null && v.epoch <= p.start + Math.floor((lastEpoch - p.start) / 2)) {
        add(v.epoch, 'early', POINT_RULES.early);
      }
    }

    const drepPeriods = periods.get(drepId) ?? [{ from: 0, to: null }];
    let actionsMissed = 0;
    for (const p of proposals) {
      if (p.end === null || p.end < range.from || p.end > range.to || voted.has(p.proposal_id)) continue;
      if (!wasRegisteredAt(drepPeriods, p.end)) continue;
      actionsMissed++;
      missedEpochs.add(p.end);
      add(p.end, 'missed', POINT_RULES.missed);
    }

    // Epochs with nothing to vote on neither extend nor break a streak.
    let run = 0;
    for (let e = range.from; e <= range.to; e++) {
      if (missedEpochs.has(e)) run = 0;
      else if (votedEpochs.has(e)) {
        run++;
        add(e, 'streak', POINT_RULES.streakStep * Math.min(run, POINT_RULES.streakCap));
      }
    }

    const points = Object.values(breakdown).reduce((a, b) => a + b, 0);
    return { drep_id: drepId, points, breakdown, votes_cast: votesCast, actions_missed: actionsMissed, by_epoch: byEpoch };
  });
}

/**
 * Underdog multiplier from both delegated ADA and delegator count, so small in
 * wallets and small in stake both count. Smooth (no cliff to game) and based on
 * size only — never on rank, which a DRep could tank on purpose.
 * 1 + maxBonus × smallness, smallness = 1 − mean(ADA percentile, delegator percentile).
 */
export interface DRepSize {
  drep_id: string;
  amount_lovelace: number;
  delegator_count: number;
}

/**
 * Underdog multiplier scale built from a reference group: smallness is the
 * mean of ADA and delegator percentiles within that group. A DRep outside the
 * group is placed by where its size would fall in it.
 */
export function underdogScale(reference: DRepSize[]): (size: Omit<DRepSize, 'drep_id'>) => number {
  const percentile = (values: number[]) => {
    const sorted = values.slice().sort((a, b) => a - b);
    return (v: number) => {
      if (sorted.length <= 1) return 0;
      let below = 0;
      while (below < sorted.length && sorted[below] < v) below++;
      let equal = 0;
      while (below + equal < sorted.length && sorted[below + equal] === v) equal++;
      const rank = equal > 0 ? below + (equal - 1) / 2 : below - 0.5;
      return Math.min(1, Math.max(0, rank / (sorted.length - 1)));
    };
  };
  const adaPct = percentile(reference.map((d) => d.amount_lovelace));
  const delPct = percentile(reference.map((d) => d.delegator_count));
  return (size) => {
    const smallness = 1 - (adaPct(size.amount_lovelace) + delPct(size.delegator_count)) / 2;
    return Math.round((1 + POINT_RULES.maxUnderdogBonus * smallness) * 100) / 100;
  };
}

/**
 * A drafted DRep's contribution to a team. The underdog multiplier boosts
 * gains only: losses count at 1×, so drafting a small DRep never costs more
 * in a bad window than drafting a big one would.
 */
export function pickContribution(points: number, multiplier: number): number {
  return points > 0 ? points * multiplier : points;
}

export function underdogMultipliers(dreps: DRepSize[]): Map<string, number> {
  const scale = underdogScale(dreps);
  return new Map(dreps.map((d) => [d.drep_id, scale(d)]));
}
