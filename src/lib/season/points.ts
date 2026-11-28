/**
 * Season points for the fantasy layer.
 *
 * Cardinal Rule (CONCEPT.md 2.4): every point comes from HOW a DRep does the
 * job — showing up, explaining, voting in time — never from HOW they voted.
 * Yes, No and Abstain earn exactly the same. Nothing here reads vote outcomes.
 */

import type { ProposalWindow } from '@/lib/scoring/govscore-v1';
import type { RegistrationPeriod } from '@/lib/koios/drep-registrations';

export const POINT_RULES = {
  vote: 10,
  /** Attaching a rationale earns nothing by itself; only an original one does (Jason, 2026-11-27; was +10). */
  rationale: 0,
  /** Original rationale: no rationale with the same content hash was posted before, by anyone. */
  freshRationale: 5,
  /** Voted in the first half of the action's voting window. */
  early: 5,
  /**
   * Action closed while the DRep was registered and it never voted: no points
   * (there are no penalties; Jason, 2026-11-27). Still recorded: it ends a
   * streak, and the commentary mentions it.
   */
  missed: 0,
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

/**
 * Season number for a window: 1, 2, … from launch; 0 for the Preseason (the
 * window just before Season 1: fully playable, test Champion Cards only, never
 * minted; Jason, 2026-11-23); null for earlier preview windows.
 */
export function seasonNumber(window: number): number | null {
  const launch = seasonOneStartEpoch();
  if (launch === null) return null;
  const n = window - windowForEpoch(launch) + 1;
  return n >= 0 ? n : null;
}

/** "Preseason", "Season 3", or "Warm-up" for a preview window. */
export function seasonLabel(n: number | null): string {
  return n === null ? 'Warm-up' : n === 0 ? 'Preseason' : `Season ${n}`;
}

// Shelley-era epochs are exactly 5 days from epoch 208 (checked against Koios epoch_info).
const SHELLEY_EPOCH = 208;
const SHELLEY_START_S = 1596059091;
const EPOCH_S = 432_000;

export function epochStart(epoch: number): Date {
  return new Date((SHELLEY_START_S + (epoch - SHELLEY_EPOCH) * EPOCH_S) * 1000);
}

/** The epoch a moment (unix seconds) falls in. */
export function epochAt(t: number): number {
  return SHELLEY_EPOCH + Math.floor((t - SHELLEY_START_S) / EPOCH_S);
}

export interface SeasonVote {
  drep_id: string;
  proposal_id: string;
  epoch: number;
  /** Block time in unix seconds, for the race timeline (optional). */
  time?: number;
  rationale_url: string | null;
  rationale_hash: string | null;
  /** Display only; see PointEvent.vote. */
  vote?: 'yes' | 'no' | 'abstain';
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

/** One scoring moment, for the season race. t is unix seconds. */
export interface PointEvent {
  t: number;
  kind: keyof PointBreakdown;
  pts: number;
  /** Streak length for streak events. */
  run?: number;
  /** The action a vote or miss was about. Display only (commentary); never affects points. */
  proposal_id?: string;
  /** How the DRep voted, shown in commentary. Display only: points are identical for Yes, No and Abstain (Cardinal Rule). */
  vote?: 'yes' | 'no' | 'abstain';
}

export interface DRepSeasonPoints {
  drep_id: string;
  points: number;
  breakdown: PointBreakdown;
  votes_cast: number;
  actions_missed: number;
  by_epoch: Record<number, number>;
  events: PointEvent[];
}

function wasRegisteredAt(periods: RegistrationPeriod[], epoch: number): boolean {
  return periods.some((r) => r.from <= epoch && (r.to === null || r.to >= epoch));
}

/**
 * Pure: points every DRep earned in epochs [from, to]. `allVotes` must include
 * every vote (all DReps, all epochs) so an original rationale can be told from a
 * copy. Streaks are counted from the first epoch of the range.
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
  // Each rationale (by content hash) is original only on the first vote that posted it, by any DRep.
  const firstPost = new Map<string, SeasonVote>();
  const when = (v: SeasonVote) => v.time ?? Math.floor(epochStart(v.epoch + 1).getTime() / 1000) - 1;
  for (const v of allVotes) {
    if (!v.rationale_hash) continue;
    const prev = firstPost.get(v.rationale_hash);
    if (!prev || when(v) < when(prev) || (when(v) === when(prev) && `${v.drep_id}|${v.proposal_id}` < `${prev.drep_id}|${prev.proposal_id}`)) {
      firstPost.set(v.rationale_hash, v);
    }
  }

  return drepIds.map((drepId) => {
    const breakdown: PointBreakdown = { votes: 0, rationales: 0, fresh: 0, early: 0, missed: 0, streak: 0 };
    const byEpoch: Record<number, number> = {};
    const events: PointEvent[] = [];
    // Votes happen at their block time; misses and streaks land as an epoch closes.
    const epochEnd = (e: number) => Math.floor(epochStart(e + 1).getTime() / 1000) - 1;
    const add = (
      epoch: number,
      key: keyof PointBreakdown,
      pts: number,
      t: number = epochEnd(epoch),
      run?: number,
      about?: { proposal_id: string; vote?: SeasonVote['vote'] }
    ) => {
      breakdown[key] += pts;
      byEpoch[epoch] = (byEpoch[epoch] ?? 0) + pts;
      const ev: PointEvent = run === undefined ? { t, kind: key, pts } : { t, kind: key, pts, run };
      if (about) {
        ev.proposal_id = about.proposal_id;
        if (about.vote) ev.vote = about.vote;
      }
      events.push(ev);
    };
    const votedEpochs = new Set<number>();
    const missedEpochs = new Set<number>();

    const votes = (votesByDRep.get(drepId) ?? []).slice().sort((a, b) => a.epoch - b.epoch);
    const voted = new Set<string>();
    let votesCast = 0;

    for (const v of votes) {
      voted.add(v.proposal_id);
      const isFresh = v.rationale_hash !== null && firstPost.get(v.rationale_hash) === v;
      if (v.epoch < range.from || v.epoch > range.to) continue;
      const p = proposalById.get(v.proposal_id);
      if (!p) continue;

      votesCast++;
      votedEpochs.add(v.epoch);
      const t = v.time ?? epochEnd(v.epoch);
      add(v.epoch, 'votes', POINT_RULES.vote, t, undefined, { proposal_id: v.proposal_id, vote: v.vote });
      if (v.rationale_url) {
        add(v.epoch, 'rationales', POINT_RULES.rationale, t);
        if (isFresh) add(v.epoch, 'fresh', POINT_RULES.freshRationale, t);
      }
      const lastEpoch = p.end ?? p.expiration;
      if (lastEpoch !== null && v.epoch <= p.start + Math.floor((lastEpoch - p.start) / 2)) {
        add(v.epoch, 'early', POINT_RULES.early, t);
      }
    }

    const drepPeriods = periods.get(drepId) ?? [{ from: 0, to: null }];
    let actionsMissed = 0;
    for (const p of proposals) {
      if (p.end === null || p.end < range.from || p.end > range.to || voted.has(p.proposal_id)) continue;
      if (!wasRegisteredAt(drepPeriods, p.end)) continue;
      actionsMissed++;
      missedEpochs.add(p.end);
      add(p.end, 'missed', POINT_RULES.missed, undefined, undefined, { proposal_id: p.proposal_id });
    }

    // Epochs with nothing to vote on neither extend nor break a streak.
    let run = 0;
    for (let e = range.from; e <= range.to; e++) {
      if (missedEpochs.has(e)) run = 0;
      else if (votedEpochs.has(e)) {
        run++;
        add(e, 'streak', POINT_RULES.streakStep * Math.min(run, POINT_RULES.streakCap), epochEnd(e), run);
      }
    }

    const points = Object.values(breakdown).reduce((a, b) => a + b, 0);
    events.sort((a, b) => a.t - b.t);
    return { drep_id: drepId, points, breakdown, votes_cast: votesCast, actions_missed: actionsMissed, by_epoch: byEpoch, events };
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
