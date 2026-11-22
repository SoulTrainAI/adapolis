/**
 * The ADApolis Discord server, declared once. Setup makes the live server
 * match this file: edit here and rerun setup to change the server.
 * Matching is by name, so renaming here creates a new channel or role.
 */

export type RoleKey =
  | 'moderator'
  | 'verified_drep'
  | 'nft_holder'
  | 'drep_unverified'
  | 'delegator'
  | 'player'
  | 'collector'
  | 'learner'
  | 'builder'
  | 'governance_alerts'
  | 'season_alerts'
  | 'ama_alerts';

export interface RoleSpec {
  key: RoleKey;
  name: string;
  color: number;
  hoist: boolean;
  mentionable: boolean;
}

/** Highest first. Alert roles are mentionable so the feeds can ping them. */
export const ROLES: RoleSpec[] = [
  { key: 'moderator', name: 'Moderator', color: 0xf43f5e, hoist: true, mentionable: true },
  { key: 'verified_drep', name: 'Verified DRep', color: 0xf5b301, hoist: true, mentionable: false },
  { key: 'nft_holder', name: 'Card Holder', color: 0x8b5cf6, hoist: true, mentionable: false },
  { key: 'drep_unverified', name: 'DRep (unverified)', color: 0xa8a29e, hoist: false, mentionable: false },
  { key: 'delegator', name: 'Delegator', color: 0x38bdf8, hoist: false, mentionable: false },
  { key: 'player', name: 'Player', color: 0x10b981, hoist: false, mentionable: false },
  { key: 'collector', name: 'Collector', color: 0xc4b5fd, hoist: false, mentionable: false },
  { key: 'learner', name: 'Learner', color: 0x94a3b8, hoist: false, mentionable: false },
  { key: 'builder', name: 'Builder', color: 0xf97316, hoist: false, mentionable: false },
  { key: 'governance_alerts', name: 'Governance Alerts', color: 0, hoist: false, mentionable: true },
  { key: 'season_alerts', name: 'Season Alerts', color: 0, hoist: false, mentionable: true },
  { key: 'ama_alerts', name: 'AMA Alerts', color: 0, hoist: false, mentionable: true },
];

export type ChannelKind = 'text' | 'announcement' | 'forum' | 'voice' | 'stage';

/**
 * open: everyone reads and writes.
 * read_only: everyone reads; only moderators and the ADApolis webhook post.
 * replies_only (forums): moderators and the webhook start posts; everyone replies.
 * private: only the listed roles (plus moderators) can see it.
 */
export type Access = { mode: 'open' } | { mode: 'read_only' } | { mode: 'replies_only' } | { mode: 'private'; roles: RoleKey[] };

export type FeedKey = 'welcome' | 'rules' | 'governance_feed' | 'governance_actions' | 'guides' | 'season_feed' | 'card_of_the_day' | 'drep_verify' | 'mod_log';

export interface ChannelSpec {
  name: string;
  kind: ChannelKind;
  topic?: string;
  access: Access;
  /** Seconds between messages per member */
  slowmode?: number;
  /** Forum post tags */
  tags?: string[];
  /** Shown to new members by default (Discord onboarding) */
  onboardingDefault?: boolean;
  feed?: FeedKey;
}

export interface CategorySpec {
  name: string;
  channels: ChannelSpec[];
}

export const ACTION_TAGS: Record<string, string> = {
  TreasuryWithdrawals: 'Treasury',
  ParameterChange: 'Parameters',
  HardForkInitiation: 'Hard Fork',
  NewConstitution: 'Constitution',
  NewCommittee: 'Committee',
  NoConfidence: 'No Confidence',
  InfoAction: 'Info Action',
};

