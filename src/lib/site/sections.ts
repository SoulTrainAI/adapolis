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
    blurb: 'Every active DRep ranked by GovScore: how reliably they vote, over their whole record. Sort by season points or projections.',
  },
  match: {
    href: '/match',
    label: 'Find My DRep',
    blurb: 'A 3-minute quiz that matches you with DReps who have actually voted the way you think.',
  },
  hotTopics: {
    href: '/hot-topics',
    label: 'Hot Topics',
    blurb: 'Governance actions open for voting now: how DReps are splitting and the best arguments on each side.',
  },
  season: {
    href: '/season',
    label: 'Cardanathon',
    blurb: 'The Cardanathon: watch the top 20 DReps race through the season next to the Team Leaderboard, with live commentary.',
  },
  draft: {
    href: '/draft',
    label: 'Draft',
    blurb: 'Free game: draft 5 DReps and score their season points. Small DReps carry an underdog bonus.',
  },
  collection: {
    href: '/collection',
    label: 'Collection',
    blurb: 'Your game team’s cards, a check-up on the DRep you delegate to, and collectible cards (coming soon).',
  },
  claim: {
    href: '/drep',
    label: 'Claim your card',
    blurb: 'DReps: sign with your DRep key to set your card’s art, bio and links. Stats always come from the chain.',
  },
  about: { href: '/about', label: 'About', blurb: 'What ADApolis is, who it’s for and the principles it holds to.' },
  methodology: {
    href: '/methodology',
    label: 'Methodology',
    blurb: 'Every formula, threshold and worked example behind the scores, points and matches.',
  },
} satisfies Record<string, SiteSection>;
