/**
 * Koios API Response Types
 * Validated with Zod schemas for runtime safety
 */

import { z } from 'zod';

// ============================================================================
// DREP TYPES
// ============================================================================

/**
 * DRep from /drep_list endpoint
 * @see https://api.koios.rest/#/Governance/drep_list
 */
export const KoiosDRepSchema = z.object({
  drep_id: z.string(),
  hex: z.string(),
  has_script: z.boolean(),
  registered: z.boolean(),
});

export type KoiosDRep = z.infer<typeof KoiosDRepSchema>;

/**
 * DRep info from /drep_info endpoint
 * Contains additional delegation and voting information
 * @see https://api.koios.rest/#/Governance/drep_info
 */
export const KoiosDRepInfoSchema = z.object({
  drep_id: z.string(),
  hex: z.string(),
  has_script: z.boolean(),
  drep_status: z.string(),
  deposit: z.string().nullable(),
  amount: z.string(),
  active: z.boolean(),
  expires_epoch_no: z.number().nullable(),
  meta_url: z.string().nullable(),
  meta_hash: z.string().nullable(),
  live_delegator_count: z.number().int().nonnegative().nullable().optional(),
});

export type KoiosDRepInfo = z.infer<typeof KoiosDRepInfoSchema>;

/**
 * Vote cast by a DRep from /drep_votes endpoint
 * @see https://api.koios.rest/#/Governance/drep_votes
 */
export const KoiosDRepVoteSchema = z.object({
  proposal_id: z.string(),
  proposal_tx_hash: z.string(),
  proposal_index: z.number(),
  vote_tx_hash: z.string(),
  block_time: z.number(),
  vote: z.enum(['Yes', 'No', 'Abstain']),
  meta_url: z.string().nullable(),
  meta_hash: z.string().nullable(),
});

export type KoiosDRepVote = z.infer<typeof KoiosDRepVoteSchema>;

// ============================================================================
// PROPOSAL TYPES
// ============================================================================

/**
 * Proposal (governance action) from /proposal_list endpoint
 * @see https://api.koios.rest/#/Governance/proposal_list
 */
export const KoiosProposalSchema = z.object({
  block_time: z.number(),
  proposal_id: z.string(),
  proposal_tx_hash: z.string(),
  proposal_index: z.number(),
  proposal_type: z.string(),
  proposal_description: z.unknown(),
  deposit: z.string(),
  return_address: z.string(),
  proposed_epoch: z.number(),
  ratified_epoch: z.number().nullable(),
  enacted_epoch: z.number().nullable(),
  dropped_epoch: z.number().nullable(),
  expired_epoch: z.number().nullable(),
  expiration: z.number(),
  meta_url: z.string(),
  meta_hash: z.string(),
  meta_json: z.unknown(),
  meta_comment: z.string().nullable(),
  meta_language: z.string(),
  meta_is_valid: z.boolean(),
  withdrawal: z.array(z.unknown()),
  param_proposal: z.record(z.string(), z.unknown()),
});

export type KoiosProposal = z.infer<typeof KoiosProposalSchema>;

/**
 * Individual vote on a proposal
 * @see https://api.koios.rest/#/Governance/proposal_votes
 */
export const KoiosProposalVoteSchema = z.object({
  block_time: z.number(),
  voter_role: z.enum(['ConstitutionalCommittee', 'DRep', 'SPO']),
  voter_id: z.string(),
  voter_hex: z.string(),
  voter_has_script: z.boolean(),
  vote: z.enum(['Yes', 'No', 'Abstain']),
  meta_url: z.string().nullable(),
  meta_hash: z.string().nullable(),
});

export type KoiosProposalVote = z.infer<typeof KoiosProposalVoteSchema>;

// ============================================================================
// DELEGATION TYPES
// ============================================================================

/**
 * Account info from /account_info endpoint
 * Used to fetch delegation information for stake addresses
 * @see https://api.koios.rest/#/Account/account_info
 */
export const KiosAccountInfoSchema = z.object({
  status: z.enum(['active', 'inactive']),
  delegated_drep: z.string().nullable(), // DRep ID if delegated
  delegated_pool: z.string().nullable(), // Pool ID if delegated to pool
  total_balance: z.string(), // Total ADA balance (lovelace as string)
  utxo: z.string(), // UTXO balance
  reserves: z.string(), // Rewards reserves
  rewards: z.string(), // Total rewards
  withdrawals: z.string(), // Total withdrawals
});

export type KiosAccountInfo = z.infer<typeof KiosAccountInfoSchema>;

// ============================================================================
// PAGINATION & LISTING TYPES
// ============================================================================

/**
 * Parameters for paginated Koios endpoints
 */
export interface KoiosPaginationParams {
  offset?: number;
  limit?: number;
}

/**
 * Response format from list endpoints (typically returned as array)
 * Koios returns arrays directly, no wrapper object
 */
export type KoiosListResponse<T> = T[];

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validates a Koios response against a Zod schema
 * @param data - The response data to validate
 * @param schema - The Zod schema to validate against
 * @param endpoint - The endpoint for error messaging
 * @returns The validated data
 * @throws ZodError with detailed validation info
 */
export function validateKoiosResponse<T>(
  data: unknown,
  schema: z.ZodSchema<T>,
  endpoint: string
): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(
        `Invalid Koios response from ${endpoint}: ${error.message}. Data: ${JSON.stringify(data).substring(0, 200)}`
      );
    }
    throw error;
  }
}

/**
 * Validates a list of responses against a Zod schema
 * @param data - The array response to validate
 * @param schema - The Zod schema for individual items
 * @param endpoint - The endpoint for error messaging
 * @returns The validated array
 */
export function validateKoiosListResponse<T>(
  data: unknown,
  schema: z.ZodSchema<T>,
  endpoint: string
): T[] {
  if (!Array.isArray(data)) {
    throw new Error(
      `Expected array response from ${endpoint}, got ${typeof data}`
    );
  }

  try {
    return z.array(schema).parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(
        `Invalid Koios list response from ${endpoint}: ${error.message}`
      );
    }
    throw error;
  }
}
