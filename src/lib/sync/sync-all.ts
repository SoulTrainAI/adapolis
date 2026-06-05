/**
 * Sync Orchestrator
 * Runs all sync jobs in sequence
 */

import { syncDReps } from './sync-dreps';
import { syncProposals } from './sync-proposals';
import { syncVotes } from './sync-votes';

export interface SyncSummary {
  dreps: {
    synced: number;
    errors: number;
    duration_ms: number;
  };
  proposals: {
    synced: number;
    errors: number;
    duration_ms: number;
  };
  votes: {
    synced: number;
    errors: number;
    duration_ms: number;
  };
  total_duration_ms: number;
  errors: string[];
}

/**
 * Runs all sync jobs in order: DReps → Proposals → Votes
 * Handles partial failures gracefully — if one job fails,
 * the results from successful jobs are still returned
 * @returns Summary of all sync operations
 */
export async function syncAll(): Promise<SyncSummary> {
  const startTime = Date.now();
  const errors: string[] = [];

  console.log(
    JSON.stringify({
      event: 'sync_all_start',
      timestamp: new Date().toISOString(),
    })
  );

  // Step 1: Sync DReps
  let drepResult = { synced: 0, errors: 0, duration_ms: 0 };
  try {
    console.log(
      JSON.stringify({
        event: 'sync_phase_start',
        phase: 'dreps',
        timestamp: new Date().toISOString(),
      })
    );
    drepResult = await syncDReps();
    console.log(
      JSON.stringify({
        event: 'sync_phase_complete',
        phase: 'dreps',
        synced: drepResult.synced,
        errors: drepResult.errors,
        timestamp: new Date().toISOString(),
      })
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    errors.push(`DReps sync failed: ${errorMessage}`);
    console.error(
      JSON.stringify({
        event: 'sync_phase_error',
        phase: 'dreps',
        error: errorMessage,
        timestamp: new Date().toISOString(),
      })
    );
  }

  // Step 2: Sync Proposals
  let proposalResult = { synced: 0, errors: 0, duration_ms: 0 };
  try {
    console.log(
      JSON.stringify({
        event: 'sync_phase_start',
        phase: 'proposals',
        timestamp: new Date().toISOString(),
      })
    );
    proposalResult = await syncProposals();
    console.log(
      JSON.stringify({
        event: 'sync_phase_complete',
        phase: 'proposals',
        synced: proposalResult.synced,
        errors: proposalResult.errors,
        timestamp: new Date().toISOString(),
      })
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    errors.push(`Proposals sync failed: ${errorMessage}`);
    console.error(
      JSON.stringify({
        event: 'sync_phase_error',
        phase: 'proposals',
        error: errorMessage,
        timestamp: new Date().toISOString(),
      })
    );
  }

  // Step 3: Sync Votes
  let voteResult = { synced: 0, errors: 0, duration_ms: 0 };
  try {
    console.log(
      JSON.stringify({
        event: 'sync_phase_start',
        phase: 'votes',
        timestamp: new Date().toISOString(),
      })
    );
    voteResult = await syncVotes();
    console.log(
      JSON.stringify({
        event: 'sync_phase_complete',
        phase: 'votes',
        synced: voteResult.synced,
        errors: voteResult.errors,
        timestamp: new Date().toISOString(),
      })
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    errors.push(`Votes sync failed: ${errorMessage}`);
    console.error(
      JSON.stringify({
        event: 'sync_phase_error',
        phase: 'votes',
        error: errorMessage,
        timestamp: new Date().toISOString(),
      })
    );
  }

  const totalDuration = Date.now() - startTime;
  const summary: SyncSummary = {
    dreps: drepResult,
    proposals: proposalResult,
    votes: voteResult,
    total_duration_ms: totalDuration,
    errors,
  };

  console.log(
    JSON.stringify({
      event: 'sync_all_complete',
      summary,
      timestamp: new Date().toISOString(),
    })
  );

  return summary;
}
