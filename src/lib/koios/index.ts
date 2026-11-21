/**
 * Koios API Client
 * Main entry point for all Koios API interactions
 *
 * @see https://api.koios.rest/
 */

// Export client functions
export { koiosFetch, checkKoiosHealth, fetchCurrentEpoch } from './client';

// Export types
export type {
  KoiosDRep,
  KoiosDRepInfo,
  KoiosDRepVote,
  KoiosProposal,
  KoiosProposalVote,
  KiosAccountInfo,
} from './types';

export {
  KoiosDRepSchema,
  KoiosDRepInfoSchema,
  KoiosDRepVoteSchema,
  KoiosProposalSchema,
  KoiosProposalVoteSchema,
  KiosAccountInfoSchema,
  validateKoiosResponse,
  validateKoiosListResponse,
} from './types';

// Export DRep functions
export {
  fetchAllDReps,
  fetchDRepInfo,
  fetchDRepInfoBatched,
  fetchDRepVotes,
  fetchDRepVotesBatch,
} from './dreps';

// Export Proposal functions
export {
  fetchActiveProposals,
  fetchAllProposals,
  fetchProposalVotes,
  fetchProposalVotesBatch,
  filterProposalsByType,
  getProposalVoteStats,
} from './proposals';
