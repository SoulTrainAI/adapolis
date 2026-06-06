/**
 * DRep fetching functions
 * Fetches DRep data from Koios API for the Scoreboard
 * @see https://api.koios.rest/#/Governance
 */

import { koiosFetch } from './client';
import {
  KoiosDRep,
  KoiosDRepInfo,
  KoiosDRepVote,
  KoiosDRepSchema,
  KoiosDRepInfoSchema,
  KoiosDRepVoteSchema,
  validateKoiosListResponse,
} from './types';

/**
 * Fetches all active DReps from Koios
 * Handles pagination automatically to fetch the complete list
 * @see https://api.koios.rest/#/Governance/drep_list
 * @returns Array of all active DReps
 * @throws Error if API request fails
 */
export async function fetchAllDReps(): Promise<KoiosDRep[]> {
  const allDReps: KoiosDRep[] = [];
  let offset = 0;
  const limit = 100; // Koios page size
  let hasMore = true;

  while (hasMore) {
    const response = await koiosFetch<unknown[]>('/drep_list', {
      method: 'POST',
      body: {
        _offset: offset,
        _limit: limit,
      },
    });

    const dreps = validateKoiosListResponse(response, KoiosDRepSchema, '/drep_list');

    allDReps.push(...dreps);

    // If we got fewer results than the limit, we've reached the end
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

  return allDReps;
}

/**
 * Fetches detailed info for a batch of DReps
 * Includes delegation amounts and metadata URLs
 * @see https://api.koios.rest/#/Governance/drep_info
 * @param drepIds - Array of DRep IDs to fetch (max 50 recommended for performance)
 * @returns Array of DRep info objects
 * @throws Error if API request fails or contains invalid DRep IDs
 */
export async function fetchDRepInfo(drepIds: string[]): Promise<KoiosDRepInfo[]> {
  if (drepIds.length === 0) {
    return [];
  }

  if (drepIds.length > 50) {
    throw new Error(
      `fetchDRepInfo: maximum 50 DReps per request, got ${drepIds.length}. Consider batching.`
    );
  }

  const response = await koiosFetch<unknown[]>('/drep_info', {
    method: 'POST',
    body: {
      _drep_ids: drepIds,
    },
  });

  return validateKoiosListResponse(response, KoiosDRepInfoSchema, '/drep_info');
}

/**
 * Fetches detailed info for a batch of DReps with automatic batching
 * Splits requests into batches of 50 to respect API limits
 * @param drepIds - Array of DRep IDs (can be any size)
 * @returns Array of DRep info objects for all requested DReps
 * @throws Error if API request fails
 */
export async function fetchDRepInfoBatched(drepIds: string[]): Promise<KoiosDRepInfo[]> {
  const batchSize = 50;
  const batches: string[][] = [];

  for (let i = 0; i < drepIds.length; i += batchSize) {
    batches.push(drepIds.slice(i, i + batchSize));
  }

  const results: KoiosDRepInfo[] = [];

  for (const batch of batches) {
    const batchResults = await fetchDRepInfo(batch);
    results.push(...batchResults);
  }

  return results;
}

/**
 * Fetches all votes cast by a specific DRep
 * @see https://api.koios.rest/#/Governance/voter_proposal_list
 * @param drepId - DRep ID to fetch votes for
 * @returns Array of votes cast by the DRep
 * @throws Error if API request fails or DRep ID is invalid
 */
export async function fetchDRepVotes(drepId: string): Promise<KoiosDRepVote[]> {
  const response = await koiosFetch<unknown[]>(`/drep_votes?_drep_id=${drepId}`, {
    method: 'GET',
  });

  return validateKoiosListResponse(response, KoiosDRepVoteSchema, '/drep_votes');
}

/**
 * Fetches votes for multiple DReps
 * Handles rate limiting by fetching sequentially
 * @param drepIds - Array of DRep IDs to fetch votes for
 * @returns Object mapping DRep ID to array of votes
 * @throws Error if any API request fails
 */
export async function fetchDRepVotesBatch(
  drepIds: string[]
): Promise<Record<string, KoiosDRepVote[]>> {
  const votes: Record<string, KoiosDRepVote[]> = {};

  for (const drepId of drepIds) {
    votes[drepId] = await fetchDRepVotes(drepId);
    console.log(
      JSON.stringify({
        event: 'drep_votes_fetched',
        drep_id: drepId,
        vote_count: votes[drepId].length,
      })
    );
  }

  return votes;
}
