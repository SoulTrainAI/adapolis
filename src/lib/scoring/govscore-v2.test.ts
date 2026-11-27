import { describe, expect, it } from 'vitest';
import { epochStart, type SeasonProposal, type SeasonVote } from '@/lib/season/points';
import { PERFECT_ACTION, perfectStreak, processScores } from './govscore-v2';

const t = (epoch: number) => Math.floor(epochStart(epoch).getTime() / 1000) + 3600;
// Six closed actions, one opening in each epoch 600–605, each open 6 epochs.
const proposals: SeasonProposal[] = Array.from({ length: 6 }, (_, i) => ({ proposal_id: `p${i}`, start: 600 + i, end: 606 + i, expiration: 606 + i }));
const vote = (drep: string, i: number, opts: { rationale?: string | null; late?: boolean; vote?: 'yes' | 'no' | 'abstain' } = {}): SeasonVote => {
  const epoch = opts.late ? 605 + i : 600 + i;
  return { drep_id: drep, proposal_id: `p${i}`, epoch, time: t(epoch), rationale_url: opts.rationale ? `ipfs://${opts.rationale}` : null, rationale_hash: opts.rationale ?? null, vote: opts.vote };
};
const score = (votes: SeasonVote[], ids = ['d']) =>
  processScores(ids.map((drep_id) => ({ drep_id, amount_lovelace: 0 })), proposals, votes, new Map(), 620);

describe('GovScore v2 (career process score)', () => {
  it('a perfect record earns every possible point', () => {
    const [s] = score(proposals.map((_, i) => vote('d', i, { rationale: `h${i}` })));
    expect(s.actions).toBe(6);
    expect(s.possible).toBe(6 * PERFECT_ACTION + perfectStreak(6));
    expect(s.earned).toBe(s.possible);
  });

  it('voting on everything without rationales scores well below explaining', () => {
    const [bare] = score(proposals.map((_, i) => vote('d', i)));
    const [explained] = score(proposals.map((_, i) => vote('d', i, { rationale: `h${i}` })));
    expect(bare.raw!).toBeLessThan(explained.raw!);
    expect(bare.earned / bare.possible).toBeGreaterThan(0.4);
  });

  it('missing everything scores 0, never below', () => {
    const [s] = score([]);
    expect(s.actions).toBe(6);
    expect(s.raw).toBe(0);
  });

  it('Yes, No and Abstain score exactly the same', () => {
    const rows = score(
      [
        ...proposals.map((_, i) => vote('a', i, { rationale: `a${i}`, vote: 'yes' })),
        ...proposals.map((_, i) => vote('b', i, { rationale: `b${i}`, vote: 'no' })),
        ...proposals.map((_, i) => vote('c', i, { rationale: `c${i}`, vote: 'abstain' })),
      ],
      ['a', 'b', 'c']
    );
    expect(new Set(rows.map((r) => r.raw)).size).toBe(1);
  });

  it('a short perfect record ranks below a long one', () => {
    const short = processScores([{ drep_id: 'd', amount_lovelace: 0 }], proposals.slice(0, 2), [vote('d', 0, { rationale: 'x' }), vote('d', 1, { rationale: 'y' })], new Map(), 620)[0];
    const [long] = score(proposals.map((_, i) => vote('d', i, { rationale: `h${i}` })));
    expect(short.raw!).toBeLessThan(long.raw!);
  });
});
