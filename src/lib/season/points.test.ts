import { describe, expect, it } from 'vitest';
import { computeSeasonPoints, type SeasonVote } from './points';

// Cardinal Rule: how a DRep votes never changes their points.
describe('computeSeasonPoints and vote direction', () => {
  const proposals = [{ proposal_id: 'p1', start: 100, end: 104, expiration: 104 }];
  const run = (vote: SeasonVote['vote']) =>
    computeSeasonPoints(['d'], proposals, [{ drep_id: 'd', proposal_id: 'p1', epoch: 101, rationale_url: 'ipfs://x', rationale_hash: 'h', vote }], new Map(), {
      from: 100,
      to: 104,
    })[0];

  it('scores Yes, No and Abstain identically', () => {
    const [yes, no, abstain] = [run('yes'), run('no'), run('abstain')];
    expect(no.points).toBe(yes.points);
    expect(abstain.points).toBe(yes.points);
    expect(no.breakdown).toEqual(yes.breakdown);
  });

  it('carries the vote and proposal on the event for commentary only', () => {
    const ev = run('no').events.find((e) => e.kind === 'votes');
    expect(ev?.vote).toBe('no');
    expect(ev?.proposal_id).toBe('p1');
  });
});