export const CATEGORIES: CategorySpec[] = [
  {
    name: '📜 START HERE',
    channels: [
      { name: 'welcome', kind: 'text', access: { mode: 'read_only' }, onboardingDefault: true, feed: 'welcome', topic: 'What ADApolis is and where to go first.' },
      { name: 'rules', kind: 'text', access: { mode: 'read_only' }, onboardingDefault: true, feed: 'rules', topic: 'Read these. Nobody from ADApolis will ever DM you first.' },
      { name: 'announcements', kind: 'announcement', access: { mode: 'read_only' }, onboardingDefault: true, topic: 'ADApolis news and launches. Follow this channel to get it in your own server.' },
      { name: 'introductions', kind: 'text', access: { mode: 'open' }, slowmode: 60, onboardingDefault: true, topic: 'Say hi: who you are, and whether you delegate, play, collect, or are a DRep.' },
    ],
  },
  {
    name: '🏛️ THE FORUM',
    channels: [
      { name: 'governance-feed', kind: 'text', access: { mode: 'read_only' }, onboardingDefault: true, feed: 'governance_feed', topic: 'Automatic: new governance actions and voting deadlines, straight from the chain.' },
      {
        name: 'governance-actions',
        kind: 'forum',
        access: { mode: 'replies_only' },
        feed: 'governance_actions',
        tags: Object.values(ACTION_TAGS),
        topic:
          'One post per on-chain governance action, opened automatically when it is submitted. Discuss it in its post. Keep it about the proposal, not the people.',
      },
      {
        name: 'ask-a-drep',
        kind: 'forum',
        access: { mode: 'open' },
        onboardingDefault: true,
        tags: ['Treasury', 'Protocol', 'Constitution', 'Hard Fork', 'Committee', 'Info Action', 'General', 'AMA', 'Answered'],
        topic:
          'Interview the people who vote on Cardano. One question per post, with a clear title and a tag. DReps with the gold Verified DRep role answer here; add the Answered tag when you have your answer. Be civil: DReps answer in their own time and speak only for themselves.',
      },
      { name: 'hot-topics-chat', kind: 'text', access: { mode: 'open' }, onboardingDefault: true, slowmode: 10, topic: 'What is being voted on right now: adapolis.net/hot-topics' },
      { name: 'learn-governance', kind: 'text', access: { mode: 'open' }, onboardingDefault: true, topic: 'New to Cardano governance? Ask anything here. No question is too basic.' },
      { name: 'governance-guides', kind: 'forum', access: { mode: 'replies_only' }, feed: 'guides', tags: ['Basics', 'Delegation', 'DReps', 'ADApolis'], topic: 'Short guides to Cardano governance. Ask follow-up questions inside each guide.' },
    ],
  },
  {
    name: '🏟️ THE ARENA',
    channels: [
      { name: 'season-feed', kind: 'text', access: { mode: 'read_only' }, feed: 'season_feed', topic: 'Automatic: standings each epoch, draft opening and lock reminders.' },
      { name: 'draft-talk', kind: 'text', access: { mode: 'open' }, topic: 'Scouting reports and draft strategy: adapolis.net/draft' },
      { name: 'arena-chat', kind: 'text', access: { mode: 'open' }, onboardingDefault: true, topic: 'Fantasy league banter. Points come from showing up and explaining, never from how DReps vote.' },
    ],
  },
  {
    name: '🃏 THE VAULT',
    channels: [
      { name: 'card-of-the-day', kind: 'text', access: { mode: 'read_only' }, feed: 'card_of_the_day', topic: 'Automatic: one DRep trading card every day.' },
      { name: 'collectors-chat', kind: 'text', access: { mode: 'open' }, onboardingDefault: true, topic: 'DRep trading cards and the upcoming Genesis collection.' },
      { name: 'holders-lounge', kind: 'text', access: { mode: 'private', roles: ['nft_holder'] }, topic: 'For ADApolis card holders.' },
    ],
  },
  {
    name: '🗳️ DREP CHAMBER',
    channels: [
      { name: 'drep-verify', kind: 'text', access: { mode: 'private', roles: ['drep_unverified', 'verified_drep'] }, feed: 'drep_verify', topic: 'Get the Verified DRep role. Instructions are pinned at the top.' },
      { name: 'drep-lounge', kind: 'text', access: { mode: 'private', roles: ['verified_drep'] }, topic: 'Verified DReps only. Off the record by default: do not screenshot without consent.' },
      { name: 'DRep Chamber', kind: 'voice', access: { mode: 'private', roles: ['verified_drep'] } },
    ],
  },
  {
    name: '🎙️ STAGE',
    channels: [
      { name: 'Town Hall', kind: 'stage', access: { mode: 'open' }, topic: 'Live DRep AMAs and community calls.' },
      { name: 'Agora', kind: 'voice', access: { mode: 'open' } },
    ],
  },
  {
    name: '🛠️ ADAPOLIS',
    channels: [
      { name: 'feedback', kind: 'text', access: { mode: 'open' }, onboardingDefault: true, topic: 'Ideas and requests for adapolis.net.' },
      { name: 'bug-reports', kind: 'text', access: { mode: 'open' }, topic: 'Something broken? Page, what you did, what happened.' },
    ],
  },
  {
    name: '🛡️ MODS',
    channels: [{ name: 'mod-log', kind: 'text', access: { mode: 'private', roles: ['moderator'] }, feed: 'mod_log', topic: 'AutoMod alerts and Discord community updates.' }],
  },
];

