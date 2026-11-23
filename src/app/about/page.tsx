/**
 * About ADApolis: what the site is, how the game and the Champion Cards work,
 * and the principles it holds to. Rules here follow docs/GAME.md.
 */

import type { ReactNode } from "react";
import Link from "next/link";
import { DISCORD_URL, X_HANDLE, X_URL } from "@/lib/site/social";
import { CollectiblesNotice } from "@/components/cards/CollectiblesNotice";

export const metadata = {
  title: "About — ADApolis",
  description:
    "ADApolis turns Cardano governance into something you can follow, play and collect: DRep scores, monthly seasons, a free DRep game, Champion Cards and Find My DRep.",
};

const GITHUB_URL = "https://github.com/SoulTrainAI/adapolis";

const FEATURES: Array<{ href: string; title: string; body: ReactNode }> = [
  {
    href: "/scoreboard",
    title: "DRep Hall of Fame",
    body: "Every active DRep's lifetime record, ranked by GovScore: how reliably they have voted over their whole record, adjusted for how long that record is and gently dampened for very large ADA holdings. Sort by season points or projections too, or, after the Find My DRep quiz, by your own Alignment.",
  },
  {
    href: "/season",
    title: "Seasons",
    body: "Governance runs in 6-epoch seasons (about a month). DReps earn points for voting, explaining their votes, voting early and keeping a streak, and lose points for missed actions.",
  },
  {
    href: "/draft",
    title: "The game",
    body: "Free to play. Draft 5 DReps each season and score their season points. Smaller DReps carry an underdog multiplier, so scouting reliable newcomers pays off.",
  },
  {
    href: "/leaderboard",
    title: "Leaderboard",
    body: "Every team's score, pick by pick, updated as the season unfolds.",
  },
  {
    href: "/collection",
    title: "Trading cards",
    body: "Every active DRep has a card with their stats, tier, journey and earned abilities. Flip it for the full record, download it, or share it.",
  },
  {
    href: "/match",
    title: "Find My DRep",
    body: "Answer a short quiz and see which DReps have actually voted the way you think, plus what they say in their own words. Small DReps get a boost so voting power spreads out.",
  },
  {
    href: "/hot-topics",
    title: "Hot Topics",
    body: "Governance actions open for voting now: how DReps are splitting, who has explained their vote, and the strongest arguments on each side, each quoted and linked.",
  },
  {
    href: "/drep",
    title: "For DReps",
    body: "Claim your card by signing with your DRep key, then set your card's art, bio and links. Your stats always come from the chain.",
  },
];

const PRINCIPLES: Array<[string, ReactNode]> = [
  [
    "Process, never outcomes",
    "Scores, points and game results reward how DReps do the job: showing up, explaining, voting on time. Yes, No and Abstain are worth the same, and nothing depends on whether a proposal passes. We never reward voting with the winning side, and we never reward delegating to any particular DRep.",
  ],
  [
    "Neutral",
    "ADApolis takes no position on any proposal, treasury request or policy direction. AI summaries present both sides, quote their sources verbatim and never feed a score.",
  ],
  [
    "Decentralization by design",
    "Find My DRep gives small DReps a visible boost, GovScore gently dampens very large ones, and the game rewards drafting underdogs, all to help voting power spread out.",
  ],
  [
    "Transparent",
    <>
      Every formula is published on the{" "}
      <Link href="/methodology" className="text-blue-400 hover:text-blue-300">
        methodology
      </Link>{" "}
      page and every number comes from public on-chain data you can check
      yourself. The data behind the site is open JSON, and the code is{" "}
      <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
        open source
      </a>
      .
    </>,
  ],
  [
    "Free and private",
    "No fees, subscriptions or tokens to hold. Signing in only signs a message, never a transaction. Quiz answers stay in your browser unless you choose to save them.",
  ],
];

function H2({ children }: { children: ReactNode }) {
  return <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-blue-400">{children}</h2>;
}

function H3({ children }: { children: ReactNode }) {
  return <h3 className="text-lg font-semibold text-slate-100 pt-2">{children}</h3>;
}

