/**
 * Since 2026-11-27 the published GovScore is v2 (govscore-v2.ts: the game's
 * scoring over a whole career). This file still computes participation, votes
 * and streaks, stored beside it, and runs the nightly scoring job.
 *
 * GovScore v1 — Participation Rate (confidence-adjusted)
 *
 * A DRep is judged only on governance actions it had the chance to vote on:
 * those whose voting window overlapped a period when the DRep was registered.
 *
 * The score uses the Wilson lower bound of the participation rate: the rate
 * we can be 95% confident the DRep is at or above, given how many chances it
 * had. 5 of 5 scores 56.6; 159 of 164 scores 93.1. A short perfect record is
 * promising but not yet proven, so a long consistent record ranks higher,
 * and newcomers climb as their record grows.
 *
 * Proposals still open for voting count only if the DRep has already voted on
 * them: a DRep can't have "missed" a vote whose window hasn't closed.
 */

import { supabaseAdmin } from '@/lib/sync/supabase-admin';
import { wilsonLowerBound } from './confidence';
import { processScores } from './govscore-v2';
import { blockTimeToEpoch } from '@/lib/koios/drep-registrations';

export { PROVISIONAL_BELOW_ELIGIBLE, wilsonLowerBound } from './confidence';
import { fetchDRepRegistrationPeriods, type RegistrationPeriod } from '@/lib/koios/drep-registrations';

const DB_PAGE_SIZE = 1000;

interface ComputeResult {
  dreps_scored: number;
  avg_participation: number;
}

export interface ProposalWindow {
  proposal_id: string;
  start: number;
  /** null while voting is still open */
  end: number | null;
}

export interface DRepScoreRow {
  drep_id: string;
  votes_cast: number;
  votes_eligible: number;
  participation_rate: number | null;
  raw_govscore: number | null;
  adjusted_govscore: number | null;
  voting_streak_epochs: number;
}

/**
 * Quadratic ADA-power dampener: 1 / (1 + log10(ada_m + 1) / 4), ada_m = ADA in millions.
 */
export function calculateDampener(amountLovelace: number): number {
  const adaMillions = amountLovelace / 1_000_000_000_000;
  return 1 / (1 + Math.log10(adaMillions + 1) / 4);
}

/**
 * Consecutive epochs (counting back from the most recent) in which the DRep
 * voted on at least one proposal submitted that epoch.
 */
function computeVotingStreak(epochs: Set<number> | undefined): number {
  if (!epochs || epochs.size === 0) return 0;
  const sorted = Array.from(epochs).sort((a, b) => b - a);
  let streak = 1;
  for (let i = 1; i < sorted.length && sorted[i] === sorted[i - 1] - 1; i++) streak++;
  return streak;
}

export function proposalWindow(p: {
  proposal_id: string;
  proposed_epoch: number;
  status: string;
  ratified_epoch: number | null;
  expired_epoch: number | null;
  voting_ends_epoch: number | null;
}): ProposalWindow {
  if (p.status === 'active') return { proposal_id: p.proposal_id, start: p.proposed_epoch, end: null };
  // Dropped proposals have no stored drop epoch; their expiration is the
  // latest epoch they could have been voted on.
  const end = p.ratified_epoch ?? p.expired_epoch ?? p.voting_ends_epoch ?? p.proposed_epoch;
  return { proposal_id: p.proposal_id, start: p.proposed_epoch, end };
}

function overlaps(window: ProposalWindow, periods: RegistrationPeriod[], currentEpoch: number): boolean {
  const windowEnd = window.end ?? currentEpoch;
  return periods.some((r) => r.from <= windowEnd && (r.to === null || r.to >= window.start));
}

/**
 * Pure scoring step, separated from I/O so it can be tested directly.
 */
export function scoreDReps(
  dreps: Array<{ drep_id: string; amount_lovelace: number }>,
  proposals: ProposalWindow[],
  votesByDRep: Map<string, Set<string>>,
  periods: Map<string, RegistrationPeriod[]>,
  currentEpoch: number
): DRepScoreRow[] {
  const proposalStart = new Map(proposals.map((p) => [p.proposal_id, p.start]));

  return dreps.map((drep) => {
    const voted = votesByDRep.get(drep.drep_id) ?? new Set<string>();
    // A DRep with no registration history in Koios is treated as always
    // registered, so the gap never inflates its score.
    const drepPeriods = periods.get(drep.drep_id) ?? [{ from: 0, to: null }];

    const eligible = new Set<string>();
    for (const p of proposals) {
      if (voted.has(p.proposal_id)) {
        eligible.add(p.proposal_id);
      } else if (p.end !== null && overlaps(p, drepPeriods, currentEpoch)) {
        eligible.add(p.proposal_id);
      }
    }

    const votesCast = Array.from(voted).filter((id) => eligible.has(id)).length;
    const votesEligible = eligible.size;
    const participation = votesEligible > 0 ? votesCast / votesEligible : null;
    const raw = participation === null ? null : Math.round(wilsonLowerBound(votesCast, votesEligible) * 1000) / 10;

    const epochs = new Set<number>();
    for (const id of Array.from(voted)) {
      const start = proposalStart.get(id);
      if (start !== undefined) epochs.add(start);
    }

    return {
      drep_id: drep.drep_id,
      votes_cast: votesCast,
      votes_eligible: votesEligible,
      participation_rate: participation,
      raw_govscore: raw,
      adjusted_govscore: raw === null ? null : raw * calculateDampener(drep.amount_lovelace),
      voting_streak_epochs: computeVotingStreak(epochs),
    };
  });
}

