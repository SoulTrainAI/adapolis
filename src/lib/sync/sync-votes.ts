/**
 * Votes Sync Job
 * Fetches DRep votes from Koios and writes to Supabase
 */

import { fetchDRepVotesBatch } from '@/lib/koios';
import { supabaseAdmin } from './supabase-admin';
import type { SyncResult } from './sync-dreps';

/**
 * Syncs votes from Koios to Supabase
 * Can sync votes for specific DReps or all DReps in the database
 * 1. Gets list of DRep IDs (provided or fetched from DB)
 * 2. Batch fetches votes for all DReps
 * 3. Upserts into votes table
 * 4. Updates sync_state tracking
 * @param drepIds - Optional array of DRep IDs to sync. If not provided, syncs all DReps in DB
 * @returns Sync result with counts and duration
 */
export async function syncVotes(drepIds?: string[]): Promise<SyncResult> {
  const startTime = Date.now();
  let synced = 0;
  let errors = 0;

  try {
    console.log(
      JSON.stringify({
        event: 'sync_votes_start',
        drepCount: drepIds?.length,
        timestamp: new Date().toISOString(),
      })
    );

    // Step 1: Get DRep IDs if not provided
    let targetDRepIds = drepIds;
    if (!targetDRepIds) {
      console.log(
        JSON.stringify({
          event: 'fetching_drep_ids_from_db',
          timestamp: new Date().toISOString(),
        })
      );
      const { data: dreps, error: fetchError } = await supabaseAdmin
        .from('dreps')
        .select('drep_id');

      if (fetchError || !dreps) {
        throw new Error(`Failed to fetch DRep IDs from database: ${fetchError?.message}`);
      }

      targetDRepIds = dreps.map((d) => d.drep_id);
      console.log(
        JSON.stringify({
          event: 'drep_ids_fetched',
          count: targetDRepIds.length,
          timestamp: new Date().toISOString(),
        })
      );
    }

    if (targetDRepIds.length === 0) {
      console.log(JSON.stringify({ event: 'no_dreps_to_sync_votes', timestamp: new Date().toISOString() }));
      return { synced: 0, errors: 0, duration_ms: Date.now() - startTime };
    }

    // Step 2: Batch fetch votes for all DReps
    console.log(
      JSON.stringify({
        event: 'fetching_drep_votes',
        drepCount: targetDRepIds.length,
        timestamp: new Date().toISOString(),
      })
    );
    const votesByDRep = await fetchDRepVotesBatch(targetDRepIds);

    // Step 3: Flatten votes into records for upsert
    const voteRecords = [];
    let totalVotes = 0;

    for (const [drepId, votes] of Object.entries(votesByDRep)) {
      for (const vote of votes) {
        voteRecords.push({
          drep_id: drepId,
          proposal_id: vote.proposal_id,
          vote: vote.vote.toLowerCase(),
          rationale_url: null,
          rationale_hash: null,
          rationale: null,
          block_time: new Date(vote.block_time * 1000).toISOString(),
          tx_hash: vote.vote_tx_hash,
        });
        totalVotes++;
      }
    }

    console.log(
      JSON.stringify({
        event: 'votes_fetched',
        totalVotes,
        timestamp: new Date().toISOString(),
      })
    );

    if (voteRecords.length === 0) {
      console.log(JSON.stringify({ event: 'no_votes_found', timestamp: new Date().toISOString() }));
      return { synced: 0, errors: 0, duration_ms: Date.now() - startTime };
    }

    // Step 4: Upsert into votes table (conflict on drep_id + proposal_id)
    console.log(
      JSON.stringify({
        event: 'upserting_votes',
        count: voteRecords.length,
        timestamp: new Date().toISOString(),
      })
    );

    const { error: upsertError } = await supabaseAdmin
      .from('votes')
      .upsert(voteRecords, { onConflict: 'drep_id,proposal_id' });

    if (upsertError) {
      console.error(JSON.stringify({ event: 'vote_upsert_error', error: upsertError.message }));
      errors += voteRecords.length;
    } else {
      synced = voteRecords.length;
      console.log(
        JSON.stringify({
          event: 'votes_upserted',
          count: synced,
          timestamp: new Date().toISOString(),
        })
      );
    }

    // Step 5: Update sync_state
    const { error: syncStateError } = await supabaseAdmin
      .from('sync_state')
      .upsert(
        {
          entity: 'votes',
          last_synced_at: new Date().toISOString(),
        },
        { onConflict: 'entity' }
      );

    if (syncStateError) {
      console.error(
        JSON.stringify({ event: 'sync_state_update_error', error: syncStateError.message })
      );
    } else {
      console.log(
        JSON.stringify({
          event: 'sync_state_updated',
          entity: 'votes',
          timestamp: new Date().toISOString(),
        })
      );
    }

    const duration = Date.now() - startTime;
    console.log(
      JSON.stringify({
        event: 'sync_votes_complete',
        synced,
        errors,
        duration_ms: duration,
        timestamp: new Date().toISOString(),
      })
    );

    return { synced, errors, duration_ms: duration };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(
      JSON.stringify({
        event: 'sync_votes_error',
        error: errorMessage,
        duration_ms: duration,
        timestamp: new Date().toISOString(),
      })
    );
    throw error;
  }
}
