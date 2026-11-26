/** The site menu: five groups (Jason, 2026-11-25). Used by the navbar on every screen size. */

import { DISCORD_URL, X_URL } from './social';

export interface NavItem {
  label: string;
  href: string;
  blurb: string;
  external?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  {
    label: 'Meet Your DReps',
    items: [
      { label: 'Scoreboard', href: '/scoreboard', blurb: 'Every DRep ranked on how reliably they do the job.' },
      { label: 'DRep Match-maker', href: '/match', blurb: 'A 3-minute quiz that finds DReps who vote the way you think.' },
      { label: 'Hot Takes', href: '/hot-topics', blurb: 'The governance actions being decided now, and how DReps are splitting.' },
      { label: 'Claim DRep Profile', href: '/drep', blurb: 'DReps: sign with your DRep key to set your art, bio and links.' },
    ],
  },
  {
    label: 'Play Cardanathon',
    items: [
      { label: 'Cardanathon', href: '/season', blurb: 'The live race, the Team Leaderboard and the commentary.' },
      { label: 'Draft Teams', href: '/draft', blurb: 'Pick 5 DReps for the season. Free to play.' },
      { label: 'Join Leagues', href: '/leagues', blurb: 'Play against friends or the whole community.' },
      { label: 'Hall of Fame', href: '/hall-of-fame', blurb: "Last season's top 10 DReps and the trophy winners." },
    ],
  },
  {
    label: 'DRep All-Star NFTs',
    items: [
      { label: 'Explore The Official Collection', href: '/nfts', blurb: 'Every DRep All-Star card and trophy minted so far.' },
      { label: 'My DRep All-Stars', href: '/collection', blurb: 'Your team, your DRep and the cards you hold.' },
      { label: 'Mint NFTs', href: '/mint', blurb: 'Claim the All-Stars and trophies you won.' },
    ],
  },
  {
    label: 'Learn More',
    items: [
      { label: 'Homepage', href: '/', blurb: 'Start here.' },
      { label: 'About', href: '/about', blurb: 'Why ADApolis exists and the rules it holds to.' },
      { label: 'Methodology', href: '/methodology', blurb: 'Every formula behind the scores, points and matches.' },
    ],
  },
  {
    label: 'Join The Community',
    items: [
      { label: 'Discord', href: DISCORD_URL, blurb: 'Season recaps, Ask a DRep and newcomer help.', external: true },
      { label: 'X', href: X_URL, blurb: 'Updates, card of the day and season news.', external: true },
    ],
  },
];

export function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}
