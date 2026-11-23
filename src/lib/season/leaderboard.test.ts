import { describe, expect, it } from 'vitest';

process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://localhost';
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test';

describe('fantasy leaderboard scoring', () => {
  it('multiplies each pick by its locked multiplier, ranks, and handles ties', async () => {
    const { rankTeams, teamName } = await import('./leaderboard');
    const rosters = [
      { stake_address: 'stake1u' + 'a'.repeat(52), team_name: 'Alpha', created_at: '2026-12-01T00:00:00Z', picks: [{ drep_id: 'd1', underdog_multiplier: 1.5 }, { drep_id: 'd2', underdog_multiplier: 1 }] },
      { stake_address: 'stake1u' + 'b'.repeat(52), team_name: null, created_at: '2026-12-02T00:00:00Z', picks: [{ drep_id: 'd2', underdog_multiplier: 1 }, { drep_id: 'd3', underdog_multiplier: 1.25 }] },
      { stake_address: 'stake1u' + 'c'.repeat(52), team_name: 'Late', created_at: '2026-12-03T00:00:00Z', picks: [{ drep_id: 'd2', underdog_multiplier: 1 }, { drep_id: 'd3', underdog_multiplier: 1.25 }] },
    ];
    const points = new Map([['d1', 40], ['d2', 30], ['d3', 20]]);
    const teams = rankTeams(rosters, points, new Map(), 'stake1u' + 'b'.repeat(52));
    expect(teams.map((t) => [t.rank, t.name, t.points])).toEqual([
      [1, 'Alpha', 90], // 40×1.5 + 30
      [2, 'Team bbbbbb', 55], // 30 + 20×1.25
      [2, 'Late', 55], // tie keeps the rank; earlier draft listed first
    ]);
    expect(teams[1].mine).toBe(true);
    expect(teams[0].picks[0]).toMatchObject({ drep_id: 'd1', contribution: 60 });
    // Never the whole stake address
    expect(teamName({ team_name: null, stake_address: 'stake1u' + 'x'.repeat(52) })).toBe('Team xxxxxx');
  });
});
