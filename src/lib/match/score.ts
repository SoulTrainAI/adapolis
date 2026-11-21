/**
 * Find My DRep scoring. Runs in the browser so quiz answers never leave the
 * user's device. Pure functions only.
 */

import { TOPICS, MATCH_RULES } from './topics';
import type { MatchDRep, RealVoteQuestion } from './profiles';

export interface TopicAnswer {
  /** 1-10 agreement with the statement */
  agree: number;
  /** 0 = not at all ... 3 = very important */
  importance: number;
}

export interface Answers {
  topics: Record<string, TopicAnswer>;
  /** proposal_id -> 1-10 agreement that it should pass; absent = skipped */
  realVotes: Record<string, number>;
}

export interface MatchReason {
  kind: 'agree' | 'differ';
  text: string;
}

export interface MatchResult {
  drep: MatchDRep;
  /** Agreement with the user on everything we could measure, 0-100 */
  matchPercent: number;
  /** Points added because the DRep is small (applies to every user) */
  boost: number;
  rankScore: number;
  reasons: MatchReason[];
  realVoteAgreement: { agreed: number; compared: number };
  earlyProfile: boolean;
}

const toUnit = (v: number) => (Math.min(10, Math.max(1, v)) - 1) / 9;

export function scoreMatches(
  dreps: MatchDRep[],
  realVotes: RealVoteQuestion[],
  answers: Answers
): MatchResult[] {
  const results: MatchResult[] = [];

  for (const drep of dreps) {
    let weightSum = 0;
    let weighted = 0;
    const contributions: Array<{ topicId: string; weight: number; similarity: number }> = [];

    for (const topic of TOPICS) {
      const answer = answers.topics[topic.id];
      if (!answer || answer.importance <= 0 || topic.source === 'stated') continue;
      const u = toUnit(answer.agree);
      const position = drep.positions[topic.id]?.value ?? 0.5;

      let weight: number;
      let similarity: number;
      if (topic.oneSided) {
        // Disagreeing means "don't mind", so only agreement adds weight.
        if (u <= 0.5) continue;
        weight = answer.importance * (u - 0.5) * 2;
        similarity = position;
      } else {
        weight = answer.importance;
        similarity = 1 - Math.abs(u - position);
      }
      weightSum += weight;
      weighted += weight * similarity;
      contributions.push({ topicId: topic.id, weight, similarity });
    }

    let agreed = 0;
    let compared = 0;
    for (const q of realVotes) {
      const answer = answers.realVotes[q.proposal_id];
      if (answer === undefined) continue;
      const u = toUnit(answer);
      // Answers near the middle mean "unsure" and carry little weight.
      const strength = Math.abs(u - 0.5) * 2;
      if (strength < 0.1) continue;
      const vote = drep.real_votes[q.proposal_id];
      const dv = vote === 'yes' ? 1 : vote === 'no' ? 0 : 0.5;
      const weight = 3 * strength;
      weightSum += weight;
      weighted += weight * (1 - Math.abs(u - dv));
      if (vote === 'yes' || vote === 'no') {
        compared++;
        if ((vote === 'yes') === u > 0.5) agreed++;
      }
    }

    if (weightSum === 0) continue;

    const matchPercent = (weighted / weightSum) * 100;
    const smallness = drep.positions.small_dreps?.value ?? 0.5;
    const boost = MATCH_RULES.maxDecentralizationBoost * smallness;

    results.push({
      drep,
      matchPercent,
      boost,
      rankScore: matchPercent + boost,
      reasons: buildReasons(drep, contributions),
      realVoteAgreement: { agreed, compared },
      earlyProfile: drep.votes_cast < 10,
    });
  }

  return results.sort((a, b) => b.rankScore - a.rankScore || a.drep.ada - b.drep.ada);
}

function buildReasons(
  drep: MatchDRep,
  contributions: Array<{ topicId: string; weight: number; similarity: number }>
): MatchReason[] {
  const describe = (topicId: string) => {
    const topic = TOPICS.find((t) => t.id === topicId);
    const position = drep.positions[topicId];
    if (!topic || !position) return null;
    if (topicId === 'small_dreps') return `has ${formatAda(position.rate)} delegated`;
    if (!topic.describe || position.n === 0) return null;
    return `${topic.describe(position.rate)} (${position.n} vote${position.n === 1 ? '' : 's'})`;
  };
  const label = (topicId: string) => TOPICS.find((t) => t.id === topicId)?.statement.replace(/\.$/, '') ?? topicId;

  const reasons: MatchReason[] = [];
  const agreements = contributions.filter((c) => c.similarity >= 0.75).sort((a, b) => b.weight * b.similarity - a.weight * a.similarity);
  for (const c of agreements.slice(0, 2)) {
    const d = describe(c.topicId);
    if (d) reasons.push({ kind: 'agree', text: `Close to you on “${label(c.topicId)}”: ${d}.` });
  }
  const biggestGap = contributions.filter((c) => c.similarity < 0.5).sort((a, b) => b.weight - a.weight)[0];
  if (biggestGap) {
    const d = describe(biggestGap.topicId);
    if (d) reasons.push({ kind: 'differ', text: `Differs from you on “${label(biggestGap.topicId)}”: ${d}.` });
  }
  return reasons;
}

export function formatAda(ada: number): string {
  if (ada >= 1_000_000) return `${(ada / 1_000_000).toFixed(1)}M ADA`;
  if (ada >= 1_000) return `${(ada / 1_000).toFixed(1)}K ADA`;
  return `${Math.round(ada)} ADA`;
}
