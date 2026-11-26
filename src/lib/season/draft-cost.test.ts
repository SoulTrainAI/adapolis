import { describe, expect, it } from 'vitest';
import { draftCost, pointsPerStar } from './draft-cost';

describe('Draft Cost', () => {
  it('scales one star to the 99th-percentile projection ÷ 5', () => {
    const projections = Array.from({ length: 100 }, (_, i) => i + 1); // 1..100, p99 = 100
    expect(pointsPerStar([...projections, 0, null])).toBe(20);
  });
  it('prices in proportion, from 1 to 5 stars', () => {
    expect([null, 0, 5, 20, 21, 60, 81, 100, 400].map((p) => draftCost(p, 20))).toEqual([1, 1, 1, 1, 2, 3, 5, 5, 5]);
  });
  it('never lets a star be worth less than 10 points', () => {
    expect(pointsPerStar([1, 2, 3])).toBe(10);
  });
});
