/**
 * Find My DRep quiz topics. Shared by the server (which measures DRep
 * positions) and the browser (which scores matches), so adding a topic is a
 * single entry here.
 *
 * Every statement is phrased so that 10 = "strongly agree". A DRep's position
 * on a topic is a number in [0, 1] on the same scale.
 *
 * source:
 *  - 'votes':  measured from on-chain votes on the listed governance action types
 *  - 'params': measured from votes on parameter changes, by the direction each
 *              change moves the listed parameters (no AI; rule-based)
 *  - 'stake':  measured from the DRep's delegated ADA
 *  - 'rationale': measured from how often the DRep publishes vote rationales
 *  - 'stated': only measurable from DReps' public statements (Phase 2/3); the
 *              quiz asks it, but it doesn't affect vote-record matching yet
 */

export type TopicSource = 'votes' | 'params' | 'stake' | 'rationale' | 'stated';

export interface ParamRule {
  /** Koios camelCase parameter name inside a ParameterChange proposal */
  param: string;
  /** epoch_params column holding the value before the change */
  epochParam: string;
  /** Which direction of change agrees with the statement */
  agreeWhen: 'decrease' | 'increase';
}

export interface Topic {
  id: string;
  statement: string;
  /** One line shown under the statement to explain what's at stake */
  context: string;
  group: 'core' | 'decentralization' | 'deeper';
  source: TopicSource;
  /** For 'votes': action types; value 1 means a Yes agrees with the statement */
  actionTypes?: Partial<Record<string, 1 | 0>>;
  paramRules?: ParamRule[];
  /** Percentile = DRep's position relative to other DReps; absolute = raw rate */
  scale?: 'percentile' | 'absolute';
  /** Only agreement counts (disagreeing means "don't mind", not "want the opposite") */
  oneSided?: boolean;
  /** How the position is described in match explanations */
  describe?: (rate: number) => string;
}

const pct = (r: number) => `${Math.round(r * 100)}%`;

