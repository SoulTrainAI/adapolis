/**
 * GovScore v2 — the game's process scoring, career-long
 *
 * Every governance action a DRep could vote on is scored exactly as the
 * Cardanathon scores it: +10 for voting, +5 for voting in the first half of
 * the window, +5 for an original rationale (not identical to any posted
 * before, by anyone), nothing
 * for an action that closed without their vote, plus streak bonuses for
 * consecutive clean epochs. GovScore is the share of the points a perfect DRep would have
 * earned on the same actions (votes on all of them, early, each with a new
 * rationale), so it stays on 0–100.
 *
 * As in v1: confidence-adjusted with the Wilson lower bound over the number
 * of actions (a short perfect record isn't yet proven), then the ADA-power
 * dampener. Points never depend on how anyone voted (Cardinal Rule).
 */

import { computeSeasonPoints, POINT_RULES, type PointBreakdown, type SeasonProposal, type SeasonVote } from '@/lib/season/points';
import type { RegistrationPeriod } from '@/lib/koios/drep-registrations';
import { wilsonLowerBound } from './confidence';
import { calculateDampener } from './govscore-v1';

/** What a perfect vote earns: voted, explained with a new rationale, early. */
export const PERFECT_ACTION = POINT_RULES.vote + POINT_RULES.rationale + POINT_RULES.freshRationale + POINT_RULES.early;

export interface ProcessScore {
  drep_id: string;
  /** Actions the DRep voted on or missed. */
  actions: number;
  earned: number;
  possible: number;
  breakdown: PointBreakdown;
  votes_cast: number;
  /** 0–100 before the ADA dampener, null with no actions yet. */
  raw: number | null;
  adjusted: number | null;
}

/** Streak points a DRep who never misses earns over `epochs` epochs with something to vote on. */
export function perfectStreak(epochs: number): number {
  let sum = 0;
  for (let run = 1; run <= epochs; run++) sum += POINT_RULES.streakStep * Math.min(run, POINT_RULES.streakCap);
  return sum;
}

export function processScores(
  dreps: Array<{ drep_id: string; amount_lovelace: number }>,
  proposals: SeasonProposal[],
  votes: SeasonVote[],
  periods: Map<string, RegistrationPeriod[]>,
  currentEpoch: number
): ProcessScore[] {
  const from = proposals.length ? Math.min(...proposals.map((p) => p.start)) : currentEpoch;
  const points = computeSeasonPoints(
    dreps.map((d) => d.drep_id),
    proposals,
    votes,
    periods,
    { from, to: currentEpoch }
  );
  const byId = new Map(proposals.map((p) => [p.proposal_id, p]));
  const votedBy = new Map<string, Set<string>>();
  for (const v of votes) {
    const set = votedBy.get(v.drep_id) ?? new Set<string>();
    set.add(v.proposal_id);
    votedBy.set(v.drep_id, set);
  }
  const amount = new Map(dreps.map((d) => [d.drep_id, d.amount_lovelace]));

  return points.map((p) => {
    // The actions the game scored for this DRep: the ones they voted on, and the ones they missed.
    const missed = p.events.filter((e) => e.kind === 'missed' && e.proposal_id).map((e) => e.proposal_id!);
    const voted = Array.from(votedBy.get(p.drep_id) ?? []).filter((id) => byId.has(id) && p.events.some((e) => e.kind === 'votes' && e.proposal_id === id));
    const ids = Array.from(new Set([...voted, ...missed]));
    const actions = ids.length;
    // A perfect DRep votes early on each one, so it scores a clean epoch for every epoch an action opened.
    const epochs = new Set(ids.map((id) => byId.get(id)!.start)).size;
    const possible = actions * PERFECT_ACTION + perfectStreak(epochs);
    const earned = p.points;
    const ratio = possible > 0 ? Math.min(1, Math.max(0, earned / possible)) : null;
    const raw = ratio === null ? null : Math.round(wilsonLowerBound(ratio * actions, actions) * 1000) / 10;
    return {
      drep_id: p.drep_id,
      actions,
      earned,
      possible,
      breakdown: p.breakdown,
      votes_cast: p.votes_cast,
      raw,
      adjusted: raw === null ? null : Math.round(raw * calculateDampener(amount.get(p.drep_id) ?? 0) * 10) / 10,
    };
  });
}
