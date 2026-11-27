import { describe, expect, it } from 'vitest';
import { buildCommentary, orderAt } from './commentary';

const DAY = 86_400;
const start = 1_800_000_000;
const ev = (day: number, kind: 'votes' | 'fresh' | 'rationales' | 'missed' | 'streak', pts: number) => ({ t: start + day * DAY + 100, kind, pts });

const racers = [
  { drep_id: 'drep1aaa', name: 'Kurdopia', events: [ev(1, 'votes', 10), ev(1, 'rationales', 10), ev(1, 'fresh', 5)] },
  { drep_id: 'drep1bbb', name: 'THOR', events: [ev(0, 'votes', 10), ev(2, 'missed', 0)] },
];

describe('race commentary', () => {
  it('ranks by points at a moment in time', () => {
    expect(orderAt(racers, start + DAY - 1).map((o) => o.drep_id)).toEqual(['drep1bbb', 'drep1aaa']);
    expect(orderAt(racers, start + 2 * DAY - 1).map((o) => o.drep_id)).toEqual(['drep1aaa', 'drep1bbb']);
  });

  it('calls lead changes, hot takes and slips, and never mentions vote direction', () => {
    const lines = buildCommentary(racers, { starts_at: start, until: start + 3 * DAY, start_epoch: 672 });
    const text = lines.map((l) => l.text).join('\n');
    expect(text).toMatch(new RegExp('THOR .*draws first blood'));
    expect(text).toMatch(new RegExp('Kurdopia (drops a fresh hot take|publishes a brand-new rationale|shows their working, fresh off the press|explains themselves in original prose) and takes the lead from THOR'));
    expect(lines.some((l) => l.tone === 'lead' && l.drep_ids[0] === 'drep1aaa')).toBe(true);
    expect(lines.some((l) => l.tone === 'slip' && l.drep_ids[0] === 'drep1bbb')).toBe(true);
    expect(text).not.toMatch(new RegExp('\\b(yes|no|abstain|treasury|against|support)\\b', 'i'));
  });
});
