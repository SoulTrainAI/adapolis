/** The site's main destinations, described once for the navbar and the homepage. */

export interface SiteSection {
  href: string;
  label: string;
  /** One line, for tooltips and tiles. */
  blurb: string;
}

export const SECTIONS = {
  scoreboard: {
    href: '/scoreboard',
    label: 'Scoreboard',
    blurb: 'Every active DRep ranked by lifetime GovScore: how reliably they vote, over their whole record. Rank by season points, projections, or your own Alignment after the DRep Match-maker quiz.',
  },
  match: {
    href: '/match',
    label: 'DRep Match-maker',
    blurb: 'A 3-minute quiz that matches you with DReps who have actually voted the way you think.',
  },
  hotTopics: {
    href: '/hot-topics',
    label: 'Hot Takes',
    blurb: 'Governance actions open for voting now: how DReps are splitting and the best arguments on each side.',
  },
  season: {
    href: '/cardanathon',
    label: 'Cardanathon',
    blurb: 'The Cardanathon: watch the top 20 DReps race through the season next to the Team Leaderboard, with live commentary.',
  },
  draft: {
    href: '/draft',
    label: 'Draft Teams',
    blurb: 'Free to play: draft 5 DReps and score their season points, within a 10-star budget.',
  },
  collection: {
    href: '/collection',
    label: 'My Collection',
    blurb: 'Your game team, a check-up on the DRep you delegate to, and the DRep All-Star NFTs you hold.',
  },
  claim: {
    href: '/drep',
    label: 'DReps: Claim your profile',
    blurb: 'DReps: sign with your DRep key to set your card’s art, bio and links. Stats always come from the chain.',
  },
  about: { href: '/about', label: 'About', blurb: 'What ADApolis is, who it’s for and the principles it holds to.' },
  methodology: {
    href: '/methodology',
    label: 'Methodology',
    blurb: 'Every formula, threshold and worked example behind the scores, points and matches.',
  },
} satisfies Record<string, SiteSection>;
