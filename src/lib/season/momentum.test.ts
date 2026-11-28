import { describe, expect, it } from 'vitest';
import { momentumFor, withMomentum, type BackingSnapshot } from './momentum';
import { windowEpochs, windowForEpoch } from './points';

const W = windowForEpoch(680);
const prev = windowEpochs(W - 1);
const cur = windowEpochs(W);

function season(drep: string, start: number, n: number, ada: number, qualified: number | null = null, delegators: number | null = qualified): BackingSnapshot[] {
  return Array.from({ length: n }, (_, i) => ({ drep_id: drep, epoch: start + i, ada, delegators, qualified }));
}

describe('momentumFor', () => {
  it('gives 1% per 1% growth, averaged over Power and Charisma', () => {
    const snaps = [...season('a', prev.start, 6, 10_000_000, 1000), ...season('a', cur.start, 6, 11_000_000, 1100)];
    const m = momentumFor(snaps, W).get('a')!;
    expect(m.power).toBeCloseTo(0.1);
    expect(m.charisma).toBeCloseTo(0.1);
    expect(m.bonus).toBeCloseTo(0.1);
  });

  it('caps at +20% and never goes negative', () => {
    const up = [...season('a', prev.start, 6, 10_000_000, 1000), ...season('a', cur.start, 6, 30_000_000, 3000)];
    expect(momentumFor(up, W).get('a')!.bonus).toBe(0.2);
    const down = [...season('a', prev.start, 6, 10_000_000, 1000), ...season('a', cur.start, 6, 5_000_000, 500)];
    expect(momentumFor(down, W).get('a')!.bonus).toBe(0);
  });

  it('measures small DReps from the floors, so one friend cannot max them out', () => {
    // 50K ADA and 5 delegators, then a friend adds 10K ADA in one wallet.
    const snaps = [...season('a', prev.start, 6, 50_000, 5), ...season('a', cur.start, 6, 60_000, 6)];
    const m = momentumFor(snaps, W).get('a')!;
    expect(m.power).toBeCloseTo(0.01);
    expect(m.charisma).toBeCloseTo(0.02);
    expect(m.bonus).toBeCloseTo(0.015);
  });

  it('uses season averages, so a last-epoch boost counts 1/6', () => {
    const snaps = [...season('a', prev.start, 6, 10_000_000), ...season('a', cur.start, 5, 10_000_000), ...season('a', cur.start + 5, 1, 16_000_000)];
    expect(momentumFor(snaps, W).get('a')!.power).toBeCloseTo(0.1);
  });

  it('needs a baseline of 2 epochs last season', () => {
    const snaps = [...season('a', prev.end, 1, 1_000_000), ...season('a', cur.start, 6, 5_000_000)];
    expect(momentumFor(snaps, W).has('a')).toBe(false);
  });

  it('counts only Power when delegator counts are missing', () => {
    const snaps = [...season('a', prev.start, 6, 10_000_000, null), ...season('a', cur.start, 6, 12_000_000, 1200)];
    const m = momentumFor(snaps, W).get('a')!;
    expect(m.charisma).toBeNull();
    expect(m.bonus).toBeCloseTo(0.1);
  });

  it('ignores delegation from a wallet that drafted the DRep', () => {
    const snaps = [...season('a', prev.start, 6, 10_000_000, 1000), ...season('a', cur.start, 6, 12_000_000, 1001)];
    const wallet = 'stake1team';
    const wallets = [
      { stake_address: wallet, epoch: prev.start, drep_id: 'b', ada: 2_000_000 },
      { stake_address: wallet, epoch: cur.start, drep_id: 'a', ada: 2_000_000 },
    ];
    const m = momentumFor(snaps, W, wallets, new Map([[wallet, new Set(['a'])]])).get('a')!;
    expect(m.power).toBe(0);
    expect(m.charisma).toBe(0);
  });
});

describe('withMomentum', () => {
  it('scales and rounds season points', () => {
    expect(withMomentum(200, 0.15)).toBe(230);
    expect(withMomentum(200, undefined)).toBe(200);
  });
});
