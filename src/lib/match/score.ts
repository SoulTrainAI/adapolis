/**
 * Find My DRep scoring. Runs in the browser so quiz answers never leave the
 * user's device. Pure functions only.
 */

import { TOPICS, MATCH_RULES } from './topics';
import type { MatchDRep, RealVoteQuestion, StatedStance } from './profiles';

export type RankMode = 'votes' | 'statements';

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
  /** Agreement with what the DRep has said, 0-100; null if fewer than 2 overlapping topics */
  statedPercent: number | null;
  statedTopics: number;
  /** The DRep's statements on topics the user cares most about */
  statedHighlights: Array<{ topicId: string; statement: string; stated: StatedStance }>;
  /** Topics where what the DRep says and how it votes point in different directions */
  saysVsDoes: Array<{ statement: string; says: number; does: string }>;
}

const toUnit = (v: number) => (Math.min(10, Math.max(1, v)) - 1) / 9;

export function scoreMatches(
  dreps: MatchDRep[],
  realVotes: RealVoteQuestion[],
  answers: Answers,
  mode: RankMode = 'votes'
): MatchResult[] {
  const results: MatchResult[] = [];

  for (const drep of dreps) {
    let weightSum = 0;
    let weighted = 0;
    const contributions: Contribution[] = [];

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
      contributions.push({ topicId: topic.id, weight, similarity, userPosition: u });
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
    const stated = scoreStated(drep, answers);
    if (mode === 'statements' && stated.percent === null) continue;

    results.push({
      drep,
      matchPercent,
      boost,
      rankScore: (mode === 'statements' ? stated.percent ?? 0 : matchPercent) + boost,
      reasons: buildReasons(drep, contributions),
      realVoteAgreement: { agreed, compared },
      earlyProfile: drep.votes_cast < 10,
      statedPercent: stated.percent,
      statedTopics: stated.topics,
      statedHighlights: stated.highlights,
      saysVsDoes: saysVsDoes(drep),
    });
  }

  return results.sort((a, b) => b.rankScore - a.rankScore || a.drep.ada - b.drep.ada);
}

/**
 * Agreement with the DRep's stated positions, scored exactly like vote-based
 * topics but kept as a separate number. Needs at least 2 overlapping topics.
 */
function scoreStated(drep: MatchDRep, answers: Answers) {
  let weightSum = 0;
  let weighted = 0;
  let topics = 0;
  const ranked: Array<{ topicId: string; importance: number }> = [];
  for (const topic of TOPICS) {
    const answer = answers.topics[topic.id];
    const stance = drep.stated[topic.id];
    if (!answer || answer.importance <= 0 || !stance) continue;
    const u = toUnit(answer.agree);
    const s = toUnit(stance.stance);
    let weight = answer.importance;
    if (topic.oneSided) {
      if (u <= 0.5) continue;
      weight = answer.importance * (u - 0.5) * 2;
    }
    weightSum += weight;
    weighted += weight * (1 - Math.abs(u - s));
    topics++;
    ranked.push({ topicId: topic.id, importance: answer.importance });
  }
  const highlights = ranked
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 2)
    .map(({ topicId }) => ({
      topicId,
      statement: TOPICS.find((t) => t.id === topicId)?.statement ?? topicId,
      stated: drep.stated[topicId],
    }));
  return { percent: topics >= 2 && weightSum > 0 ? (weighted / weightSum) * 100 : null, topics, highlights };
}

function saysVsDoes(drep: MatchDRep): MatchResult['saysVsDoes'] {
  const out: MatchResult['saysVsDoes'] = [];
  for (const topic of TOPICS) {
    const stance = drep.stated[topic.id];
    const position = drep.positions[topic.id];
    if (!stance || !position || position.n < 3 || !topic.describe) continue;
    if (Math.abs(toUnit(stance.stance) - position.rate) >= 0.5) {
      out.push({ statement: topic.statement, says: stance.stance, does: topic.describe(position.rate) });
    }
  }
  return out;
}

interface Contribution {
  topicId: string;
  weight: number;
  similarity: number;
  userPosition: number;
}

/**
 * A reason is only stated when it's clearly true in plain terms: the user took
 * a side (not 4–7), and, for raw-rate topics, the DRep's actual record (not
 * just its evidence-blended position) is on the same side.
 */
function isClearlyStated(drep: MatchDRep, c: Contribution, kind: MatchReason['kind']): boolean {
  if (Math.abs(c.userPosition - 0.5) < 0.2) return false;
  const topic = TOPICS.find((t) => t.id === c.topicId);
  const position = drep.positions[c.topicId];
  if (!topic || !position) return false;
  if (topic.scale === 'absolute' && position.n > 0) {
    const gap = Math.abs(c.userPosition - position.rate);
    return kind === 'agree' ? gap <= 0.35 : gap >= 0.5;
  }
  return true;
}

function buildReasons(drep: MatchDRep, contributions: Contribution[]): MatchReason[] {
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
  const agreements = contributions.filter((c) => c.similarity >= 0.75 && isClearlyStated(drep, c, 'agree')).sort((a, b) => b.weight * b.similarity - a.weight * a.similarity);
  for (const c of agreements.slice(0, 2)) {
    const d = describe(c.topicId);
    if (d) reasons.push({ kind: 'agree', text: `Close to you on “${label(c.topicId)}”: ${d}.` });
  }
  const biggestGap = contributions.filter((c) => c.similarity < 0.5 && isClearlyStated(drep, c, 'differ')).sort((a, b) => b.weight - a.weight)[0];
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
