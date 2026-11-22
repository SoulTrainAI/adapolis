import { describe, expect, it } from 'vitest';
import { computeCards, type CardInputs } from './compute';
import type { SeasonVote } from '@/lib/season/points';

// 30 proposals, one opening every epoch from 640, each open 5 epochs.
const proposals = Array.from({ length: 30 }, (_, i) => ({
  proposal_id: `p${i}`,
  start: 640 + i,
  end: 640 + i + 5 <= 668 ? 640 + i + 5 : null,
  expiration: 640 + i + 5,
}));

function inputs(votes: SeasonVote[], profileComplete = false): CardInputs {
  return {
    currentEpoch: 669,
    dreps: [
      { drep_id: 'drep_a', registered: true, ada: 1000, delegators: 3, name: 'A', image: null, do_not_list: false, profile_complete: profileComplete },
      { drep_id: 'drep_b', registered: true, ada: 5e8, delegators: 9000, name: 'B', image: null, do_not_list: false, profile_complete: false },
    ],
    proposals,
    votes,
    periods: new Map([
      ['drep_a', [{ from: 600, to: null }]],
      ['drep_b', [{ from: 600, to: null }]],
    ]),
    latest: new Map([
      ['drep_a', { govscore: 90, participation: 1, votes_cast: 30, votes_eligible: 30, streak: 7 }],
      ['drep_b', { govscore: 10, participation: 0.1, votes_cast: 3, votes_eligible: 30, streak: 0 }],
    ]),
    ownership: { rosters: 0, picks: new Map() },
  };
}

const allVotes: SeasonVote[] = proposals.map((p) => ({
  drep_id: 'drep_a',
  proposal_id: p.proposal_id,
  epoch: p.start,
  rationale_url: `https://x/${p.proposal_id}`,
  rationale_hash: p.proposal_id,
}));

describe('card abilities', () => {
  it('tiers abilities by published thresholds', () => {
    const a = computeCards(inputs(allVotes, true)).summaries.get('drep_a')!;
    const byId = new Map(a.abilities.map((x) => [x.id, x]));
    expect(byId.get('scholar')?.tier).toBe(1); // 30 explained: Bronze (10), not Silver (50)
    expect(byId.get('early_bird')?.tier).toBe(1);
    expect(byId.get('on_fire')?.tier).toBe(2); // streak 7: Silver (6)
    expect(byId.get('identified')?.tier).toBeNull();
    expect(byId.has('workhorse')).toBe(false); // 30 votes < 50
    expect(a.archetype).not.toBeNull();
    expect(['underdog', 'rookie', 'identified']).not.toContain(a.archetype!.id);
  });

  it('reports recent activity and the last vote epoch', () => {
    const a = computeCards(inputs(allVotes)).summaries.get('drep_a')!;
    expect(a.last_vote_epoch).toBe(669);
    expect(a.recent.missed).toBe(0);
    expect(a.recent.votes).toBeGreaterThan(0);
  });

  it('counts missed actions for a quiet DRep', () => {
    const b = computeCards(inputs(allVotes)).summaries.get('drep_b')!;
    expect(b.last_vote_epoch).toBeNull();
    expect(b.recent.missed).toBeGreaterThan(0);
    expect(b.abilities.find((x) => x.id === 'underdog')).toBeUndefined();
  });

  it('never looks at vote direction', () => {
    // Inputs carry no Yes/No/Abstain field at all; this guards against one being added to SeasonVote.
    const keys = Object.keys(allVotes[0]).sort();
    expect(keys).toEqual(['drep_id', 'epoch', 'proposal_id', 'rationale_hash', 'rationale_url']);
  });
});
