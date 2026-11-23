/**
 * One plain-language explanation per stat, shared by every tooltip so cards,
 * scoreboard and draft never describe the same number differently.
 */

export const TIPS = {
  govscore:
    'GovScore (career, 0–100): the share of governance actions this DRep voted on, adjusted for how long their record is (95% Wilson lower bound) so 5 of 5 can’t outrank 159 of 164, then gently reduced for very large ADA holdings. Vote direction never counts.',
  govscoreDelta: 'Change in GovScore since the end of the previous 6-epoch season. ▲ up, ▼ down.',
  govscoreTrend: 'GovScore at the end of each season, oldest to newest.',
  provisional: 'Provisional: fewer than 10 governance actions to judge by yet, so the score can move a lot.',
  seasonPoints:
    'Season points (this 6-epoch season): +10 per vote, +10 for a rationale, +5 if the rationale is fresh, +5 for voting in the first half of the window, up to +20 per clean epoch for streaks, −5 per action missed. Yes, No and Abstain earn the same.',
  seasonRank: 'Rank by season points among DReps who have voted this season.',
  seasonTrend: 'Season points in each recent season, oldest to newest.',
  tier: 'Card tier, by GovScore rank among active DReps: Legend #1, Silver #2, Bronze #3, Holo top 10, Rare top 50, Common the rest.',
  rank: 'GovScore rank among active DReps (registered, has voted, has ADA delegated).',
  cardNumber: 'Card number = current GovScore rank.',
  rookie: 'Rookie card: first votes were in the last two seasons.',
  streak: 'Streak: epochs in a row in which this DRep voted and missed nothing. Epochs with nothing to vote on don’t break it.',
  archetype: 'Headline ability: the rarest ability this DRep has earned. Flip the card to see them all.',
  power: 'Power: ADA currently delegated to this DRep, i.e. the voting weight behind their votes.',
  stamina: 'Stamina: participation rate, votes cast ÷ governance actions the DRep could vote on since registering.',
  xp: 'XP: governance actions voted on, out of all they were eligible for.',
  charisma: 'Charisma: number of wallets delegating to this DRep.',
  active: 'Active: registered on-chain right now. Retired: deregistered; delegators should pick a new DRep.',
  retired: 'Retired: this DRep has deregistered. Their delegators’ ADA no longer votes; they should pick a new DRep.',
  notSeeking: 'This DRep set doNotList in their CIP-119 metadata: they don’t want to be promoted for delegation.',
  projection: 'Projected points next season: average of the last 3 completed seasons (form), or the career average if none are complete.',
  form: 'Form: average season points over the last 3 completed seasons.',
  underdog:
    'Underdog multiplier (1.00–1.50×): smaller DReps by delegated ADA and delegator count multiply the points they gain for your game team. Locked when you pick. Losses are never multiplied.',
  teams: 'Share of game teams that drafted this DRep this season.',
  lastWindow: 'Season points in the last completed season.',
  avgWindow: 'Average season points across every season played.',
  bestWindow: 'Highest season points in any single season.',
  lifetimePoints: 'All season points earned, across every season.',
  windowsPlayed: 'Seasons in which this DRep voted at least once.',
  missedVotes: 'Governance actions that closed while this DRep was registered and they never voted (−5 each).',
  explains: 'Share of votes with a rationale (CIP-100 anchor) attached.',
  early: 'Share of votes cast in the first half of the action’s voting window.',
  ada: 'ADA currently delegated to this DRep.',
  delegators: 'Wallets currently delegating to this DRep.',
  votes: 'Governance actions voted on, out of all they were eligible for.',
  participation: 'Votes cast ÷ governance actions open while the DRep was registered.',
  seasonEpochs: 'The six epochs of the season. • marks the season in progress.',
  seasonVotes: 'Votes cast that season.',
  seasonExplained: 'Votes with a rationale that season.',
  seasonEarly: 'Votes cast in the first half of their voting window.',
  seasonMissed: 'Actions that closed unvoted that season.',
  seasonScore: 'GovScore at the end of that season.',
  dampened: 'Adjusted GovScore = raw score × ADA dampening, 1 ÷ (1 + log₁₀(ADA in millions + 1) ÷ 4).',
  raw: 'Raw GovScore: confidence-adjusted participation before ADA dampening.',
  rationaleRate: 'Share of this DRep’s votes that have a published rationale.',
} as const;

export type TipKey = keyof typeof TIPS;
