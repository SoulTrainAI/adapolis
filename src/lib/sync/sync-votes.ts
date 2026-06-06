/**
 * Votes Sync Job
 * Fetches DRep votes from Koios and writes to Supabase
 */

import { fetchDRepVotesBatch } from '@/lib/koios';
import { supabaseAdmin } from './supabase-admin';
import type { SyncResult } from './sync-dreps';

interface SyncVotesOptions {
  limit?: number;
  offset?: number;
}

/**
 * Syncs votes from Koios to Supabase
 * Can sync votes for specific DReps or paginated batches from the database
 * 1. Gets list of DRep IDs (provided or fetched from DB with pagination)
 * 2. Batch fetches votes for all DReps
 * 3. Upserts into votes table
 * 4. Updates sync_state tracking
 * @param drepIds - Optional array of DRep IDs to sync. If not provided, syncs paginated DReps
 * @param options - Pagination options { limit: number (default 50), offset: number (default 0) }
 * @returns Sync result with counts and duration
 */
export async function syncVotes(
  drepIds?: string[],
  options?: SyncVotesOptions
): Promise<SyncResult> {
  const startTime = Date.now();
  let synced = 0;
  let errors = 0;
  let upsertError: { message?: string; code?: string; details?: unknown } | null = null;
  let firstRecord: unknown = null;
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;

  try {
    console.log(
      JSON.stringify({
        event: 'sync_votes_start',
        drepCount: drepIds?.length,
        pagination: { limit, offset },
        timestamp: new Date().toISOString(),
      })
    );

    // Step 1: Get DRep IDs if not provided
    let targetDRepIds = drepIds;
    if (!targetDRepIds) {
      console.log(
        JSON.stringify({
          event: 'fetching_drep_ids_from_db',
          limit,
          offset,
          timestamp: new Date().toISOString(),
        })
      );
      const { data: dreps, error: fetchError } = await supabaseAdmin
        .from('dreps')
        .select('drep_id')
        .not('drep_id', 'like', 'drep_test%')
        .range(offset, offset + limit - 1);

      if (fetchError || !dreps) {
        throw new Error(`Failed to fetch DRep IDs from database: ${fetchError?.message}`);
      }

      targetDRepIds = dreps.map((d) => d.drep_id);
      console.log(
        JSON.stringify({
          event: 'drep_ids_fetched',
          count: targetDRepIds.length,
          limit,
          offset,
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

    // Step 4: Deduplicate votes by (drep_id, proposal_id) — keep most recent (last occurrence)
    const seen = new Map<string, (typeof voteRecords)[0]>();
    for (const record of voteRecords) {
      const key = `${record.drep_id}:${record.proposal_id}`;
      seen.set(key, record);
    }
    const dedupedRecords = Array.from(seen.values());

    console.log(
      JSON.stringify({
        event: 'votes_deduplicated',
        original: voteRecords.length,
        deduped: dedupedRecords.length,
        timestamp: new Date().toISOString(),
      })
    );

    // Step 5: Upsert into votes table (conflict on drep_id + proposal_id)
    firstRecord = dedupedRecords[0];
    console.log(
      JSON.stringify({
        event: 'upserting_votes',
        count: dedupedRecords.length,
        firstRecord,
        timestamp: new Date().toISOString(),
      })
    );

    const { error: err } = await supabaseAdmin
      .from('votes')
      .upsert(dedupedRecords, { onConflict: 'drep_id,proposal_id' });

    if (err) {
      upsertError = err;
      console.error(JSON.stringify({ event: 'vote_upsert_error', error: err.message, code: err.code, details: err.details }));
      errors += dedupedRecords.length;
    } else {
      synced = dedupedRecords.length;
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

    const result: SyncResult = { synced, errors, duration_ms: duration };
    if (upsertError) {
      result.error = {
        message: upsertError.message || 'Unknown error',
        code: upsertError.code,
        details: upsertError.details,
        firstRecord,
      };
    }
    return result;
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
