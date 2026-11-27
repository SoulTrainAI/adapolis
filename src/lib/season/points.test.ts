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

describe('original rationales', () => {
  const proposals = [
    { proposal_id: 'p1', start: 100, end: 110, expiration: 110 },
    { proposal_id: 'p2', start: 100, end: 110, expiration: 110 },
  ];
  const v = (drep_id: string, proposal_id: string, time: number, hash: string | null): SeasonVote => ({
    drep_id,
    proposal_id,
    epoch: 101,
    time,
    rationale_url: hash ? `ipfs://${hash}` : null,
    rationale_hash: hash,
  });
  const run = (votes: SeasonVote[], ids: string[]) => computeSeasonPoints(ids, proposals, votes, new Map(), { from: 100, to: 110 });

  it('a vote early with an original rationale earns 20; a rationale alone earns nothing extra unless original', () => {
    const [a] = run([v('a', 'p1', 1, 'h1')], ['a']);
    expect(a.breakdown.votes + a.breakdown.rationales + a.breakdown.fresh + a.breakdown.early).toBe(20);
  });

  it('only the first DRep to post a rationale gets the +5; a copy gets nothing', () => {
    const [a, b] = run([v('a', 'p1', 1, 'same'), v('b', 'p1', 2, 'same')], ['a', 'b']);
    expect(a.breakdown.fresh).toBe(5);
    expect(b.breakdown.fresh).toBe(0);
    expect(b.breakdown.rationales).toBe(0);
  });

  it('reusing your own earlier rationale earns nothing', () => {
    const [a] = run([v('a', 'p1', 1, 'mine'), v('a', 'p2', 2, 'mine')], ['a']);
    expect(a.breakdown.fresh).toBe(5);
  });
});