function Bullets({ items }: { items: ReactNode[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span className="text-blue-400 font-bold">•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function B({ children }: { children: ReactNode }) {
  return <span className="text-slate-100 font-semibold">{children}</span>;
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-brand-navy text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">About ADApolis</h1>
          <p className="text-base sm:text-lg text-slate-300">The civic engine for Cardano governance</p>
        </div>

        <section className="mb-12 space-y-4 text-slate-300 leading-relaxed">
          <H2>What is ADApolis</H2>
          <p>
            Cardano is governed on-chain, but following it is hard: hundreds of DReps, dozens of proposals, and votes
            buried in block explorers. ADApolis makes it something you can follow, play and collect.
          </p>
          <p>
            We score every DRep on how reliably they do the job, run monthly seasons with a free game, turn each DRep into
            a trading card, preserve each season&apos;s champions as Champion Cards, and help delegators find a DRep who
            actually votes the way they think. The goal is more people paying attention to governance, more DReps doing it
            well, and voting power spread across more hands.
          </p>
        </section>

        <section className="mb-12">
          <H2>What you can do here</H2>
          <div className="grid sm:grid-cols-2 gap-4">
            {FEATURES.map((f) => (
              <Link
                key={f.href}
                href={f.href}
                className="block border border-slate-800 bg-slate-900/50 p-4 hover:border-blue-500/60 transition-colors"
              >
                <p className="font-semibold text-slate-100 mb-1">{f.title} →</p>
                <p className="text-sm text-slate-400 leading-relaxed">{f.body}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mb-12 space-y-4 text-slate-300 leading-relaxed">
          <H2>What is a DRep</H2>
          <p>
            A DRep (Delegated Representative) votes on Cardano governance actions such as treasury withdrawals, parameter
            changes and constitutional updates. Introduced by CIP-1694, DReps can be individuals, organizations or scripts.
          </p>
          <p>
            Any ADA holder can delegate their voting power to a DRep without moving or locking their ADA, and can change
            DRep at any time. Delegators can also choose the built-in Abstain or No Confidence options. A DRep&apos;s votes
            carry the weight of all the ADA delegated to them, which is why it matters who your DRep is and whether they
            show up.
          </p>
        </section>

        <section className="mb-12 space-y-4 text-slate-300 leading-relaxed">
          <H2>How scoring works</H2>
          <p>
            <B>GovScore</B> (career) is the share of eligible actions a DRep voted on, adjusted for how long their record
            is so that 5 of 5 doesn&apos;t outrank 159 of 164, then gently dampened for very large ADA holdings.
          </p>
          <p>
            <B>Season points</B> (this season) reward voting (+10), attaching a rationale (+10), writing a fresh one (+5),
            voting early (+5) and clean-epoch streaks (up to +20), and take 5 points for each action a DRep let close
            without voting.
          </p>
          <p>
            Data comes from the Cardano blockchain via Koios and refreshes every 6 hours. The{" "}
            <Link href="/methodology" className="text-blue-400 hover:text-blue-300">
              methodology
            </Link>{" "}
            page has every formula, threshold and worked example.
          </p>
        </section>

        <section id="game" className="mb-12 space-y-4 text-slate-300 leading-relaxed scroll-mt-24">
          <H2>The game</H2>
          <p>
            Pick five DReps before each season starts. Your team scores the season points those DReps earn for doing the
            job. Read the stats, spot the reliable DReps before everyone else does, and climb the leaderboard. You never
            vote in governance through the game, and DReps gain nothing by voting any particular way.
          </p>

          <H3>A season</H3>
          <Bullets
            items={[
              <>
                <B>6 epochs, about a month.</B> The <B>Preseason</B> (epochs 672–677, 5 December – 4 January) is fully
                playable: draft, leagues, leaderboards and test Champion Cards, but nothing is minted. Season 1 (epochs
                678–683) starts 4 January 2027 with the alpha launch, and every season after follows straight on.
              </>,
              <>
                <B>Draft any time before the lock.</B> The next season&apos;s draft is always open. Change your picks as
                often as you like until rosters lock, 24 hours after the season&apos;s first epoch begins.
              </>,
              <>
                <B>Watch it play out.</B> Points update every 6 hours on the leaderboard, and the Discord posts a recap
                each epoch.
              </>,
            ]}
          />

          <H3>Your team</H3>
          <Bullets
            items={[
              <>
                <B>Free.</B> Connect a Cardano wallet and sign a message. No transaction, no fee, nothing staked.
              </>,
              <>
                <B>Five different DReps</B>, any registered DRep, one team per wallet per season. There&apos;s no salary
                cap: the underdog multiplier is the balance.
              </>,
              <>
                <B>Underdog multiplier.</B> Smaller DReps (by delegated ADA and number of delegators) multiply the points
                they <em>gain</em> for your team, up to 1.5×. It&apos;s locked when you pick them, and losses are never
                multiplied, so backing a small DRep never costs you more than backing a big one.
              </>,
              <>
                <B>If a DRep retires</B> (deregisters) mid-season, you get one free replacement for that slot. Points
                they already earned stay on your team.
              </>,
            ]}
          />

          <H3>Where you compete</H3>
          <Bullets
            items={[
              <>
                <B>The global game</B>: everyone&apos;s main leaderboard, and the one that wins Season Trophies. Teams
                opt in when they save (on by default).
              </>,
              <>
                <B>Public leagues</B> anyone can join, and <B>private leagues</B> by invite link, each with its own
                leaderboard and league champion. Your one team can be in the global game and any number of leagues.
                (Leagues arrive with Season 1.)
              </>,
              <>
                <B>Bragging rights only in leagues.</B> No betting pools, in ADA or NFTs. Staking something of value on
                the result would make it gambling, which is illegal in Hawaii, where ADApolis is based.
              </>,
            ]}
          />

          <H3>Playing for prizes</H3>
          <p>
            Anyone can play for fun. To compete for Season Trophies and Champion Cards, your wallet must{" "}
            <B>delegate its vote with at least 100 ADA</B>: to any DRep you like, or to Abstain or No Confidence. The
            delegation must start before the season&apos;s first epoch, and the 100 ADA must still be there in the
            snapshot when the season ends. It&apos;s checked from Cardano&apos;s own per-epoch stake snapshot, so the
            same ADA can&apos;t qualify two wallets, and it never matters which DRep you chose. The draft page tells you
            where you stand, and{" "}
            <Link href="/match" className="text-blue-400 hover:text-blue-300">
              Find My DRep
            </Link>{" "}
            helps you choose if you haven&apos;t delegated yet.
          </p>

          <H3>What you can win</H3>
          <Bullets
            items={[
              <>
                <B>Season Trophies:</B> the top 3 qualifying teams in the global game each season win a one-of-one
                Team Trophy NFT (gold, silver, bronze) with the team name, final points and their five picks. The top 3
                DReps get a DRep Trophy. The top 10 teams get a Finalist badge.
              </>,
              <>
                <B>Champion Cards:</B> if your team finishes in the top 25 qualifying teams, you can claim the Champion
                Card of every DRep on it who finished in the season&apos;s top 10 (below).
              </>,
              <>
                <B>No ADA prizes and no paid entry.</B> The game is free to play, and it stays that way unless a lawyer
                confirms anything else is allowed.
              </>,
            ]}
          />
          <p>
            <Link href="/draft" className="text-blue-400 hover:text-blue-300">
              Draft your team →
            </Link>
          </p>
        </section>

        <section id="champion-cards" className="mb-12 space-y-4 text-slate-300 leading-relaxed scroll-mt-24">
          <H2>Champion Cards (NFTs)</H2>
          <CollectiblesNotice />
          <p>
            At the end of every season, the top 10 DReps by season points are preserved as Champion Cards: Cardano NFTs of
            their card exactly as it stood at the season&apos;s final whistle. The live card on this site keeps evolving;
            a Champion Card never changes. <B>Season 1&apos;s Champion Cards are the Genesis set.</B> The Preseason
            produces test Champion Cards so you can see how it works; they are never minted.
          </p>

          <H3>Who gets one</H3>
          <Bullets
            items={[
              <>
                <B>The DRep:</B> 5 copies of their own card, to keep, gift or sell.
              </>,
              <>
                <B>Every top-25 qualifying team that drafted them:</B> 1 copy.
              </>,
              <>
                <B>Claim within 7 days, or never.</B> One hard deadline for everyone, DReps included. Unclaimed copies
                are never minted, and then the supply is fixed forever. Each copy is numbered (&ldquo;3 of 12&rdquo;),
                and nobody, ADApolis included, can mint more.
              </>,
              <>
                <B>Delegating earns nothing.</B> Where you delegate is your own choice; no DRep&apos;s delegators get
                cards for backing them.
              </>,
            ]}
          />

          <H3>Editions</H3>
          <Bullets
            items={[
              <>
                <B>Gold Champion</B> for the season&apos;s #1 DRep, <B>Silver</B> for #2, <B>Bronze</B> for #3, and{" "}
                <B>Holo</B> for #4–10.
              </>,
              <>
                Each card carries the season, edition, rank, season points, GovScore, Power, Stamina, XP, Charisma and
                abilities, plus a Genesis stamp for Season 1.
              </>,
            ]}
          />

          <H3>Claiming and costs</H3>
          <Bullets
            items={[
              <>
                <B>ADApolis charges nothing.</B> You pay only Cardano&apos;s own network fee and the minimum ADA every NFT
                carries (about 1.5–2 ADA in total, most of which stays with the NFT).
              </>,
              <>
                <B>No packs and no paid extra copies</B>, for anyone, DReps included.
              </>,
              <>
                <B>A 5% royalty</B> on resales goes to the ADApolis project wallet to fund the platform. Marketplaces
                honour it voluntarily.
              </>,
            ]}
          />

          <H3>Collector&apos;s Cup editions (from Season 2)</H3>
          <p>
            Every copy of a prize is the same, except the <B>Collector&apos;s Cup edition</B>: the same card or trophy
            with its own frame and trait. It replaces your regular copy, so supply never grows. You qualify if your
            wallet holds the right Champion Card in the snapshot at the season&apos;s end (cards bought after that
            don&apos;t count):
          </p>
          <Bullets
            items={[
              <>
                <B>Team copy of a Champion Card:</B> any Champion Card of that DRep.
              </>,
              <>
                <B>Team Trophy:</B> a Champion Card of a DRep you drafted that season who finished in the top 10. Holding
                without drafting doesn&apos;t count; drafting without holding gets the regular trophy.
              </>,
              <>
                <B>DReps</B> (their own cards and DRep Trophy): an earlier Champion Card of their own.
              </>,
            ]}
          />

          <H3>Every NFT in a season</H3>
          <Bullets
            items={[
              <>
                <B>Champion Cards:</B> the top 10 DReps (Gold, Silver, Bronze, then 7 Holo). Each has up to 30 copies: 5
                for the DRep and 1 for each of up to 25 qualifying teams that drafted them. A team gets a copy of every
                top-10 DRep on its team, so up to 5.
              </>,
              <>
                <B>Season Trophies:</B> 6 one-of-ones: Gold, Silver and Bronze Team Trophies for the top 3 qualifying
                teams, and DRep Trophies for the top 3 DReps.
              </>,
              <>
                <B>At most 181 a season</B> (50 DRep copies, up to 125 team copies, 6 trophies), usually far fewer: unclaimed copies are never minted. The Preseason mints
                none.
              </>,
            ]}
          />

          <H3>What they are, and aren&apos;t</H3>
          <p>
            Champion Cards are <B>pure collectibles</B>: a record of a season and a nod to DReps who did the work. They
            carry no votes, no say over ADApolis, no share of royalties and no promise of value. Collect them because you
            like them.
          </p>
          <p className="text-sm text-slate-400">
            Planned: the first cards are minted on Cardano&apos;s testnet before any real mint, and the first real mint
            (Season 1, after it ends in early February 2027) follows a legal review. Details may still change; the
            methodology page always has the current rules.
          </p>
        </section>

        <section className="mb-12">
          <H2>Our principles</H2>
          <ul className="space-y-4">
            {PRINCIPLES.map(([title, body]) => (
              <li key={title} className="flex gap-3">
                <span className="text-blue-400 font-bold mt-1">•</span>
                <div>
                  <p className="text-slate-100 font-semibold">{title}</p>
                  <p className="text-slate-400">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-12 space-y-4 text-slate-300 leading-relaxed">
          <H2>Join in</H2>
          <p>
            The ADApolis{" "}
            <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
              Discord
            </a>{" "}
            has a feed of every new governance action, season recaps, an Ask a DRep channel, guides for newcomers, and
            channels for DReps, players and collectors. Verified DReps and delegators get roles automatically by linking
            their wallet.
          </p>
          <p>
            Questions, corrections and data issues are welcome there or on X at{" "}
            <a href={X_URL} target="_blank" rel="noopener noreferrer me" className="text-blue-400 hover:text-blue-300">
              {X_HANDLE}
            </a>
            .
          </p>
        </section>

        <div className="mt-16 pt-8 border-t border-slate-800">
          <p className="text-sm text-slate-500">
            ADApolis is independent and not affiliated with Intersect, the Cardano Foundation, IOG or EMURGO. Nothing on this
            site is financial advice or an endorsement of any DRep.
          </p>
          <div className="mt-6 flex flex-wrap gap-6 text-sm">
            <Link href="/scoreboard" className="text-slate-400 hover:text-slate-300 transition-colors">
              DRep Hall of Fame
            </Link>
            <Link href="/methodology" className="text-slate-400 hover:text-slate-300 transition-colors">
              Methodology
            </Link>
            <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-slate-300 transition-colors">
              Discord
            </a>
            <a href={X_URL} target="_blank" rel="noopener noreferrer me" className="text-slate-400 hover:text-slate-300 transition-colors">
              𝕏 {X_HANDLE}
            </a>
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-slate-300 transition-colors">
              GitHub
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
