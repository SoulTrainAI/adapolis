/**
 * Confidence adjustment for GovScore, shared by the server and the browser.
 */

/** Two-sided 95% normal quantile for the Wilson bound */
const WILSON_Z = 1.96;
/** Fewer eligible actions than this and the score is labelled provisional */
export const PROVISIONAL_BELOW_ELIGIBLE = 10;

/** Lower bound of the Wilson score interval for `successes` out of `trials`. */
export function wilsonLowerBound(successes: number, trials: number, z = WILSON_Z): number {
  if (trials <= 0) return 0;
  const p = successes / trials;
  const z2 = z * z;
  const bound = (p + z2 / (2 * trials) - z * Math.sqrt((p * (1 - p)) / trials + z2 / (4 * trials * trials))) / (1 + z2 / trials);
  return Math.max(0, bound);
}
