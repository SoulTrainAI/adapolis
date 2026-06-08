/**
 * GovScore v1 — Participation Rate Only
 * Computes DRep participation across all eligible governance actions
 */

import { supabaseAdmin } from '@/lib/sync/supabase-admin';

interface DRepScoring {
  drep_id: string;
  amount_lovelace: bigint;
  votes_eligible: number;
  votes_cast: number;
  participation_rate: number | null;
  raw_govscore: number | null;
  adjusted_govscore: number | null;
}

interface ComputeResult {
  dreps_scored: number;
  avg_participation: number;
}

/**
 * Calculates the quadratic ADA-power dampener
 * Formula: dampener = 1 / (1 + log10(ada_m + 1) / 4)
 * Where ada_m is ADA amount in millions
 */
function calculateDampener(amountLovelace: bigint): number {
  const ada = Number(amountLovelace) / 1_000_000_000_000; // Convert lovelace to millions of ADA
  const dampener = 1 / (1 + Math.log10(ada + 1) / 4);
  return dampener;
}

/**
 * Computes GovScore v1 for all registered DReps for a given epoch
 * Participation rate = votes_cast / votes_eligible
 * raw_govscore = participation_rate * 100
 *
 * @param epoch The epoch to score
 * @returns Summary of scoring results
 */
