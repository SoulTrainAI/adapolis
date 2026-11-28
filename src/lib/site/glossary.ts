/**
 * One plain-language explanation per stat, shared by every tooltip so cards,
 * scoreboard and draft never describe the same number differently.
 */

export const TIPS = {
  govscore:
    'GovScore (career, 0–100): the Cardanathon’s scoring over a DRep’s whole career (voting, explaining with rationales, voting early, streaks) as a share of what a perfect record would earn. Adjusted for how long the record is, so 5 actions can’t outrank 160, then gently reduced for very large ADA holdings. Vote direction never counts.',
  govscoreDelta: 'Change in GovScore since the end of the previous 6-epoch season. ▲ up, ▼ down.',
  govscoreTrend: 'GovScore at the end of each season, oldest to newest.',
  provisional: 'Provisional: fewer than 10 governance actions to judge by yet, so the score can move a lot.',
  seasonPoints:
    'Season points (this 6-epoch season): +10 per vote, +5 for voting in the first half of the window, +5 for an original rationale (not identical to any posted before), up to +20 per clean epoch for streaks. Points are never taken away. Yes, No and Abstain earn the same.',
  seasonRank: 'Rank by season points among DReps who have voted this season.',
  seasonTrend: 'Season points in each recent season, oldest to newest.',
  tier: 'Card tier, by GovScore rank among active DReps: Legend #1, Silver #2, Bronze #3, Holographic top 10, Rare top 50, Common the rest.',
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
    'Underdog bonus (1.00–1.50×): higher for smaller DReps, by delegated ADA and delegator count. The DRep Match-maker’s Decentralization weight uses it to favor small DReps. It doesn’t change game points.',
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
  alignment:
    'Alignment: how closely this DRep’s real votes match your DRep Match-maker answers, 0–100%. Worked out in your browser from your answers; only you see it.',
  personalGovscore:
    'GovScore (aligned): GovScore adjusted by your Alignment. 50% alignment leaves it unchanged; 100% raises it by a quarter, 0% lowers it by a quarter (max 100). Only you see it; the public GovScore never depends on how DReps vote.',
  seasonEpochs: 'The six epochs of the season. • marks the season in progress.',
  seasonVotes: 'Votes cast that season.',
  seasonExplained: 'Votes with a rationale that season.',
  seasonEarly: 'Votes cast in the first half of their voting window.',
  seasonMissed: 'Actions that closed unvoted that season.',
  seasonScore: 'GovScore at the end of that season.',
  dampened: 'Adjusted GovScore = raw score × ADA dampening, 1 ÷ (1 + log₁₀(ADA in millions + 1) ÷ 4).',
  raw: 'GovScore (dry): the career score before the large-ADA adjustment.',
  rationaleRate: 'Share of this DRep’s votes that have a published rationale.',
} as const;

export type TipKey = keyof typeof TIPS;
