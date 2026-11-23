/**
 * Alignment and Personal GovScore. Computed in the browser from the visitor's
 * own quiz answers, so nothing about their values leaves the device. Neither
 * is ever stored or shown to anyone else, and neither touches the public
 * GovScore, which stays "whether they vote, never how" (CONCEPT.md).
 */

import type { Answers, MatchResult } from './score';

/** Where Find My DRep keeps answers in this browser. */
export const SAVED_QUIZ_KEY = 'adapolis.quiz.v1';

export interface SavedQuiz {
  v: 1;
  answers: Answers;
  includeDeeper: boolean;
  savedAt: string;
}

/**
 * How far Alignment can move GovScore: 50% alignment leaves it unchanged,
 * 100% multiplies it by 1.25, 0% by 0.75. Capped at 100.
 */
export const ALIGNMENT_SWING = 0.25;

export function personalGovScore(govscore: number, alignmentPercent: number): number {
  const factor = 1 + ALIGNMENT_SWING * ((alignmentPercent - 50) / 50);
  return Math.min(100, Math.max(0, govscore * factor));
}

export function hasQuizAnswers(a: Answers | null | undefined): a is Answers {
  if (!a) return false;
  return Object.values(a.topics ?? {}).some((t) => t.agree > 0 && t.importance > 0) || Object.keys(a.realVotes ?? {}).length > 0;
}

/** Answers saved in this browser, or null. Storage can be blocked; then there are none. */
export function readSavedQuiz(): SavedQuiz | null {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVED_QUIZ_KEY) ?? 'null') as SavedQuiz | null;
    return saved && saved.v === 1 && hasQuizAnswers(saved.answers) ? saved : null;
  } catch {
    return null;
  }
}

export interface Alignment {
  /** Raw agreement with the visitor's answers, 0-100 */
  alignment: number;
  /** GovScore adjusted by alignment, 0-100 */
  personal: number;
  result: MatchResult;
}

export function alignmentMap(results: MatchResult[]): Map<string, Alignment> {
  return new Map(
    results.map((r) => [r.drep.drep_id, { alignment: r.matchPercent, personal: personalGovScore(r.drep.govscore, r.matchPercent), result: r }])
  );
}
