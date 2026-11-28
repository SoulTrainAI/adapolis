import { describe, expect, it } from 'vitest';

process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://localhost';
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test';

describe('fantasy leaderboard scoring', () => {
  it('adds up picks\' season points (no multiplier), ranks, and handles ties', async () => {
    const { rankTeams, teamName } = await import('./leaderboard');
    const rosters = [
      { stake_address: 'stake1u' + 'a'.repeat(52), team_name: 'Alpha', created_at: '2026-12-01T00:00:00Z', picks: [{ drep_id: 'd1', underdog_multiplier: 1.5 }, { drep_id: 'd2', underdog_multiplier: 1 }] },
      { stake_address: 'stake1u' + 'b'.repeat(52), team_name: null, created_at: '2026-12-02T00:00:00Z', picks: [{ drep_id: 'd2', underdog_multiplier: 1 }, { drep_id: 'd3', underdog_multiplier: 1.25 }] },
      { stake_address: 'stake1u' + 'c'.repeat(52), team_name: 'Late', created_at: '2026-12-03T00:00:00Z', picks: [{ drep_id: 'd2', underdog_multiplier: 1 }, { drep_id: 'd3', underdog_multiplier: 1.25 }] },
    ];
    const points = new Map([['d1', 40], ['d2', 30], ['d3', 20]]);
    const teams = rankTeams(rosters, points, new Map(), 'stake1u' + 'b'.repeat(52));
    expect(teams.map((t) => [t.rank, t.name, t.points])).toEqual([
      [1, 'Alpha', 70], // 40 + 30: a stored multiplier no longer counts
      [2, 'Team bbbbbb', 50], // 30 + 20
      [2, 'Late', 50], // tie keeps the rank; earlier draft listed first
    ]);
    expect(teams[1].mine).toBe(true);
    expect(teams[0].picks[0]).toMatchObject({ drep_id: 'd1', contribution: 40, multiplier: 1 });
    // Never the whole stake address
    expect(teamName({ team_name: null, stake_address: 'stake1u' + 'x'.repeat(52) })).toBe('Team xxxxxx');
  });

  it('ignores stored underdog multipliers', async () => {
    const { rankTeams } = await import('./leaderboard');
    const rosters = [
      { stake_address: 'stake1u' + 'a'.repeat(52), team_name: 'Small', created_at: '2026-12-01T00:00:00Z', picks: [{ drep_id: 'small', underdog_multiplier: 1.5 }] },
      { stake_address: 'stake1u' + 'b'.repeat(52), team_name: 'Big', created_at: '2026-12-02T00:00:00Z', picks: [{ drep_id: 'big', underdog_multiplier: 1 }] },
    ];
    const teams = rankTeams(rosters, new Map([['small', 20], ['big', 20]]), new Map(), null);
    expect(teams.map((t) => t.points)).toEqual([20, 20]);
  });

  it('scores a swapped slot: retired DRep before the swap, replacement after', async () => {
    const { rankTeams } = await import('./leaderboard');
    const rosters = [
      {
        stake_address: 'stake1u' + 'a'.repeat(52),
        team_name: 'Swap',
        created_at: '2026-12-01T00:00:00Z',
        picks: [{ drep_id: 'new', underdog_multiplier: 1.5, swapped_from: 'old', swapped_from_multiplier: 1, swap_epoch: 680 }],
      },
    ];
    const byEpoch = new Map<string, Record<number, number>>([
      ['old', { 678: 20, 679: 10, 680: 99 }], // 99 after retiring must not count
      ['new', { 679: 50, 680: 10, 681: 10 }], // 50 before the swap must not count
    ]);
    const [team] = rankTeams(rosters, new Map([['old', 129], ['new', 70]]), new Map(), null, byEpoch);
    expect(team.points).toBe(30 + 20);
    expect(team.picks[0]).toMatchObject({ points: 20, swapped_from: { drep_id: 'old', points: 30 } });
  });
});
