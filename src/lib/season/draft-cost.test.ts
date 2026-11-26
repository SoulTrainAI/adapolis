import { describe, expect, it } from 'vitest';
import { draftCost } from './draft-cost';

describe('draftCost', () => {
  it('follows the star bands', () => {
    expect([null, 0, 25, 26, 50, 51, 100, 101, 150, 151, 200, 201, 250, 251, 291.7].map(draftCost)).toEqual([1, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7]);
  });
});
