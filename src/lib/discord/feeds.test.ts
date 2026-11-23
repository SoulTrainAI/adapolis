import { describe, expect, it, vi } from 'vitest';

const posts: Array<{ key: string; channel: string; message: Record<string, unknown> }> = [];
const posted = new Set<string>();

vi.mock('./posts', () => ({
  alreadyPosted: async (keys: string[]) => new Set(keys.filter((k) => posted.has(k))),
  postOnce: async (key: string, channel: string, message: Record<string, unknown>) => {
    if (posted.has(key)) return null;
    posted.add(key);
    posts.push({ key, channel, message });
    return { id: 'm', channel_id: channel === 'c-actions' ? 'thread-1' : channel };
  },
}));
vi.mock('./rest', async (orig) => ({
  ...(await orig<typeof import('./rest')>()),
  guildId: () => 'G',
  listChannels: async () => [
    { id: 'c-actions', name: 'governance-actions', type: 15, available_tags: [{ id: 't1', name: 'Treasury' }] },
    { id: 'c-feed', name: 'governance-feed', type: 0 },
    { id: 'c-season', name: 'season-feed', type: 0 },
    { id: 'c-card', name: 'card-of-the-day', type: 0 },
  ],
  listRoles: async () => [{ id: 'r-gov', name: 'Governance Alerts', position: 1, managed: false, permissions: '0' }],
}));
vi.mock('@/lib/hot-topics/data', () => ({
  getHotTopics: async () => ({
    computed_at: '',
    current_epoch: 669,
    topics: [
      {
        proposal_id: 'gov_action1abc',
        title: 'Fund the thing',
        abstract: 'Abstract',
        action_type: 'TreasuryWithdrawals',
        proposed_epoch: 664,
        voting_ends_epoch: 670,
        tally: { count: { yes: 10, no: 5, abstain: 2 }, ada: { yes: 0, no: 0, abstain: 0 } },
        recent_votes: 3,
        rationales: 7,
        vocal: { yes: [], no: [] },
        arguments: null,
        forum: null,
      },
    ],
  }),
}));
vi.mock('@/lib/season/data', () => ({
  getSeasonData: async () => ({ computed_at: '', window: 0, season: null, start_epoch: 666, end_epoch: 671, current_epoch: 669, standings: [] }),
}));
vi.mock('@/lib/season/fantasy', () => ({
  draftSeason: async () => ({ season_number: 1, grid_window: 2, start_epoch: 678, end_epoch: 683, starts_at: '', draft_locks_at: new Date(Date.now() + 864e6).toISOString(), ends_at: '', reference_window: 1 }),
}));
vi.mock('@/lib/cards/data', () => ({ getCards: async () => ({ cards: [] }) }));
vi.mock('@/lib/season/leaderboard', () => ({ getLeaderboard: async () => null }));

describe('Discord feeds', () => {
  it('previews without posting, then posts each item once, neutrally', async () => {
    const { runFeeds } = await import('./feeds');
    const preview = await runFeeds({ apply: false });
    expect(posts).toHaveLength(0);
    expect(preview.wouldPost).toEqual(expect.arrayContaining(['action:gov_action1abc', 'action-feed:gov_action1abc', 'closing:gov_action1abc', 'recap:669', 'draft:1:open']));

    const run = await runFeeds({ apply: true });
    expect(run.warnings).toEqual([]);
    const feedPost = posts.find((p) => p.key === 'action-feed:gov_action1abc')!;
    expect(JSON.stringify(feedPost.message)).toContain('discord.com/channels/G/thread-1');
    expect(feedPost.message.allowed_mentions).toEqual({ roles: ['r-gov'] });

    // Deadline reminder reports turnout, not which side leads.
    const closing = JSON.stringify(posts.find((p) => p.key === 'closing:gov_action1abc')!.message);
    expect(closing).toContain('17 DReps have voted');
    expect(closing).not.toMatch(/yes|no\b|winning|leading/i);

    const again = await runFeeds({ apply: true });
    expect(again.posted).toEqual([]);
  });
});
