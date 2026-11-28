/**
 * The Match-maker's starting slider weights, read from the visitor's quiz
 * answers. Pure, so the browser and tests share it.
 *
 * Each slider starts at a baseline and moves toward 10 (agree) or 0 (disagree)
 * by how strongly the visitor answered, scaled by how important they said it
 * was. Skipped or "not at all important" questions leave the baseline.
 */
import type { Answers } from './score';

export type WeightKey = 'values' | 'track' | 'stamina' | 'xp' | 'insight' | 'power' | 'charisma' | 'decent';
export type Weights = Record<WeightKey, number>;

/** Used for anything the quiz didn't ask (matches the old "Match my values" preset). */
export const BASELINE: Weights = { values: 10, track: 4, stamina: 3, xp: 2, insight: 3, power: 0, charisma: 0, decent: 5 };

/** Which question moves which slider. Several questions on one slider are averaged by importance. */
export const WEIGHT_SOURCES: Record<WeightKey, string[]> = {
  values: ['pref_values_first'],
  track: ['pref_experience'],
  stamina: ['pref_reliable'],
  xp: ['pref_experience'],
  insight: ['transparency'],
  power: [],
  charisma: ['pref_popular'],
  decent: ['small_dreps', 'voting_power_cap'],
};

/** Signed lean in [-1, 1]: how far the answer is from the middle, times importance (0–3). */
function lean(answers: Answers, ids: string[]): number | null {
  let sum = 0;
  let weight = 0;
  for (const id of ids) {
    const a = answers.topics[id];
    if (!a || a.importance <= 0 || a.agree <= 0) continue;
    const u = (Math.min(10, Math.max(1, a.agree)) - 1) / 9;
    sum += (u - 0.5) * 2 * a.importance;
    weight += a.importance;
  }
  if (weight === 0) return null;
  // Average direction, then scale by how much it matters (3 = "Very").
  return (sum / weight) * Math.min(1, weight / ids.length / 3);
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(v)));

export function weightsFromAnswers(answers: Answers | null | undefined): Weights {
  const out: Weights = { ...BASELINE };
  if (!answers) return out;
  (Object.keys(WEIGHT_SOURCES) as WeightKey[]).forEach((key) => {
    const l = lean(answers, WEIGHT_SOURCES[key]);
    if (l === null) return;
    if (key === 'charisma' || key === 'power') {
      // Two-sided: agree favors more, disagree favors fewer.
      out[key] = clamp(BASELINE[key] + l * 10, -10, 10);
    } else {
      const base = BASELINE[key];
      // Values never drops below 3: the visitor answered issue questions, so they still count.
      out[key] = clamp(l >= 0 ? base + (10 - base) * l : base * (1 + l), key === 'values' ? 3 : 0, 10);
    }
  });
  return out;
}
