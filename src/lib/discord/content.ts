/**
 * Text the setup posts once: welcome, rules, DRep verification and starter
 * guides. Plain Discord markdown. Edit here; setup won't repost a message
 * it already posted, so to change a live one, delete it in Discord and rerun.
 */

import { COLORS, type Embed } from './rest';

const SITE = 'https://adapolis.net';

export const WELCOME: Embed[] = [
  {
    title: 'Welcome to ADApolis',
    url: SITE,
    color: COLORS.gold,
    description: [
      'ADApolis is the civic engine for Cardano governance: every DRep scored on whether they actually show up, explain their votes, and vote on time. Never on *which way* they vote.',
      '',
      '**Where to go**',
      '📚 New to governance? Start in **#governance-guides**, then ask anything in **#learn-governance**.',
      '🗳️ Choosing a DRep? Ask them directly in **#ask-a-drep**, and take the quiz at ' + `${SITE}/match`,
      '🔔 **#governance-feed** posts every new governance action. Each one gets its own discussion post in **#governance-actions**.',
      '🏟️ The game: draft 5 DReps at ' + `${SITE}/draft` + ' and talk strategy in **#draft-talk**.',
      '🃏 A new DRep trading card lands in **#card-of-the-day** every day.',
      '🏛️ Are you a DRep? Pick "I\'m a DRep" in **Channels & Roles** and follow the steps in **#drep-verify**.',
      '',
      'Change your roles and alerts any time under **Channels & Roles** at the top of the channel list.',
    ].join('\n'),
    footer: { text: 'adapolis.net · @ADApolisdotnet on X' },
  },
];

export const RULES: Embed[] = [
  {
    title: 'Server rules',
    color: COLORS.violet,
    description: [
      '**1. Nobody from ADApolis will ever DM you first.** No admin, mod or DRep needs your seed phrase, a "wallet sync" or a "support ticket". Anyone who asks is a scammer: report them to a Moderator.',
      '**2. Debate proposals, not people.** Disagree as hard as you like about a governance action; no insults, harassment or doxxing.',
      '**3. No vote buying or brigading.** Do not offer anything for a vote or a delegation, and do not organise pile-ons against a DRep.',
      '**4. DReps speak for themselves.** Answers in #ask-a-drep are that DRep\'s own view, not ADApolis\'s.',
      '**5. No financial advice, shilling or token promotion.** Project links are fine when they are relevant to a governance action.',
      '**6. Keep it on topic** for the channel you are in, and in English so moderators can follow (other languages are welcome in threads).',
      '**7. Drep-lounge and holders-lounge are off the record.** No screenshots without consent.',
      '**8. No betting or prize pools.** Don\'t organise wagers, buy-ins or NFT pots on the game, here or by linking elsewhere. The game is free, and its prizes come only from ADApolis.',
      '**9. Moderators have the final word.** Breaking these rules can get your messages removed, a timeout or a ban.',
    ].join('\n\n'),
  },
];

export const DREP_VERIFY: Embed[] = [
  {
    title: 'Get the Verified DRep role',
    color: COLORS.gold,
    description: [
      'Verified DReps get the gold role, their answers stand out in **#ask-a-drep**, and they get access to **#drep-lounge**.',
      '',
      '**Automatic (one minute):**',
      '1. Go to https://adapolis.net/drep and sign with your DRep key (Eternl, Lace, Yoroi or NuFi).',
      '2. Then open https://adapolis.net/discord and sign in with Discord. The role is added straight away.',
      '',
      '**Manual (script-based DReps, or if your wallet can\'t sign with the DRep key):** post your DRep ID (`drep1…`) here and add this Discord username to your DRep profile links. A Moderator checks it against the chain.',
    ].join('\n'),
  },
];

export interface Guide {
  slug: string;
  title: string;
  tag: string;
  body: string;
}

