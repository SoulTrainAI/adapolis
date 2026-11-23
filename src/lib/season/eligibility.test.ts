import { describe, expect, it } from 'vitest';
import { describeEligibility, eligibleAtEnd, eligibleAtLock } from './eligibility';

const d = (drep: string | null, since: number | null, ada: number) => ({ drep, since_epoch: since, snapshot_ada: ada });

describe('prize eligibility', () => {
  it('needs a delegation that started before the lock epoch', () => {
    expect(eligibleAtLock(d('drep1abc', 671, 500), 672)).toBe(true);
    expect(eligibleAtLock(d('drep1abc', 672, 500), 672)).toBe(false);
    expect(eligibleAtLock(d(null, null, 500), 672)).toBe(false);
  });

  it('counts Abstain and No Confidence the same as any DRep, and needs 100 ADA at the end', () => {
    expect(eligibleAtEnd(d('drep_always_abstain', 600, 100))).toBe(true);
    expect(eligibleAtEnd(d('drep_always_no_confidence', 600, 99.9))).toBe(false);
  });

  it('explains what to do next', () => {
    expect(describeEligibility(d(null, null, 0), 672, 670).message).toMatch(new RegExp('delegate', 'i'));
    expect(describeEligibility(d('drep1abc', 650, 40), 672, 670).eligible_now).toBe(false);
    expect(describeEligibility(d('drep1abc', 650, 4000), 672, 670).eligible_now).toBe(true);
  });
});
