/**
 * Draft Cost (Jason, 2026-11-26): each DRep costs 1–5 gold stars, in
 * proportion to their Projected Points, and a 5-DRep team may spend at most
 * 10 stars. One star is worth (99th-percentile projection among active DReps
 * ÷ 5), so prices rescale every season as points and the DRep count change,
 * and every star buys roughly the same expected points (no dominant team).
 * A pick's cost is fixed when drafted. Projected Points are a process metric,
 * so cost never depends on how a DRep votes (Cardinal Rule).
 */

export const TEAM_STAR_BUDGET = 10;
export const MAX_STARS = 5;
/** Floor so a quiet season (few points) can't make every star worth almost nothing. */
const MIN_POINTS_PER_STAR = 10;

/** Projected points one star is worth this season. */
export function pointsPerStar(projections: Array<number | null | undefined>): number {
  const active = projections.filter((p): p is number => typeof p === 'number' && p > 0).sort((a, b) => a - b);
  if (active.length === 0) return MIN_POINTS_PER_STAR;
  const p99 = active[Math.min(active.length - 1, Math.floor(0.99 * active.length))];
  return Math.max(MIN_POINTS_PER_STAR, p99 / MAX_STARS);
}

/** Stars for one DRep: projected points ÷ points per star, rounded up, 1–5. No projection → 1 (a long shot). */
export function draftCost(projection: number | null | undefined, perStar: number): number {
  if (projection === null || projection === undefined || !Number.isFinite(projection) || projection <= 0) return 1;
  return Math.max(1, Math.min(MAX_STARS, Math.ceil(projection / perStar)));
}

export function teamCost(costs: number[]): number {
  return costs.reduce((a, b) => a + b, 0);
}
