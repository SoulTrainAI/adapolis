/**
 * Proposal Sync Job
 * Fetches proposal (governance action) data from Koios and writes to Supabase
 */

import { fetchAllProposals, type KoiosProposal } from '@/lib/koios';
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
    const proposals = await fetchAllProposals();
    console.log(
      JSON.stringify({
        event: 'proposals_fetched',
        count: proposals.length,
        timestamp: new Date().toISOString(),
      })
    );

    if (proposals.length === 0) {
      console.log(JSON.stringify({ event: 'no_proposals_found', timestamp: new Date().toISOString() }));
      return { synced: 0, errors: 0, duration_ms: Date.now() - startTime };
    }

    // Step 2: Prepare upsert data with field mappings
    const proposalRecords = proposals.map((p: KoiosProposal) => ({
      proposal_id: p.proposal_id,
      tx_hash: p.tx_hash,
      cert_index: p.cert_index,
      proposal_type: mapProposalType(p.action_type),
      action_type: p.action_type,
      title: extractTitleFromMetadata(p.json),
      abstract: extractAbstractFromMetadata(p.json),
      metadata_url: p.url,
      metadata_hash: p.hash,
      metadata: p.json,
      proposed_epoch: p.proposed_epoch,
      submission_block_time: new Date(p.block_time * 1000).toISOString(),
      voting_starts_epoch: p.voting_start_epoch,
      voting_ends_epoch: p.voting_end_epoch,
      expires_at: new Date(p.expires_epoch * 1000 * 432000).toISOString(), // rough conversion
      status: determineProposalStatus(p),
      ratified_epoch: p.ratified_epoch,
      enacted_epoch: p.enacted_epoch,
      expired_epoch: p.expired_epoch,
      updated_at: new Date().toISOString(),
    }));

    // Step 3: Upsert into proposals table (conflict on proposal_id)
    console.log(
      JSON.stringify({
        event: 'upserting_proposals',
        count: proposalRecords.length,
        timestamp: new Date().toISOString(),
      })
    );

    const { error: upsertError } = await supabaseAdmin
      .from('proposals')
      .upsert(proposalRecords, { onConflict: 'proposal_id' });

    if (upsertError) {
      console.error(JSON.stringify({ event: 'proposal_upsert_error', error: upsertError.message }));
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

    return { synced, errors, duration_ms: duration };
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
    TreasuryWithdrawal: 'treasury_withdrawal',
    ParameterChange: 'parameter_change',
    HardForkInitiation: 'hard_fork',
    NoConfidence: 'no_confidence',
    CommitteeUpdate: 'committee_update',
    ConstitutionalAmendment: 'constitution',
    InfoAction: 'info',
  };
  return typeMap[actionType] || actionType.toLowerCase();
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
