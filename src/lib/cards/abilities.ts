/**
 * Card abilities: published rules, shared by the card engine and the
 * methodology page. Every rule counts how a DRep does the job (showing up,
 * explaining, voting early). None looks at which way they voted or whether
 * a proposal passed (Cardinal Rule).
 */

export type AbilityTier = 1 | 2 | 3;

export const TIER_NAMES: Record<AbilityTier, string> = { 1: 'Bronze', 2: 'Silver', 3: 'Gold' };

export interface AbilityRule {
  id: string;
  label: string;
  measures: string;
  /** Bronze, Silver, Gold thresholds; absent for one-level abilities */
  tiers?: [number, number, number];
}

export const ABILITY_RULES: AbilityRule[] = [
  { id: 'scholar', label: 'Scholar', measures: 'votes cast with a published rationale', tiers: [10, 50, 150] },
  { id: 'early_bird', label: 'Early Bird', measures: "votes cast in the first half of an action's voting window", tiers: [10, 50, 120] },
  { id: 'workhorse', label: 'Workhorse', measures: 'career votes', tiers: [50, 100, 150] },
  { id: 'veteran', label: 'Veteran', measures: '6-epoch windows with at least one vote', tiers: [6, 12, 24] },
  { id: 'ironclad', label: 'Ironclad', measures: 'most recent finished windows in a row with votes and no missed actions', tiers: [2, 4, 8] },
  { id: 'on_fire', label: 'On Fire', measures: 'current streak of epochs without a missed vote', tiers: [3, 6, 12] },
  { id: 'identified', label: 'Identified', measures: 'a complete CIP-119 profile: name, bio, image and at least one link' },
  { id: 'underdog', label: 'Underdog', measures: 'a small DRep (by ADA and delegators) that voted in the latest finished window, among the smallest DReps by ADA and delegators combined' },
  { id: 'rookie', label: 'Rookie', measures: 'first votes in the current or previous window' },
];

export function tierFor(value: number, tiers: [number, number, number]): AbilityTier | null {
  if (value >= tiers[2]) return 3;
  if (value >= tiers[1]) return 2;
  if (value >= tiers[0]) return 1;
  return null;
}
