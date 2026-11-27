import { describe, expect, it } from 'vitest';
import { mountain, summitExponent } from './mountain';

const ev = (t: number, pts: number) => ({ t, pts, kind: 'votes' as const });

describe('mountain', () => {
  const climbers = [
    { drep_id: 'a', events: [ev(10, 10), ev(20, 30)] },
    { drep_id: 'b', events: [ev(15, 20)] },
  ];
  const g = mountain(climbers, { width: 1000, height: 400, starts_at: 0, ends_at: 100, t: 100, padding: { left: 0, right: 0, top: 0, bottom: 0 } });

  it('heights are proportional to points', () => {
    const a = g.lines.find((l) => l.drep_id === 'a')!;
    const b = g.lines.find((l) => l.drep_id === 'b')!;
    expect(a.points).toBe(40);
    expect(b.points).toBe(20);
    expect((400 - a.y) / (400 - b.y)).toBeCloseTo(2, 5);
  });

  it('stops drawing at time t', () => {
    const early = mountain(climbers, { width: 1000, height: 400, starts_at: 0, ends_at: 100, t: 12 });
    expect(early.lines.find((l) => l.drep_id === 'a')!.points).toBe(10);
    expect(early.lines.find((l) => l.drep_id === 'b')!.points).toBe(0);
  });

  it('keeps labels apart', () => {
    const tight = mountain(
      [
        { drep_id: 'a', events: [ev(1, 50)] },
        { drep_id: 'b', events: [ev(1, 50)] },
      ],
      { width: 1000, height: 400, starts_at: 0, ends_at: 100, t: 100, labelGap: 18 }
    );
    const [l1, l2] = tight.lines.map((l) => l.labelY).sort((x, y) => x - y);
    expect(l2 - l1).toBeGreaterThanOrEqual(18);
  });
});


describe('summit curve', () => {
  it('stays proportional when the field is already spread out', () => {
    expect(summitExponent([300, 200, 100, 50, 40, 30, 20, 15, 10, 5])).toBe(1);
  });
  it('stretches a bunched top 10 so 10th sits near a third of the height', () => {
    const final = [165, 135, 130, 130, 120, 115, 110, 95, 90, 85];
    const k = summitExponent(final);
    expect(k).toBeGreaterThan(1);
    expect(Math.pow(85 / 165, k)).toBeCloseTo(0.35, 2);
  });
  it('keeps order and puts a bigger lead higher', () => {
    const climbers = [
      { drep_id: 'a', events: [{ t: 1, pts: 165, kind: 'votes' as const }] },
      { drep_id: 'b', events: [{ t: 1, pts: 135, kind: 'votes' as const }] },
      { drep_id: 'c', events: [{ t: 1, pts: 85, kind: 'votes' as const }] },
    ];
    const g = mountain(climbers, { width: 1000, height: 400, starts_at: 0, ends_at: 100, t: 100, exponent: 2, padding: { left: 0, right: 0, top: 0, bottom: 0 } });
    const y = Object.fromEntries(g.lines.map((l) => [l.drep_id, l.y]));
    expect(y.a).toBeLessThan(y.b);
    expect(y.b).toBeLessThan(y.c);
  });
});

import { monotonePath } from './mountain';

describe('smooth flight paths', () => {
  it('never dips below an earlier point (screen y never increases on a rising climb)', () => {
    const pts: Array<[number, number]> = [[0, 100], [10, 100], [20, 60], [30, 60], [40, 20], [50, 20]];
    const nums = monotonePath(pts).match(/-?\d+(\.\d+)?/g)!.map(Number);
    const ys = nums.filter((_, i) => i % 2 === 1);
    for (let i = 1; i < ys.length; i++) expect(ys[i]).toBeLessThanOrEqual(100);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(20);
  });
});