export async function loadAll<T>(table: string, columns: string): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += DB_PAGE_SIZE) {
    // Sort by the first two columns (e.g. drep_id, epoch): sorting by drep_id alone isn't a stable order when a
    // DRep has several rows, so pages could skip or repeat rows.
    const [first, second] = columns.split(',').map((c) => c.trim());
    let query = supabaseAdmin.from(table).select(columns).order(first);
    if (second) query = query.order(second);
    const { data, error } = await query.range(from, from + DB_PAGE_SIZE - 1);
    if (error) {
      throw new Error(`Failed to read ${table} for scoring: ${error.message}. Check SUPABASE_SERVICE_ROLE_KEY and table grants (migration 006).`);
    }
    rows.push(...((data ?? []) as T[]));
    if (!data || data.length < DB_PAGE_SIZE) return rows;
  }
}

export async function computeGovScoresForEpoch(epoch: number): Promise<ComputeResult> {
  const [dreps, proposalRows, votes, periods] = await Promise.all([
    loadAll<{ drep_id: string; amount_lovelace: number | string | null }>('dreps', 'drep_id, amount_lovelace'),
    loadAll<{
      proposal_id: string;
      proposed_epoch: number;
      status: string;
      ratified_epoch: number | null;
      expired_epoch: number | null;
      voting_ends_epoch: number | null;
    }>('proposals', 'proposal_id, proposed_epoch, status, ratified_epoch, expired_epoch, voting_ends_epoch'),
    loadAll<{ drep_id: string; proposal_id: string; block_time: string; rationale_url: string | null; rationale_hash: string | null }>(
      'votes',
      'drep_id, proposal_id, block_time, rationale_url, rationale_hash'
    ),
    fetchDRepRegistrationPeriods(),
  ]);

  const votesByDRep = new Map<string, Set<string>>();
  for (const v of votes) {
    const set = votesByDRep.get(v.drep_id) ?? new Set<string>();
    set.add(v.proposal_id);
    votesByDRep.set(v.drep_id, set);
  }

  const sized = dreps.map((d) => ({ drep_id: d.drep_id, amount_lovelace: Number(d.amount_lovelace ?? 0) }));
  // Participation, votes and streak still come from v1 (shown as Stamina and
  // XP); the score itself is GovScore v2, the game's scoring over a career.
  const participation = scoreDReps(sized, proposalRows.map(proposalWindow), votesByDRep, periods, epoch);
  const v2 = new Map(
    processScores(
      sized,
      proposalRows.map((p) => ({ ...proposalWindow(p), expiration: p.voting_ends_epoch })),
      votes.map((v) => {
        const time = Math.floor(new Date(v.block_time).getTime() / 1000);
        return { drep_id: v.drep_id, proposal_id: v.proposal_id, epoch: blockTimeToEpoch(time), time, rationale_url: v.rationale_url, rationale_hash: v.rationale_hash };
      }),
      periods,
      epoch
    ).map((s) => [s.drep_id, s])
  );
  const scores = participation.map((s) => ({ ...s, raw_govscore: v2.get(s.drep_id)?.raw ?? null, adjusted_govscore: v2.get(s.drep_id)?.adjusted ?? null }));

  const computedAt = new Date().toISOString();
  const rows = scores.map((s) => ({ ...s, epoch, computed_at: computedAt }));
  for (let i = 0; i < rows.length; i += DB_PAGE_SIZE) {
    const { error } = await supabaseAdmin
      .from('drep_scores')
      .upsert(rows.slice(i, i + DB_PAGE_SIZE), { onConflict: 'drep_id,epoch' });
    if (error) {
      throw new Error(`Failed to save scores (chunk starting at ${i}): ${error.message}. Re-running is safe; the upsert is idempotent.`);
    }
  }

  const rated = scores.filter((s) => s.participation_rate !== null);
  const avgParticipation =
    rated.length > 0 ? rated.reduce((sum, s) => sum + (s.participation_rate ?? 0), 0) / rated.length : 0;

  console.log(
    JSON.stringify({
      event: 'compute_govscore_complete',
      epoch,
      dreps_scored: scores.length,
      dreps_with_eligible_votes: rated.length,
      avg_participation: avgParticipation,
    })
  );

  return { dreps_scored: scores.length, avg_participation: avgParticipation };
}
