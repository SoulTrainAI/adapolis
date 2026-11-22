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
  /** Balanced summary of the main arguments each way, shown under the question */
  argsFor: string[];
  argsAgainst: string[];
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
    argsFor: ["Funds the developers, tools and adoption work that grow the ecosystem.", "Competing chains spend heavily on growth; holding back risks falling behind.", "Unspent treasury ADA does nothing for the network."],
    argsAgainst: ["Spending fast could drain reserves needed in future years.", "Teams often sell withdrawn ADA, which can weigh on its price.", "The more that is funded, the harder it is to hold every project accountable."],
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
    argsFor: ["New capabilities keep Cardano competitive for builders and users.", "Slow upgrades can push developers to other chains.", "Changes are tested on testnets before they reach mainnet."],
    argsAgainst: ["A rushed change risks bugs on a chain securing billions in value.", "Stability and predictability are part of Cardano's reputation.", "Exchanges, wallets and dApps need time to prepare for each upgrade."],
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
    argsFor: ["Delegators can only judge a DRep whose reasoning they can see.", "Written reasons discourage careless or captured votes.", "Builds a public record others can learn from and challenge."],
    argsAgainst: ["Writing for every vote takes time unpaid DReps may not have.", "The on-chain vote record already shows how they voted.", "Boilerplate rationales add length without insight."],
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
    argsFor: ["Spreads voting power so a few DReps can't decide outcomes alone.", "Smaller DReps may be more reachable and responsive to delegators.", "Fewer single points of failure or capture."],
    argsAgainst: ["Larger DReps often bring more resources, experience and track record.", "Small DReps may be less active or stop voting.", "Matching your priorities may matter more than a DRep's size."],
    group: 'decentralization',
    source: 'stake',
    scale: 'percentile',
  },
  {
    id: 'pool_decentralization',
    statement: 'Protocol settings should favor small, independent stake pools.',
    context: 'Lower minimum pool fees and more pools in the reward curve help small operators compete.',
    argsFor: ["Lower fixed costs let small operators compete with large pool groups.", "More viable pools spread block production more widely.", "Less weight on pledge helps capable operators without large holdings."],
    argsAgainst: ["Pledge's weight is a defense against one entity running many pools.", "Very low pool income can make running a pool securely harder.", "Splitting stake across many small pools can reduce efficiency."],
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
    argsFor: ["Stake-weighted voting lets a few whales or exchanges dominate.", "A broader spread of influence strengthens governance legitimacy.", "Encourages smaller holders to take part."],
    argsAgainst: ["Caps can be dodged by splitting stake across many wallets.", "Those with the most at stake bear the most risk.", "Enforcing a cap would need protocol changes that may not work in practice."],
    group: 'decentralization',
    source: 'stated',
  },
  {
    id: 'committee_trust',
    statement: 'The Constitutional Committee deserves broad support.',
    context: 'The committee checks governance actions against the constitution. DReps can replace it or vote no confidence.',
    argsFor: ["The committee checks that actions follow the constitution.", "Frequent no-confidence fights would destabilize governance.", "Members are chosen through governance and can be replaced."],
    argsAgainst: ["A small committee can block what most DReps approved.", "Support without scrutiny removes accountability.", "Committees should be challenged when they overstep."],
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
    argsFor: ["Stable rules give builders and holders predictability.", "Hard-to-change rules protect minorities from a passing majority.", "Prevents the rules being rewritten for one group's benefit."],
    argsAgainst: ["The constitution is new and may need fixes as experience grows.", "Rigid rules can lock in mistakes.", "The community's needs will change over time."],
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
    argsFor: ["Rewards make staking, and so network security, attractive.", "The treasury already holds large reserves.", "Rewards are income stakers rely on."],
    argsAgainst: ["The treasury funds development every holder benefits from.", "Reserves shrink over time, so the treasury needs a steady income.", "A small cut per staker funds a lot of ecosystem work."],
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
    argsFor: ["Cheap transactions make everyday payments and dApps practical.", "High fees shut out smaller users.", "Low fees help Cardano compete with other chains."],
    argsAgainst: ["Fees defend the network against spam and denial-of-service attacks.", "As reserves shrink, fees must eventually help pay stake pools.", "Very cheap block space can be filled cheaply, crowding out others."],
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
    argsFor: ["Holding only ADA exposes the treasury to price swings.", "Stablecoins give predictable budgets for funded work.", "Treasury liquidity could deepen Cardano DeFi."],
    argsAgainst: ["DeFi carries smart-contract, counterparty and depeg risks.", "Selling ADA to diversify can weigh on its price.", "It makes governance an investment manager, a role it may not be equipped for."],
    group: 'deeper',
    source: 'stated',
  },
  {
    id: 'funding_accountability',
    statement: 'Funded projects must hit milestones before receiving more money.',
    context: 'Treasury funding can be paid up front or released as milestones are met.',
    argsFor: ["Protects the treasury from projects that don't deliver.", "Gives teams clear goals and the public clear checkpoints.", "Builds trust that treasury money is well spent."],
    argsAgainst: ["Milestone reviews add overhead and delays.", "Research and early-stage work are hard to measure in milestones.", "Teams may need money up front to hire and start."],
    group: 'deeper',
    source: 'stated',
  },
  {
    id: 'drep_compensation',
    statement: 'DReps should be paid for their work.',
    context: 'DReps are currently unpaid. Some proposals would let delegators share rewards with their DRep.',
    argsFor: ["Good governance takes hours of reading and writing.", "Pay lets more people afford to take part, not just the well-off.", "Makes the role more professional and reliable."],
    argsAgainst: ["Pay could attract people chasing income rather than conviction.", "Whoever pays DReps may gain influence over them.", "DReps would be voting on their own pay."],
    group: 'deeper',
    source: 'stated',
  },
  {
    id: 'institutions',
    statement: 'Cardano should court institutions, even if it means compromises.',
    context: 'Institutional adoption can bring capital and users, sometimes with compliance demands.',
    argsFor: ["Institutions bring capital, users and credibility.", "Mainstream adoption needs regulatory compatibility.", "Competing chains are already courting them."],
    argsAgainst: ["Compliance demands can conflict with permissionless and privacy values.", "Institutions may gain outsized influence.", "Cardano's community-driven character could erode."],
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
