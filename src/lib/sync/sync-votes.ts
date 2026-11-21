/**
 * Votes Sync Job
 * Fetches DRep votes from Koios and writes to Supabase
 */

import { z } from 'zod';
import { fetchDRepVotesBatch } from '@/lib/koios';
import { koiosFetch } from '@/lib/koios/client';
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

const KOIOS_PAGE_SIZE = 1000;
const DB_PAGE_SIZE = 1000;

const KoiosBulkVoteSchema = z.object({
  voter_id: z.string(),
  proposal_id: z.string(),
  vote: z.enum(['Yes', 'No', 'Abstain']),
  block_time: z.number().int(),
  vote_tx_hash: z.string(),
  meta_url: z.string().nullable(),
  meta_hash: z.string().nullable(),
});

async function loadIds(table: 'dreps' | 'proposals', column: 'drep_id' | 'proposal_id'): Promise<Set<string>> {
  const ids = new Set<string>();
  for (let from = 0; ; from += DB_PAGE_SIZE) {
    const { data, error } = await supabaseAdmin
      .from(table)
      .select(column)
      .order(column)
      .range(from, from + DB_PAGE_SIZE - 1);
    if (error) {
      throw new Error(`Failed to read ${table}.${column} from Supabase: ${error.message}. Check SUPABASE_SERVICE_ROLE_KEY.`);
    }
    for (const row of (data ?? []) as Array<Record<string, string>>) ids.add(row[column]);
    if (!data || data.length < DB_PAGE_SIZE) return ids;
  }
}

/**
 * Syncs every DRep vote via Koios /vote_list (~32 paged requests) instead of
 * one /drep_votes call per DRep (~1,700 requests at Koios's 1 req/s limit),
 * which is what made the old sync too slow to run in the cron.
 *
 * Votes referencing a DRep or proposal not yet in the database are skipped,
 * since a single foreign-key violation would reject the whole upsert chunk.
 */
export async function syncAllVotes(): Promise<SyncResult & { skipped: number }> {
  const startTime = Date.now();
  const [drepIds, proposalIds] = await Promise.all([
    loadIds('dreps', 'drep_id'),
    loadIds('proposals', 'proposal_id'),
  ]);

  const latest = new Map<string, z.infer<typeof KoiosBulkVoteSchema>>();
  let skipped = 0;

  for (let offset = 0; ; offset += KOIOS_PAGE_SIZE) {
    const raw = await koiosFetch<unknown>(
      `/vote_list?voter_role=eq.DRep&select=voter_id,proposal_id,vote,block_time,vote_tx_hash,meta_url,meta_hash&order=block_time.asc&offset=${offset}&limit=${KOIOS_PAGE_SIZE}`,
      { method: 'GET' }
    );
    const parsed = z.array(KoiosBulkVoteSchema).safeParse(raw);
    if (!parsed.success) {
      throw new Error(
        `Koios /vote_list returned an unexpected shape at offset ${offset}: ${parsed.error.message}. Check https://api.koios.rest/#/Governance/vote_list for schema changes.`
      );
    }

    for (const v of parsed.data) {
      if (!drepIds.has(v.voter_id) || !proposalIds.has(v.proposal_id)) {
        skipped++;
        continue;
      }
      // A DRep may change its vote; rows arrive oldest-first so the last one wins.
      latest.set(`${v.voter_id}:${v.proposal_id}`, v);
    }

    if (parsed.data.length < KOIOS_PAGE_SIZE) break;
  }

  const records = Array.from(latest.values()).map((v) => ({
    drep_id: v.voter_id,
    proposal_id: v.proposal_id,
    vote: v.vote.toLowerCase(),
    rationale_url: v.meta_url,
    rationale_hash: v.meta_hash,
    block_time: new Date(v.block_time * 1000).toISOString(),
    tx_hash: v.vote_tx_hash,
  }));

  let synced = 0;
  for (let i = 0; i < records.length; i += DB_PAGE_SIZE) {
    const chunk = records.slice(i, i + DB_PAGE_SIZE);
    const { error } = await supabaseAdmin.from('votes').upsert(chunk, { onConflict: 'drep_id,proposal_id' });
    if (error) {
      throw new Error(
        `Failed to save votes (chunk starting at ${i}): ${error.message}. Earlier chunks were saved; re-running is safe because the upsert is idempotent.`
      );
    }
    synced += chunk.length;
  }

  await supabaseAdmin
    .from('sync_state')
    .upsert({ entity: 'votes', last_synced_at: new Date().toISOString() }, { onConflict: 'entity' });

  const result = { synced, errors: 0, skipped, duration_ms: Date.now() - startTime };
  console.log(JSON.stringify({ event: 'sync_all_votes_complete', ...result }));
  return result;
}
