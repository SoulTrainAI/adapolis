import { describe, expect, it } from 'vitest';
import { BASELINE, weightsFromAnswers } from './weights';
import type { Answers } from './score';

const a = (topics: Answers['topics']): Answers => ({ topics, realVotes: {} });

describe('weightsFromAnswers', () => {
  it('keeps the baseline when nothing relevant was answered', () => {
    expect(weightsFromAnswers(null)).toEqual(BASELINE);
    expect(weightsFromAnswers(a({ treasury_spending: { agree: 9, importance: 3 } }))).toEqual(BASELINE);
  });

  it('moves sliders toward 10 or 0 by strength and importance', () => {
    const w = weightsFromAnswers(a({ pref_reliable: { agree: 10, importance: 3 }, pref_experience: { agree: 1, importance: 3 } }));
    expect(w.stamina).toBe(10);
    expect(w.track).toBe(0);
    expect(w.xp).toBe(0);
    const mild = weightsFromAnswers(a({ pref_reliable: { agree: 10, importance: 1 } }));
    expect(mild.stamina).toBeGreaterThan(BASELINE.stamina);
    expect(mild.stamina).toBeLessThan(10);
  });

  it('makes Charisma two-sided and keeps Values at 3 or more', () => {
    expect(weightsFromAnswers(a({ pref_popular: { agree: 1, importance: 3 } })).charisma).toBe(-10);
    expect(weightsFromAnswers(a({ pref_popular: { agree: 10, importance: 3 } })).charisma).toBe(10);
    expect(weightsFromAnswers(a({ pref_values_first: { agree: 1, importance: 3 } })).values).toBe(3);
  });

  it('ignores importance 0 (skipped)', () => {
    expect(weightsFromAnswers(a({ pref_reliable: { agree: 10, importance: 0 } }))).toEqual(BASELINE);
  });
});
