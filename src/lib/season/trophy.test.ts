import { describe, expect, it } from 'vitest';
import { epochStart, pickContribution, type PointEvent } from './points';
import { teamClimb, trophyArt, trophyMetadata, medalFor } from './trophy';

const at = (epoch: number, hour: number) => Math.floor(epochStart(epoch).getTime() / 1000) + hour * 3600;
const ev = (t: number, pts: number): PointEvent => ({ t, pts, kind: 'votes' });
const sum = (events: PointEvent[]) => Math.round(events.reduce((s, e) => s + e.pts, 0) * 10) / 10;

describe('teamClimb', () => {
  const events = new Map<string, PointEvent[]>([
    ['a', [ev(at(700, 1), 10), ev(at(701, 2), 5), ev(at(702, 3), 5)]],
    ['b', [ev(at(700, 1), 5), ev(at(701, 5), -5), ev(at(702, 1), -5)]],
    ['old', [ev(at(700, 4), 10), ev(at(702, 2), 10)]],
    ['new', [ev(at(700, 6), 10), ev(at(702, 4), 5)]],
  ]);

  it('ends on the leaderboard total (gains × multiplier, losses at 1×)', () => {
    const slots = [
      { drep_id: 'a', multiplier: 1.5 },
      { drep_id: 'b', multiplier: 2 },
    ];
    // a: 20 × 1.5 = 30; b: net −5 at 1× = −5
    expect(sum(teamClimb(slots, events))).toBe(pickContribution(20, 1.5) + pickContribution(-5, 2));
  });

  it('keeps the retired DRep before the swap epoch and the new one from it', () => {
    const slots = [{ drep_id: 'new', multiplier: 1.2, swapped_from: 'old', swapped_from_multiplier: 1.4, swap_epoch: 701 }];
    // old before 701: 10 × 1.4 = 14; new from 701 on: 5 × 1.2 = 6
    expect(sum(teamClimb(slots, events))).toBe(20);
  });

  it('merges picks scoring in the same second into one step', () => {
    const climb = teamClimb([{ drep_id: 'a', multiplier: 1 }, { drep_id: 'b', multiplier: 1 }], events);
    expect(climb[0]).toEqual({ t: at(700, 1), kind: 'votes', pts: 15 });
  });
});

describe('trophy art and metadata', () => {
  const climbers = [
    { drep_id: 'w', events: [ev(at(700, 1), 50), ev(at(701, 1), 60)] },
    { drep_id: 'x', events: [ev(at(700, 2), 40), ev(at(701, 2), 50)] },
    { drep_id: 'y', events: [ev(at(700, 3), 30)] },
  ];
  const input = { width: 900, height: 620, climbers, winner: 'x', medal: 'silver' as const, starts_at: at(700, 0), ends_at: at(706, 0), t: at(706, 0), seed: 's1' };

  it('is a self-contained SVG with the winner lit in their medal colour', () => {
    const svg = trophyArt(input);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('#f1f5f9');
    expect(svg).not.toContain('<text');
  });

  it('is deterministic for the same seed and differs between trophies', () => {
    expect(trophyArt(input)).toBe(trophyArt(input));
    expect(trophyArt({ ...input, seed: 's2' })).not.toBe(trophyArt(input));
  });

  it('names the trophy and its medal', () => {
    const meta = trophyMetadata({ season_number: 1, season_label: 'Season 1', kind: 'team', medal: 'gold', winner_name: 'Team Aloha', points: 312.4, picks: ['A', 'B'], start_epoch: 672, end_epoch: 677 });
    expect(meta.name).toBe('DRep All-Star Season 1 Trophy · Gold Team');
    expect(meta.edition).toBe('1 of 1');
    expect(medalFor(3)).toBe('bronze');
    expect(medalFor(4)).toBeNull();
  });
});