/** Onboarding questions: each answer hands out roles and opens channels. */
export const ONBOARDING = [
  {
    title: 'What brings you to ADApolis?',
    single_select: false,
    options: [
      { emoji: '📚', title: 'Learn how Cardano governance works', description: 'Guides and a no-judgement Q&A', roles: ['learner'] as RoleKey[], channels: ['learn-governance', 'governance-guides'] },
      { emoji: '🗳️', title: 'Pick or check on my DRep', description: 'Ask DReps questions and follow live votes', roles: ['delegator'] as RoleKey[], channels: ['ask-a-drep', 'hot-topics-chat'] },
      { emoji: '🏟️', title: 'Play the fantasy DRep league', description: 'Draft 5 DReps each season', roles: ['player'] as RoleKey[], channels: ['season-feed', 'draft-talk', 'arena-chat'] },
      { emoji: '🃏', title: 'Collect DRep trading cards', description: 'Card of the day and the Genesis set', roles: ['collector'] as RoleKey[], channels: ['card-of-the-day', 'collectors-chat'] },
      { emoji: '🏛️', title: "I'm a DRep", description: 'Get verified for the gold role and the DRep lounge', roles: ['drep_unverified'] as RoleKey[], channels: [] },
      { emoji: '🛠️', title: 'I build on Cardano', description: 'Feedback and integrations', roles: ['builder'] as RoleKey[], channels: ['feedback', 'bug-reports'] },
    ],
  },
  {
    title: 'Which alerts do you want?',
    single_select: false,
    options: [
      { emoji: '🔔', title: 'New governance actions and deadlines', description: 'A ping when something goes up for a vote', roles: ['governance_alerts'] as RoleKey[], channels: ['governance-feed'] },
      { emoji: '🏆', title: 'Season, draft and standings', description: 'Draft opening, lock reminders, standings', roles: ['season_alerts'] as RoleKey[], channels: ['season-feed'] },
      { emoji: '🎙️', title: 'Live DRep AMAs', description: 'A ping when an AMA starts on stage', roles: ['ama_alerts'] as RoleKey[], channels: [] },
    ],
  },
];

/** Blocked outright: the phrases Cardano wallet-drainer scams lean on. */
export const SCAM_KEYWORDS = [
  '*seed phrase*',
  '*recovery phrase*',
  '*secret phrase*',
  '*24 words*',
  '*validate your wallet*',
  '*sync your wallet*',
  '*wallet connect*',
  '*claim your airdrop*',
  '*support ticket*',
  '*dm me for help*',
  '*open a ticket*',
];
