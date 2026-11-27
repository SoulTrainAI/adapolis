/**
 * Side-by-side GovScore v1 and the proposed v2 for every registered DRep, so
 * the switch can be checked on real data before it goes public. Admin-only;
 * writes nothing. Server-only.
 */

import { loadAll, proposalWindow } from './govscore-v1';
import { processScores } from './govscore-v2';
import { getCards } from '@/lib/cards/data';
import { fetchCurrentEpoch } from '@/lib/koios';
import { blockTimeToEpoch, fetchDRepRegistrationPeriods } from '@/lib/koios/drep-registrations';
import type { SeasonVote } from '@/lib/season/points';

export interface PreviewRow {
  drep_id: string;
  name: string | null;
  v1: number | null;
  v2: number | null;
  v1_rank: number | null;
  v2_rank: number | null;
  actions: number;
  votes_cast: number;
  /** Share of their votes that came with a rationale. */
  rationale_share: number | null;
  early_share: number | null;
}

export interface GovScoreV2Preview {
  computed_at: string;
  scored: number;
  /** Rank movement summary across DReps scored by both. */
  moved_10_plus: number;
  top: PreviewRow[];
  risers: PreviewRow[];
  fallers: PreviewRow[];
}

let cache: { at: number; data: GovScoreV2Preview } | null = null;

export async function govScoreV2Preview(): Promise<GovScoreV2Preview> {
  if (cache && Date.now() - cache.at < 10 * 60 * 1000) return cache.data;
  const [currentEpoch, dreps, proposalRows, voteRows, periods, cards] = await Promise.all([
    fetchCurrentEpoch(),
    loadAll<{ drep_id: string; is_registered: boolean | null; amount_lovelace: number | string | null }>('dreps', 'drep_id, is_registered, amount_lovelace'),
    loadAll<{ proposal_id: string; proposed_epoch: number; status: string; ratified_epoch: number | null; expired_epoch: number | null; voting_ends_epoch: number | null }>(
      'proposals',
      'proposal_id, proposed_epoch, status, ratified_epoch, expired_epoch, voting_ends_epoch'
    ),
    loadAll<{ drep_id: string; proposal_id: string; block_time: string; rationale_url: string | null; rationale_hash: string | null }>(
      'votes',
      'drep_id, proposal_id, block_time, rationale_url, rationale_hash'
    ),
    fetchDRepRegistrationPeriods(),
    getCards(),
  ]);
  const proposals = proposalRows.map((p) => ({ ...proposalWindow(p), expiration: p.voting_ends_epoch }));
  const votes: SeasonVote[] = voteRows.map((v) => {
    const time = Math.floor(new Date(v.block_time).getTime() / 1000);
    return { drep_id: v.drep_id, proposal_id: v.proposal_id, epoch: blockTimeToEpoch(time), time, rationale_url: v.rationale_url, rationale_hash: v.rationale_hash };
  });
  const registered = dreps.filter((d) => d.is_registered !== false).map((d) => ({ drep_id: d.drep_id, amount_lovelace: Number(d.amount_lovelace ?? 0) }));
  const v2 = processScores(registered, proposals, votes, periods, currentEpoch);
  const card = new Map(cards.cards.map((c) => [c.drep_id, c]));

  const rankOf = (vals: Array<{ id: string; v: number | null }>) => {
    const ranked = vals.filter((x) => x.v !== null).sort((a, b) => b.v! - a.v!);
    return new Map(ranked.map((x, i) => [x.id, i + 1]));
  };
  const r1 = rankOf(v2.map((s) => ({ id: s.drep_id, v: card.get(s.drep_id)?.govscore ?? null })));
  const r2 = rankOf(v2.map((s) => ({ id: s.drep_id, v: s.adjusted })));
  const rows: PreviewRow[] = v2
    .filter((s) => s.actions > 0)
    .map((s) => ({
      drep_id: s.drep_id,
      name: card.get(s.drep_id)?.name ?? null,
      v1: card.get(s.drep_id)?.govscore ?? null,
      v2: s.adjusted,
      v1_rank: r1.get(s.drep_id) ?? null,
      v2_rank: r2.get(s.drep_id) ?? null,
      actions: s.actions,
      votes_cast: s.votes_cast,
      rationale_share: s.votes_cast ? s.breakdown.rationales / 10 / s.votes_cast : null,
      early_share: s.votes_cast ? s.breakdown.early / 5 / s.votes_cast : null,
    }));
  const both = rows.filter((r) => r.v1_rank !== null && r.v2_rank !== null);
  const move = (r: PreviewRow) => r.v1_rank! - r.v2_rank!;
  const data: GovScoreV2Preview = {
    computed_at: new Date().toISOString(),
    scored: rows.length,
    moved_10_plus: both.filter((r) => Math.abs(move(r)) >= 10).length,
    top: [...rows].sort((a, b) => (b.v2 ?? -1) - (a.v2 ?? -1)).slice(0, 40),
    // Only DReps with a real record (20+ actions), so a 3-vote newcomer doesn't dominate the list.
    risers: both.filter((r) => r.actions >= 20).sort((a, b) => move(b) - move(a)).slice(0, 12),
    fallers: both.filter((r) => r.actions >= 20).sort((a, b) => move(a) - move(b)).slice(0, 12),
  };
  cache = { at: Date.now(), data };
  return data;
}
