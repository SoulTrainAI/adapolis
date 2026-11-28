import { describe, expect, it } from 'vitest';
import { buildSeasonClaims, HOUSE_CLAIMANT, PRIZE_TEAMS } from './claims';

const base = { season_number: 1, closes: '2027-02-18T00:00:00Z' };

describe('buildSeasonClaims', () => {
  it('gives every DRep who played 5 copies and the house 1', () => {
    const claims = buildSeasonClaims({ ...base, played: ['a', 'b'], prizeTeams: [] });
    expect(claims.filter((c) => c.claimant_type === 'drep').map((c) => [c.drep_id, c.copies])).toEqual([['a', 5], ['b', 5]]);
    expect(claims.filter((c) => c.claimant === HOUSE_CLAIMANT).map((c) => c.drep_id)).toEqual(['a', 'b']);
  });

  it('gives each top team one card per pick that played, falling back to the swapped-out DRep', () => {
    const claims = buildSeasonClaims({
      ...base,
      played: ['a', 'b', 'old'],
      prizeTeams: [{ stake_address: 's1', picks: [{ drep_id: 'a' }, { drep_id: 'idle' }, { drep_id: 'new', swapped_from: 'old' }, { drep_id: 'b' }] }],
    });
    expect(claims.filter((c) => c.claimant === 's1').map((c) => c.drep_id)).toEqual(['a', 'old', 'b']);
  });

  it('stops at the top 25 teams', () => {
    const prizeTeams = Array.from({ length: 30 }, (_, i) => ({ stake_address: `s${i}`, picks: [{ drep_id: 'a' }] }));
    const claims = buildSeasonClaims({ ...base, played: ['a'], prizeTeams });
    expect(claims.filter((c) => c.claimant_type === 'team')).toHaveLength(PRIZE_TEAMS);
  });
});
