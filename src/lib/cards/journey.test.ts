import { describe, expect, it } from 'vitest';
import { buildJourney } from './journey';
import { flavorText } from './flavor';
import type { SeasonLine } from './types';

const line = (window: number, end: number, votes: number, participation: number | null): SeasonLine => ({
  window,
  label: `S${window}`,
  start_epoch: end - 5,
  end_epoch: end,
  in_progress: false,
  played: true,
  points: 0,
  votes: 0,
  rationales: 0,
  early: 0,
  missed: 0,
  streak_points: 0,
  govscore_end: null,
  career_votes_end: votes,
  participation_end: participation,
});

describe('buildJourney', () => {
  it('reads power at each season end and counts delegators who had joined by then', () => {
    const chain = { power: new Map([[605, 100], [611, 250]]), delegatedAt: [600, 604, 610, 615] };
    const j = buildJourney([line(1, 605, 3, 0.5), line(2, 611, 8, 0.8), line(3, 617, 9, 0.75)], chain, 616);
    expect(j.map((p) => [p.power, p.charisma, p.xp, p.stamina])).toEqual([
      [100, 2, 3, 0.5],
      [250, 3, 8, 0.8],
      [250, 4, 9, 0.75], // season in progress: current epoch, latest known power
    ]);
  });

  it('keeps vote-based stats when Koios is unavailable', () => {
    const [p] = buildJourney([line(1, 605, 3, 0.5)], null, 610);
    expect(p).toMatchObject({ power: null, charisma: null, xp: 3, stamina: 0.5 });
  });
});

describe('flavorText', () => {
  it('is stable per DRep and never mentions vote direction', () => {
    const c = { drep_id: 'drep1abc', abilities: [], participation: 0.9, votes_cast: 40 };
    expect(flavorText(c)).toBe(flavorText(c));
    expect(flavorText(c)).not.toMatch(new RegExp('\\b(yes|no|abstain|treasury|against|support)\\b', 'i'));
  });
});
