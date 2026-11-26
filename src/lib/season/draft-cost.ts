/**
 * Draft Cost (Jason, 2026-11-25): each DRep costs 1–7 gold stars, set by
 * their Projected Points, and a 5-DRep team may spend at most 20 stars (Jason, 2026-11-26; was 25).
 * A pick's cost is fixed when it is drafted, like the underdog multiplier.
 * Projected Points are a process metric, so cost never depends on how a
 * DRep votes (Cardinal Rule).
 */

export const TEAM_STAR_BUDGET = 20;
export const MAX_STARS = 7;

/** ≤25 → 1, 26–50 → 2, 51–100 → 3, 101–150 → 4, 151–200 → 5, 201–250 → 6, over 250 → 7. No projection yet → 1. */
export function draftCost(projection: number | null | undefined): number {
  if (projection === null || projection === undefined || !Number.isFinite(projection)) return 1;
  const p = Math.round(projection);
  if (p <= 25) return 1;
  if (p <= 50) return 2;
  if (p <= 100) return 3;
  if (p <= 150) return 4;
  if (p <= 200) return 5;
  if (p <= 250) return 6;
  return MAX_STARS;
}

export function teamCost(costs: number[]): number {
  return costs.reduce((a, b) => a + b, 0);
}