export const GUIDES: Guide[] = [
  {
    slug: 'start-here',
    title: 'Start here: Cardano governance in 5 minutes',
    tag: 'Basics',
    body: [
      'Cardano is governed on-chain. Anyone can submit a **governance action** (a proposal), and three groups vote on it:',
      '• **DReps** (Delegated Representatives) vote with the ADA that holders delegate to them.',
      '• **Stake pool operators** vote on some action types, such as hard forks.',
      '• The **Constitutional Committee** checks that actions follow the Cardano Constitution.',
      '',
      'There are seven kinds of action: treasury withdrawals, protocol parameter changes, hard forks, a new constitution, committee changes, motions of no confidence, and info actions (non-binding polls).',
      '',
      'Each action is open for a limited number of epochs (an epoch is 5 days). If enough voting power agrees before it expires, it is ratified and then enacted.',
      '',
      'Your part: delegate your ADA\'s voting power to a DRep who represents you, then keep an eye on whether they show up. That is what ADApolis is for.',
    ].join('\n'),
  },
  {
    slug: 'what-drep-does',
    title: 'What does a DRep actually do?',
    tag: 'DReps',
    body: [
      'A DRep reads governance actions, votes Yes, No or Abstain, and ideally publishes a **rationale** explaining why.',
      '',
      'A good DRep:',
      '• votes on (nearly) every action, before the deadline,',
      '• explains their reasoning in their own words,',
      '• is reachable: a profile, links, and answers to questions (see #ask-a-drep).',
      '',
      'Anyone can register as a DRep, and many people hold delegations they never use. ADApolis tracks that: the Scoreboard at https://www.adapolis.net/scoreboard ranks DReps on participation, never on which way they vote.',
    ].join('\n'),
  },
  {
    slug: 'how-to-delegate',
    title: 'How to delegate your voting power',
    tag: 'Delegation',
    body: [
      '1. Find a DRep: take the quiz at https://adapolis.net/match or browse the Scoreboard.',
      '2. In your wallet (Eternl, Lace, Yoroi and others), open the governance or voting section and search for the DRep\'s ID or name. You can also delegate on gov.tools.',
      '3. Sign the transaction. It costs a small network fee.',
      '',
      'Delegating does **not** move or lock your ADA. It stays in your wallet, you keep staking rewards, and you can change DRep any time.',
      '',
      'Prefer not to pick a person? Wallets also offer two fixed options, **Always Abstain** and **Always No Confidence**. They don\'t read proposals or explain anything, so many people prefer a real DRep.',
    ].join('\n'),
  },
  {
    slug: 'read-an-action',
    title: 'How to read a governance action',
    tag: 'Basics',
    body: [
      'Every action in #governance-actions links to its page on ADApolis Hot Takes. Look at:',
      '• **Type**: a treasury withdrawal spends ADA; an info action is only a poll.',
      '• **The ask**: for treasury actions, how much, to whom, and for what deliverables.',
      '• **The deadline**: the epoch voting closes.',
      '• **Arguments**: Hot Takes shows DRep rationales for and against, each linked to the DRep\'s own words.',
      '',
      'Then ask the proposer or DReps directly: open a post in #ask-a-drep.',
    ].join('\n'),
  },
  {
    slug: 'how-adapolis-scores',
    title: 'How ADApolis scores DReps (and what it never scores)',
    tag: 'ADApolis',
    body: [
      '**GovScore** measures participation: how many of the actions a DRep could vote on they actually voted on, adjusted for how long their record is, then dampened for very large ADA holdings.',
      '',
      '**Season points** (the game) reward voting, publishing a rationale, writing a unique rationale, voting early and voting streaks; missed votes cost points.',
      '',
      '**Never scored:** which way a DRep votes, or whether their side won. Rewarding the "winning side" would turn governance into a betting game and pressure DReps to follow the crowd.',
      '',
      'Full formulas: https://adapolis.net/methodology',
    ].join('\n'),
  },
];