export async function computeGovScoresForEpoch(epoch: number): Promise<ComputeResult> {
  console.log(
    JSON.stringify({
      event: 'compute_govscore_start',
      epoch,
      timestamp: new Date().toISOString(),
    })
  );

  try {
    // Step 1: Get all DReps with their delegation amounts (fetched in batches due to 1000-row limit)
    // Note: is_registered from Koios API may not reflect actual on-chain status for Phase 1
    // For now, include all DReps to enable scoring
    const allDReps: Array<{drep_id: string; is_registered: boolean; expires_epoch: number | null; amount_lovelace: bigint | null}> = [];
    let offset = 0;
    const batchSize = 1000;
    let hasMorDReps = true;

    while (hasMorDReps) {
      const { data: batch, error: drepsError } = await supabaseAdmin
        .from('dreps')
        .select('drep_id, is_registered, expires_epoch, amount_lovelace')
        .range(offset, offset + batchSize - 1);

      if (drepsError) {
        throw new Error(`Failed to fetch DReps at offset ${offset}: ${drepsError.message}`);
      }

      if (!batch || batch.length === 0) {
        hasMorDReps = false;
      } else {
        allDReps.push(...batch);
        if (batch.length < batchSize) {
          hasMorDReps = false;
        }
        offset += batchSize;
      }
    }

    const dreps = allDReps;

    console.log(
      JSON.stringify({
        event: 'dreps_fetched',
        count: dreps.length,
        timestamp: new Date().toISOString(),
      })
    );

    if (dreps.length === 0) {
      console.log(JSON.stringify({ event: 'no_registered_dreps', timestamp: new Date().toISOString() }));
      return { dreps_scored: 0, avg_participation: 0 };
    }

    // Step 2: Get all proposals votable during this epoch
    const { data: proposals, error: proposalsError } = await supabaseAdmin
      .from('proposals')
      .select('proposal_id, proposed_epoch, voting_starts_epoch, voting_ends_epoch, expired_epoch, status');

    if (proposalsError || !proposals) {
      throw new Error(`Failed to fetch proposals: ${proposalsError?.message}`);
    }

    console.log(
      JSON.stringify({
        event: 'proposals_fetched',
        count: proposals.length,
        timestamp: new Date().toISOString(),
      })
    );

    // Step 3: Compute scores for each DRep
    const scoringResults: DRepScoring[] = [];
    let totalParticipation = 0;
    let drepsWithEligibleVotes = 0;

    for (const drep of dreps) {
      // Find proposals eligible for this DRep
      // Include active and passed proposals. If none match, fall back to all proposals
      // for historical voting counting (Phase 1 requirement: score based on actual votes cast)
      let eligibleProposals = proposals.filter((p) => p.status === 'active' || p.status === 'passed');

      // If no active/passed proposals, include all proposals (for historical voting)
      if (eligibleProposals.length === 0) {
        eligibleProposals = proposals;
      }

      const votesEligible = eligibleProposals.length;

      // Count actual votes cast by this DRep on eligible proposals
      const { data: votes, error: votesError } = await supabaseAdmin
        .from('votes')
        .select('proposal_id', { count: 'exact' })
        .eq('drep_id', drep.drep_id)
        .in(
          'proposal_id',
          eligibleProposals.map((p) => p.proposal_id)
        );

      if (votesError) {
        console.error(
          JSON.stringify({
            event: 'vote_fetch_error',
            drep_id: drep.drep_id,
            error: votesError.message,
            timestamp: new Date().toISOString(),
          })
        );
        continue;
      }

      const votesCast = votes?.length || 0;

      // Compute participation rate (null if 0 eligible proposals)
      let participationRate: number | null = null;
      let rawGovscore: number | null = null;
      let adjustedGovscore: number | null = null;

      if (votesEligible > 0) {
        participationRate = votesCast / votesEligible;
        rawGovscore = participationRate * 100;

        // Apply quadratic ADA-power dampening
        const dampener = calculateDampener(drep.amount_lovelace || BigInt(0));
        adjustedGovscore = rawGovscore * dampener;
      }
      // If votesEligible is 0, both remain null (per ROADMAP spec)

      scoringResults.push({
        drep_id: drep.drep_id,
        amount_lovelace: drep.amount_lovelace || BigInt(0),
        votes_eligible: votesEligible,
        votes_cast: votesCast,
        participation_rate: participationRate,
        raw_govscore: rawGovscore,
        adjusted_govscore: adjustedGovscore,
      });

      if (participationRate !== null) {
        totalParticipation += participationRate;
        drepsWithEligibleVotes++;
      }
    }

    console.log(
      JSON.stringify({
        event: 'scores_computed',
        drepsScored: scoringResults.length,
        avgParticipation: scoringResults.length > 0 ? totalParticipation / scoringResults.length : 0,
        timestamp: new Date().toISOString(),
      })
    );

    // Step 4: Upsert into drep_scores table
    const scoresForUpsert = scoringResults.map((result) => ({
      drep_id: result.drep_id,
      epoch,
      raw_govscore: result.raw_govscore,
      adjusted_govscore: result.adjusted_govscore,
      participation_rate: result.participation_rate,
      computed_at: new Date().toISOString(),
    }));

    console.log(
      JSON.stringify({
        event: 'upserting_scores',
        count: scoresForUpsert.length,
        firstRecord: scoresForUpsert[0],
        timestamp: new Date().toISOString(),
      })
    );

    const { error: upsertError } = await supabaseAdmin
      .from('drep_scores')
      .upsert(scoresForUpsert, { onConflict: 'drep_id,epoch' });

    if (upsertError) {
      console.error(
        JSON.stringify({
          event: 'drep_scores_upsert_error',
          error: upsertError.message,
          code: upsertError.code,
          details: upsertError.details,
          firstRecord: scoresForUpsert[0],
          timestamp: new Date().toISOString(),
        })
      );
      throw new Error(`Failed to upsert scores: ${upsertError.message}`);
    }

    console.log(
      JSON.stringify({
        event: 'scores_upserted',
        count: scoresForUpsert.length,
        timestamp: new Date().toISOString(),
      })
    );


    const avgParticipation = drepsWithEligibleVotes > 0 ? totalParticipation / drepsWithEligibleVotes : 0;

    console.log(
      JSON.stringify({
        event: 'compute_govscore_complete',
        drepsScored: scoringResults.length,
        drepsWithEligibleVotes,
        avgParticipation,
        timestamp: new Date().toISOString(),
      })
    );

    return {
      dreps_scored: scoringResults.length,
      avg_participation: avgParticipation,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(
      JSON.stringify({
        event: 'compute_govscore_error',
        error: errorMessage,
        timestamp: new Date().toISOString(),
      })
    );
    throw error;
  }
}
