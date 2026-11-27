/**
 * DRep Class: who backs a DRep, from a few very large wallets to a crowd of
 * small ones, read from delegated ADA ÷ delegators (the average delegation).
 * Fixed ADA thresholds, not percentiles, so a minted card's class means the
 * same thing in every season. A trait only: it never changes anyone's points.
 */

export interface DRepClass {
  id: string;
  label: string;
  /** Lucide icon name, mapped to a component in the UI. */
  icon: string;
  /** Average ADA per delegator at or above this. */
  min_avg_ada: number;
  blurb: string;
}

/** From the most whale-backed to the most crowd-backed. */
export const DREP_CLASSES: DRepClass[] = [
  { id: 'whale_watcher', label: 'Whale Watcher', icon: 'Fish', min_avg_ada: 250_000, blurb: 'Backed by whales: the average delegation is 250,000 ADA or more.' },
  { id: 'heavy_weight', label: 'Heavy Weight', icon: 'Dumbbell', min_avg_ada: 75_000, blurb: 'Big wallets carry the weight: 75,000–250,000 ADA per delegator on average.' },
  { id: 'power_player', label: 'Power Player', icon: 'Zap', min_avg_ada: 30_000, blurb: 'Well-funded backers: 30,000–75,000 ADA per delegator on average.' },
  { id: 'coalition_builder', label: 'Coalition Builder', icon: 'Handshake', min_avg_ada: 12_000, blurb: 'A balanced mix of big and small wallets: 12,000–30,000 ADA per delegator on average.' },
  { id: 'peoples_hero', label: "People's Hero", icon: 'HeartHandshake', min_avg_ada: 4_000, blurb: 'Carried by everyday holders: 4,000–12,000 ADA per delegator on average.' },
  { id: 'freedom_fighter', label: 'Freedom Fighter', icon: 'Flag', min_avg_ada: 1_000, blurb: 'A movement of small wallets: 1,000–4,000 ADA per delegator on average.' },
  { id: 'rabble_rouser', label: 'Rabble Rouser', icon: 'Megaphone', min_avg_ada: 0, blurb: 'A crowd of the smallest wallets: under 1,000 ADA per delegator on average.' },
];

export interface ClassResult {
  id: string;
  label: string;
  /** Delegated ADA ÷ delegators. */
  avg_ada: number;
}

/** The DRep's class, or null with no delegators. */
export function classFor(ada: number, delegators: number): ClassResult | null {
  if (!(delegators > 0) || !(ada >= 0)) return null;
  const avg = ada / delegators;
  const c = DREP_CLASSES.find((k) => avg >= k.min_avg_ada)!;
  return { id: c.id, label: c.label, avg_ada: Math.round(avg) };
}
