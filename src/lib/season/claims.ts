/**
 * Who may mint which season card (docs/GAME.md 2.3, Jason 2026-11-28). Pure,
 * so finalize.ts and the tests share it.
 *
 *  - Every DRep who voted at least once that season has a card: a DRep
 *    All-Star card if they finished top 10, otherwise a basic Season Card.
 *  - The DRep may mint 5 of their own card.
 *  - Each of the top 25 prize-eligible global teams may mint 1 card per pick
 *    (the slot's current DRep, or the DRep it replaced if only they played).
 *  - The ADApolis house wallet mints 1 of every card: the full-set archive.
 */

export const DREP_COPIES = 5;
export const ALL_STARS = 10;
export const PRIZE_TEAMS = 25;
/** claimant for the house copy of every card. */
export const HOUSE_CLAIMANT = 'adapolis';

export type ClaimantType = 'drep' | 'team' | 'delegator' | 'house';

export interface SeasonClaim {
  season_number: number;
  drep_id: string;
  claimant: string;
  claimant_type: ClaimantType;
  copies: number;
  claim_closes_at: string;
}

export interface ClaimInputs {
  season_number: number;
  closes: string;
  /** DReps that voted this season (each has a card). */
  played: string[];
  /** Top prize-eligible teams in order; only the first PRIZE_TEAMS count. */
  prizeTeams: Array<{ stake_address: string; picks: Array<{ drep_id: string; swapped_from?: string | null }> }>;
}

export function buildSeasonClaims(input: ClaimInputs): SeasonClaim[] {
  const base = { season_number: input.season_number, claim_closes_at: input.closes };
  const played = new Set(input.played);
  const claims: SeasonClaim[] = [];
  for (const drep_id of input.played) {
    claims.push({ ...base, drep_id, claimant: drep_id, claimant_type: 'drep', copies: DREP_COPIES });
    claims.push({ ...base, drep_id, claimant: HOUSE_CLAIMANT, claimant_type: 'house', copies: 1 });
  }
  for (const team of input.prizeTeams.slice(0, PRIZE_TEAMS)) {
    const got = new Set<string>();
    for (const pick of team.picks) {
      const drep = played.has(pick.drep_id) ? pick.drep_id : pick.swapped_from && played.has(pick.swapped_from) ? pick.swapped_from : null;
      if (!drep || got.has(drep)) continue;
      got.add(drep);
      claims.push({ ...base, drep_id: drep, claimant: team.stake_address, claimant_type: 'team', copies: 1 });
    }
  }
  return claims;
}
