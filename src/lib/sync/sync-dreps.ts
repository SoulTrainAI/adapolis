/**
 * DRep Sync Job
 * Fetches DRep data from Koios and writes to Supabase
 */

import { fetchDRepInfoBatched, type KoiosDRep } from '@/lib/koios';
import { supabaseAdmin } from './supabase-admin';

export interface SyncResult {
  synced: number;
  errors: number;
  duration_ms: number;
}

/**
 * Syncs all DReps from Koios to Supabase
 * 1. Fetches list of all active DReps
 * 2. Batch fetches detailed info (delegation amounts, metadata)
 * 3. Upserts into dreps table
 * 4. Updates sync_state tracking
 * @returns Sync result with counts and duration
 */
export async function syncDReps(): Promise<SyncResult> {
  const startTime = Date.now();
  let synced = 0;
  let errors = 0;

  try {
    console.log(JSON.stringify({ event: 'sync_dreps_start', timestamp: new Date().toISOString() }));

    // Step 1: Fetch all active DReps from Koios
    // NOTE: Using raw Koios client instead of wrapper because of response format
    console.log(JSON.stringify({ event: 'fetching_drep_list', timestamp: new Date().toISOString() }));
    const { koiosFetch } = await import('@/lib/koios/client');

    interface DRepFromApi {
      drep_id: string;
      hex: string;
      has_script: boolean;
      registered: boolean;
    }

    const allDReps: DRepFromApi[] = [];
    let offset = 0;
    const limit = 100;
    let hasMore = true;

    while (hasMore) {
      console.log(JSON.stringify({ event: 'drep_fetch_iteration', offset, limit }));

      const response = await koiosFetch<{ value: unknown[]; Count: number }>(
        `/drep_list?offset=${offset}&limit=${limit}`,
        { method: 'POST' }
      );

      console.log(
        JSON.stringify({
          event: 'drep_response_received',
          hasValue: !!response.value,
          valueType: typeof response.value,
          valueIsArray: Array.isArray(response.value),
          valueLength: (response.value as unknown[])?.length || 0,
          count: response.Count,
        })
      );

      const dreps = ((response.value as unknown[]) || []).map((d: unknown) => {
        const dObj = d as Record<string, unknown>;
        return {
          drep_id: dObj.drep_id as string,
          hex: dObj.hex as string,
          has_script: dObj.has_script as boolean,
          registered: dObj.registered as boolean,
        };
      });

      console.log(JSON.stringify({ event: 'drep_mapped', count: dreps.length }));

      allDReps.push(...dreps);

      if (dreps.length < limit) {
        hasMore = false;
      } else {
        offset += limit;
      }

      console.log(
        JSON.stringify({
          event: 'drep_list_paginated',
          offset,
          fetched: dreps.length,
          total: allDReps.length,
        })
      );
    }

    const drepList = allDReps;
    console.log(
      JSON.stringify({
        event: 'drep_list_fetched',
        count: drepList.length,
        timestamp: new Date().toISOString(),
      })
    );

    if (drepList.length === 0) {
      console.log(JSON.stringify({ event: 'no_dreps_found', timestamp: new Date().toISOString() }));
      return { synced: 0, errors: 0, duration_ms: Date.now() - startTime };
    }

    // Step 2: Batch fetch detailed DRep info
    const drepIds = drepList.map((d) => d.drep_id);
    console.log(
      JSON.stringify({
        event: 'fetching_drep_info',
        count: drepIds.length,
        timestamp: new Date().toISOString(),
      })
    );
    const drepInfoList = await fetchDRepInfoBatched(drepIds);

    console.log(
      JSON.stringify({
        event: 'drep_info_fetched',
        count: drepInfoList.length,
        timestamp: new Date().toISOString(),
      })
    );

    // Step 3: Build map of detailed info for lookup
    const infoMap = new Map(drepInfoList.map((info) => [info.drep_id, info]));
    console.log(
      JSON.stringify({
        event: 'drep_info_map_built',
        mapSize: infoMap.size,
      })
    );

    // Step 4: Prepare upsert data with field mappings
    console.log(JSON.stringify({ event: 'preparing_drep_records', count: drepList.length }));

    const drepRecords = drepList.map((drep: KoiosDRep, index: number) => {
      const info = infoMap.get(drep.drep_id);
      const record = {
        drep_id: drep.drep_id,
        hex_id: drep.hex,
        is_script: drep.has_script,
        is_registered: drep.registered,
        deposit_lovelace: drep.deposit ? BigInt(drep.deposit) : BigInt(0), // Optional in drep_list
        active_epoch: null, // Not available in list response, only in info
        expires_epoch: drep.expires_epoch_no ?? null, // Optional in drep_list
        amount_lovelace: info ? BigInt(info.amount) : BigInt(0),
        delegator_count: null, // Not directly available, will be calculated from delegations
        voting_anchor_url: info?.url ?? null,
        voting_anchor_hash: info?.hash ?? null,
        metadata: info?.json ?? null,
        updated_at: new Date().toISOString(),
      };

      if (index === 0) {
        console.log(JSON.stringify({ event: 'sample_drep_record', record: JSON.stringify(record) }));
      }

      return record;
    });

    console.log(
      JSON.stringify({
        event: 'drep_records_prepared',
        count: drepRecords.length,
      })
    );

    // Step 5: Upsert into dreps table (conflict on drep_id)
    console.log(
      JSON.stringify({
        event: 'upserting_dreps',
        count: drepRecords.length,
        timestamp: new Date().toISOString(),
      })
    );

    const { error: upsertError } = await supabaseAdmin
      .from('dreps')
      .upsert(drepRecords, { onConflict: 'drep_id' });

    if (upsertError) {
      console.error(JSON.stringify({ event: 'drep_upsert_error', error: upsertError.message }));
      errors += drepRecords.length;
    } else {
      synced = drepRecords.length;
      console.log(
        JSON.stringify({
          event: 'dreps_upserted',
          count: synced,
          timestamp: new Date().toISOString(),
        })
      );
    }

    // Step 6: Update sync_state
    const { error: syncStateError } = await supabaseAdmin
      .from('sync_state')
      .upsert(
        {
          entity: 'dreps',
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
          entity: 'dreps',
          timestamp: new Date().toISOString(),
        })
      );
    }

    const duration = Date.now() - startTime;
    console.log(
      JSON.stringify({
        event: 'sync_dreps_complete',
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
        event: 'sync_dreps_error',
        error: errorMessage,
        duration_ms: duration,
        timestamp: new Date().toISOString(),
      })
    );
    throw error;
  }
}
