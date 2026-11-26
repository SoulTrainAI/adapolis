import { describe, expect, it } from 'vitest';
import { mountain } from './mountain';

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
