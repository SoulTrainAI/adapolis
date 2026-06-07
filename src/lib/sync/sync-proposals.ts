/**
 * Proposal Sync Job
 * Fetches proposal (governance action) data from Koios and writes to Supabase
 */

import type { KoiosProposal } from '@/lib/koios';
import { supabaseAdmin } from './supabase-admin';
import type { SyncResult } from './sync-dreps';

/**
 * Syncs all proposals from Koios to Supabase
 * 1. Fetches all proposals
 * 2. Upserts into proposals table
 * 3. Updates sync_state tracking
 * @returns Sync result with counts and duration
 */
export async function syncProposals(): Promise<SyncResult> {
  const startTime = Date.now();
  let synced = 0;
  let errors = 0;
  let upsertError: { message?: string; code?: string; details?: unknown } | null = null;
  let firstRecord: unknown = null;

  try {
    console.log(
      JSON.stringify({
        event: 'sync_proposals_start',
        timestamp: new Date().toISOString(),
      })
    );

    // Step 1: Fetch all proposals from Koios
    console.log(
      JSON.stringify({
        event: 'fetching_proposals',
        timestamp: new Date().toISOString(),
      })
    );

    const { koiosFetch } = await import('@/lib/koios/client');
    const proposalsList = await koiosFetch<KoiosProposal[]>('/proposal_list', {
      method: 'GET',
    });
    console.log(
      JSON.stringify({
        event: 'proposals_fetched',
        count: proposalsList.length,
        timestamp: new Date().toISOString(),
      })
    );

    if (proposalsList.length === 0) {
      console.log(JSON.stringify({ event: 'no_proposals_found', timestamp: new Date().toISOString() }));
      return { synced: 0, errors: 0, duration_ms: Date.now() - startTime };
    }

    // Step 2: Prepare upsert data with field mappings
    const proposalRecords = (proposalsList || []).map((p: KoiosProposal) => ({
      proposal_id: p.proposal_id,
      tx_hash: p.proposal_tx_hash,
      cert_index: p.proposal_index,
      proposal_type: mapProposalType(p.proposal_type),
      action_type: p.proposal_type,
      title: extractTitleFromMetadata(p.meta_json as Record<string, unknown> | null),
      abstract: extractAbstractFromMetadata(p.meta_json as Record<string, unknown> | null),
      metadata_url: p.meta_url,
      metadata_hash: p.meta_hash,
      metadata: p.meta_json,
      proposed_epoch: p.proposed_epoch,
      submission_block_time: new Date(p.block_time * 1000).toISOString(),
      voting_starts_epoch: null,
      voting_ends_epoch: p.expiration,
      expires_at: null,
      status: determineProposalStatus(p),
      ratified_epoch: p.ratified_epoch,
      enacted_epoch: p.enacted_epoch,
      expired_epoch: p.expired_epoch,
      updated_at: new Date().toISOString(),
    }));

    // Step 3: Upsert into proposals table (conflict on proposal_id)
    firstRecord = proposalRecords[0];
    console.log(
      JSON.stringify({
        event: 'upserting_proposals',
        count: proposalRecords.length,
        firstRecord,
        timestamp: new Date().toISOString(),
      })
    );

    const { error: err } = await supabaseAdmin
      .from('proposals')
      .upsert(proposalRecords, { onConflict: 'proposal_id' });

    if (err) {
      upsertError = err;
      console.error(JSON.stringify({ event: 'proposal_upsert_error', error: err.message, code: err.code, details: err.details }));
      errors += proposalRecords.length;
    } else {
      synced = proposalRecords.length;
      console.log(
        JSON.stringify({
          event: 'proposals_upserted',
          count: synced,
          timestamp: new Date().toISOString(),
        })
      );
    }

    // Step 4: Update sync_state
    const { error: syncStateError } = await supabaseAdmin
      .from('sync_state')
      .upsert(
        {
          entity: 'proposals',
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
          entity: 'proposals',
          timestamp: new Date().toISOString(),
        })
      );
    }

    const duration = Date.now() - startTime;
    console.log(
      JSON.stringify({
        event: 'sync_proposals_complete',
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
        event: 'sync_proposals_error',
        error: errorMessage,
        duration_ms: duration,
        timestamp: new Date().toISOString(),
      })
    );
    throw error;
  }
}

/**
 * Maps Koios action_type to our schema proposal_type enum
 */
function mapProposalType(actionType: string): string {
  const typeMap: Record<string, string> = {
    TreasuryWithdrawals: 'treasury_withdrawal',
    ParameterChange: 'parameter_change',
    HardForkInitiation: 'hard_fork',
    NoConfidence: 'no_confidence',
    UpdateCommittee: 'committee_update',
    NewConstitution: 'constitution',
    InfoAction: 'info',
  };
  return typeMap[actionType] || 'info';
}

/**
 * Extracts title from governance metadata JSON
 */
function extractTitleFromMetadata(json: Record<string, unknown> | null): string | null {
  if (!json) return null;
  if (typeof json.title === 'string') return json.title;
  if (typeof json.name === 'string') return json.name;
  return null;
}

/**
 * Extracts abstract from governance metadata JSON
 */
function extractAbstractFromMetadata(json: Record<string, unknown> | null): string | null {
  if (!json) return null;
  if (typeof json.abstract === 'string') return json.abstract;
  if (typeof json.description === 'string') return json.description;
  return null;
}

/**
 * Determines proposal status based on epoch information
 */
function determineProposalStatus(
  proposal: KoiosProposal
): 'active' | 'passed' | 'failed' | 'expired' {
  if (proposal.dropped_epoch !== null) return 'failed';
  if (proposal.expired_epoch !== null) return 'expired';
  if (proposal.ratified_epoch !== null) return 'passed';
  return 'active';
}
