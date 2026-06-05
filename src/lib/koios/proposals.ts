/**
 * Proposal fetching functions
 * Fetches governance action data from Koios API
 * @see https://api.koios.rest/#/Governance
 */

import { koiosFetch } from './client';
import {
  KoiosProposal,
  KoiosProposalVote,
  KoiosProposalSchema,
  KoiosProposalVoteSchema,
  validateKoiosListResponse,
} from './types';

/**
 * Fetches all active proposals from Koios
 * Filters to show only proposals currently in voting or active state
 * @see https://api.koios.rest/#/Governance/proposal_list
 * @returns Array of active proposals
 * @throws Error if API request fails
 */
export async function fetchActiveProposals(): Promise<KoiosProposal[]> {
  const response = await koiosFetch<unknown[]>('/proposal_list', {
    method: 'POST',
    body: {},
  });

  const allProposals = validateKoiosListResponse(
    response,
    KoiosProposalSchema,
    '/proposal_list'
  );

  // Filter to active proposals only (currently in voting window)
  const activeProposals = allProposals.filter((p) => p.is_active === true);

  console.log(
    JSON.stringify({
      event: 'proposals_fetched',
      total: allProposals.length,
      active: activeProposals.length,
    })
  );

  return activeProposals;
}

/**
 * Fetches all proposals (active, passed, failed, and expired)
 * Useful for full governance history analysis
 * @see https://api.koios.rest/#/Governance/proposal_list
 * @returns Array of all proposals
 * @throws Error if API request fails
 */
export async function fetchAllProposals(): Promise<KoiosProposal[]> {
  const response = await koiosFetch<unknown[]>('/proposal_list', {
    method: 'POST',
    body: {},
  });

  return validateKoiosListResponse(response, KoiosProposalSchema, '/proposal_list');
}

/**
 * Fetches all votes on a specific proposal
 * Includes votes from DReps, Constitutional Committee, and SPOs
 * @see https://api.koios.rest/#/Governance/proposal_votes
 * @param proposalId - Proposal ID to fetch votes for
 * @returns Array of votes on the proposal
 * @throws Error if API request fails or proposal ID is invalid
 */
export async function fetchProposalVotes(proposalId: string): Promise<KoiosProposalVote[]> {
  const response = await koiosFetch<unknown[]>('/proposal_votes', {
    method: 'POST',
    body: {
      _proposal_id: proposalId,
    },
  });

  return validateKoiosListResponse(response, KoiosProposalVoteSchema, '/proposal_votes');
}

/**
 * Fetches votes for multiple proposals
 * Handles rate limiting by fetching sequentially
 * @param proposalIds - Array of proposal IDs
 * @returns Object mapping proposal ID to array of votes
 * @throws Error if any API request fails
 */
export async function fetchProposalVotesBatch(
  proposalIds: string[]
): Promise<Record<string, KoiosProposalVote[]>> {
  const votes: Record<string, KoiosProposalVote[]> = {};

  for (const proposalId of proposalIds) {
    votes[proposalId] = await fetchProposalVotes(proposalId);
    console.log(
      JSON.stringify({
        event: 'proposal_votes_fetched',
        proposal_id: proposalId,
        vote_count: votes[proposalId].length,
      })
    );
  }

  return votes;
}

/**
 * Filters proposals by action type
 * Useful for domain-specific filtering
 * @param proposals - Array of proposals to filter
 * @param actionType - Action type to filter by (e.g., 'TreasuryWithdrawal', 'InfoAction')
 * @returns Filtered proposals
 */
export function filterProposalsByType(
  proposals: KoiosProposal[],
  actionType: string
): KoiosProposal[] {
  return proposals.filter((p) => p.action_type === actionType);
}

/**
 * Gets voting statistics for a proposal
 * @param votes - Array of votes on a proposal
 * @returns Statistics object with yes/no/abstain counts and percentages
 */
export function getProposalVoteStats(votes: KoiosProposalVote[]): {
  total: number;
  yes: number;
  no: number;
  abstain: number;
  yesPercent: number;
  noPercent: number;
  abstainPercent: number;
} {
  const stats = {
    total: votes.length,
    yes: 0,
    no: 0,
    abstain: 0,
    yesPercent: 0,
    noPercent: 0,
    abstainPercent: 0,
  };

  for (const vote of votes) {
    if (vote.vote === 'Yes') stats.yes++;
    else if (vote.vote === 'No') stats.no++;
    else if (vote.vote === 'Abstain') stats.abstain++;
  }

  if (stats.total > 0) {
    stats.yesPercent = (stats.yes / stats.total) * 100;
    stats.noPercent = (stats.no / stats.total) * 100;
    stats.abstainPercent = (stats.abstain / stats.total) * 100;
  }

  return stats;
}