export const TOPICS: Topic[] = [
  {
    id: 'treasury_spending',
    statement: "Cardano's treasury should fund ecosystem growth aggressively.",
    context: 'Every treasury withdrawal needs DRep approval. Spending more builds faster; spending less protects reserves.',
    group: 'core',
    source: 'votes',
    actionTypes: { TreasuryWithdrawals: 1 },
    scale: 'percentile',
    describe: (r) => `approves ${pct(r)} of treasury requests`,
  },
  {
    id: 'protocol_change',
    statement: 'Cardano should upgrade its protocol quickly to stay competitive.',
    context: 'Parameter changes and hard forks add capabilities but carry risk if rushed.',
    group: 'core',
    source: 'votes',
    actionTypes: { ParameterChange: 1, HardForkInitiation: 1 },
    scale: 'percentile',
    describe: (r) => `supports ${pct(r)} of protocol changes`,
  },
  {
    id: 'transparency',
    statement: 'My DRep should publicly explain every vote.',
    context: 'DReps can attach a written rationale to each vote. Many never do.',
    group: 'core',
    source: 'rationale',
    scale: 'percentile',
    oneSided: true,
    describe: (r) => `explains ${pct(r)} of their votes`,
  },
  {
    id: 'small_dreps',
    statement: 'I want my voting power to go to a smaller, independent DRep.',
    context: 'A few large DReps hold much of the voting power. Delegating to smaller ones spreads it out.',
    group: 'decentralization',
    source: 'stake',
    scale: 'percentile',
  },
  {
    id: 'pool_decentralization',
    statement: 'Protocol settings should favor small, independent stake pools.',
    context: 'Lower minimum pool fees and more pools in the reward curve help small operators compete.',
    group: 'decentralization',
    source: 'params',
    paramRules: [
      { param: 'minPoolCost', epochParam: 'min_pool_cost', agreeWhen: 'decrease' },
      { param: 'stakePoolTargetNum', epochParam: 'optimal_pool_count', agreeWhen: 'increase' },
      { param: 'poolPledgeInfluence', epochParam: 'influence', agreeWhen: 'decrease' },
    ],
    scale: 'absolute',
    describe: (r) => `sided with small pools on ${pct(r)} of related votes`,
  },
  {
    id: 'voting_power_cap',
    statement: 'Large ADA holders should have less influence over governance.',
    context: 'Voting power is currently proportional to stake. Some propose dampening or capping it.',
    group: 'decentralization',
    source: 'stated',
  },
  {
    id: 'committee_trust',
    statement: 'The Constitutional Committee deserves broad support.',
    context: 'The committee checks governance actions against the constitution. DReps can replace it or vote no confidence.',
    group: 'deeper',
    source: 'votes',
    actionTypes: { NewCommittee: 1, NoConfidence: 0 },
    scale: 'absolute',
    describe: (r) => `backed the committee on ${pct(r)} of related votes`,
  },
  {
    id: 'constitution_stability',
    statement: "Cardano's constitution should be hard to change.",
    context: 'Constitution amendments need DRep approval.',
    group: 'deeper',
    source: 'votes',
    actionTypes: { NewConstitution: 0 },
    scale: 'absolute',
    describe: (r) => `opposed ${pct(r)} of constitution changes`,
  },
  {
    id: 'staker_rewards',
    statement: 'Staking rewards should be protected over treasury growth.',
    context: 'The "treasury cut" setting decides how much of each epoch\'s rewards goes to the treasury instead of stakers.',
    group: 'deeper',
    source: 'params',
    paramRules: [{ param: 'treasuryCut', epochParam: 'treasury_growth_rate', agreeWhen: 'decrease' }],
    scale: 'absolute',
    describe: (r) => `sided with stakers on ${pct(r)} of related votes`,
  },
  {
    id: 'low_fees',
    statement: 'Transaction fees should be kept as low as possible.',
    context: 'Fee settings trade cheaper transactions against network security and spam resistance.',
    group: 'deeper',
    source: 'params',
    paramRules: [
      { param: 'txFeePerByte', epochParam: 'min_fee_a', agreeWhen: 'decrease' },
      { param: 'txFeeFixed', epochParam: 'min_fee_b', agreeWhen: 'decrease' },
    ],
    scale: 'absolute',
    describe: (r) => `voted for lower fees on ${pct(r)} of related votes`,
  },
  {
    id: 'treasury_deployment',
    statement: 'The treasury may invest in DeFi or stablecoins to grow its value.',
    context: 'Proposals have suggested converting treasury ADA into stablecoins or deploying it as liquidity.',
    group: 'deeper',
    source: 'stated',
  },
  {
    id: 'funding_accountability',
    statement: 'Funded projects must hit milestones before receiving more money.',
    context: 'Treasury funding can be paid up front or released as milestones are met.',
    group: 'deeper',
    source: 'stated',
  },
  {
    id: 'drep_compensation',
    statement: 'DReps should be paid for their work.',
    context: 'DReps are currently unpaid. Some proposals would let delegators share rewards with their DRep.',
    group: 'deeper',
    source: 'stated',
  },
  {
    id: 'institutions',
    statement: 'Cardano should court institutions, even if it means compromises.',
    context: 'Institutional adoption can bring capital and users, sometimes with compliance demands.',
    group: 'deeper',
    source: 'stated',
  },
];

export const IMPORTANCE_LEVELS = [
  { value: 0, label: 'Not at all' },
  { value: 1, label: 'A little' },
  { value: 2, label: 'Somewhat' },
  { value: 3, label: 'Very' },
] as const;

export const MATCH_RULES = {
  minVotesCast: 3,
  minParticipation: 0.5,
  /** Pseudo-votes pulling a thin record toward the population middle */
  shrinkagePriorVotes: 3,
  /** Max points added for the smallest DReps, applied to every match */
  maxDecentralizationBoost: 5,
  realVoteCount: 4,
  realVoteWindowEpochs: 146,
  minVotersForRealVote: 20,
} as const;

// Haiku kept filing Constitutional Committee pay under DRep pay despite explicit
// prompt rules, so some topics get a deterministic check: the quote itself must
// name the subject. Applied when saving and again when loading older rows.
const QUOTE_MUST_MENTION: Partial<Record<string, RegExp>> = {
  drep_compensation: /\bdreps?\b|delegated representative/i,
};

export function quoteFitsTopic(topicId: string, quote: string): boolean {
  const pattern = QUOTE_MUST_MENTION[topicId];
  return pattern === undefined || pattern.test(quote);
}
