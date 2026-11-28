/**
 * About ADApolis: what the site is, how the game and the DRep All-Star NFTs work,
 * and the principles it holds to. Rules here follow docs/GAME.md.
 */

import type { ReactNode } from "react";
import Link from "next/link";
import { DISCORD_URL, X_HANDLE, X_URL } from "@/lib/site/social";

export const metadata = {
  title: "About — ADApolis",
  description:
    "Why ADApolis exists and how it works: DRep scores, the monthly Cardanathon, a free DRep game, DRep All-Star NFTs and the DRep Match-maker.",
};

const GITHUB_URL = "https://github.com/SoulTrainAI/adapolis";

const FEATURES: Array<{ href: string; title: string; body: ReactNode }> = [
  {
    href: "/match",
    title: "DRep Match-maker",
    body: "A short quiz that shows which DReps have actually voted the way you think, plus what they say in their own words.  A Decentralization weight (on by default) favors smaller DReps so voting power spreads out.",
  },
  {
    href: "/hot-topics",
    title: "Hot Takes",
    body: "The governance actions being decided now: how DReps are splitting, who explained their vote, and the strongest arguments on each side in DReps' own words.",
  },
  {
    href: "/cardanathon",
    title: "Cardanathon",
    body: "The monthly race between DReps, with live commentary and the Team Leaderboard. DReps earn points for voting, explaining their votes and voting early.",
  },
  {
    href: "/draft",
    title: "Draft Teams",
    body: "Free to play. Draft 5 DReps each season within a 10-star budget and score their season points.",
  },
  {
    href: "/leagues",
    title: "Join Leagues",
    body: "Play your team against friends or the whole community in public and private leagues.",
  },
  {
    href: "/hall-of-fame",
    title: "Hall of Fame",
    body: "Every DRep's card, opening on last season's top finishers, plus the trophy winners. Re-sort by GovScore, season points, projections or, after the DRep Match-maker quiz, your own Alignment.",
  },
  {
    href: "/mint",
    title: "DRep All-Star NFTs",
    body: "Each season's top 10 DReps become DRep All-Star NFTs. Mint the ones you won, and see the official collection.",
  },
  {
    href: "/collection",
    title: "My Collection",
    body: "Your team, a check-up on the DRep you delegate to, and the DRep All-Stars in your wallet.",
  },
  {
    href: "/drep",
    title: "DReps: Claim your profile",
    body: "Sign with your DRep key to set your card's art, bio and links. Your stats always come from the chain.",
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
    "The DRep Match-maker can favor small DReps with a Decentralization weight you control, to help voting power spread out. GovScore never counts size.",
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
    "No fees or subscriptions required. Signing in only signs a message, never a transaction. Quiz answers stay in your browser unless you choose to save them.",
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
            Cardano is an amazing thing, complete with its own{" "}
            <a href="https://cardano.org/constitution/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
              Constitution
            </a>{" "}
            and on-chain representative democracy. But democracy only works if people care enough to have opinions on the issues and
            hold their leaders accountable. DReps work hard as volunteers and need better incentives for consistent, high-quality
            engagement.
          </p>
          <p>
            <B>ADApolis aligns incentives across the Cardano community to promote good governance and civic engagement.</B> We score
            every DRep on how reliably they do the job and run monthly Cardanathon events, where teams of DReps compete for All-Star
            status and exclusive digital collectibles. Our short quiz unlocks an Alignment score that helps ADA holders find a DRep who
            shares their values. The goal: more ADA holders excited about governance, more DReps doing it well, and voting power spread
            across more hands.
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
            <B>GovScore</B> (career) is the game&apos;s points over a DRep&apos;s whole record: points earned ÷ points possible,
            with 5 blank actions to start so 5 of 5 doesn&apos;t outrank 159 of 164.
          </p>
          <p>
            <B>Season points</B> (this season) reward voting (+10), voting early (+5), posting an original rationale (+5)
            and clean-epoch streaks (up to +20). Points are never taken away.
          </p>
          <p>
            Data comes from the Cardano blockchain via Koios: new votes are picked up every hour. The{" "}
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
            job. Read the stats, spot the reliable DReps before everyone else does, and climb the Team Leaderboard.
          </p>

          <H3>A season</H3>
          <Bullets
            items={[
              <>
                <B>6 epochs, about a month.</B> The <B>Preseason</B> (epochs 672–677, 5 December – 4 January) is fully
                playable: draft, leagues, leaderboards and test DRep All-Star cards, but nothing is minted. Season 1 (epochs
                678–683) starts 4 January 2027 with the alpha launch, and every season after follows straight on.
              </>,
              <>
                <B>Draft any time before the lock.</B> The next season&apos;s draft is always open. Change your picks as
                often as you like until rosters lock, 24 hours after the season&apos;s first epoch begins.
              </>,
              <>
                <B>Watch it play out.</B> Points update every hour on the Team Leaderboard, and a recap is posted after
                each epoch.
              </>,
            ]}
          />

          <H3>Your team</H3>
          <Bullets
            items={[
              <>
                <B>Free to play.</B> Connect a Cardano wallet and sign a message. No transaction or fee.
              </>,
              <>
                <B>Five different DReps</B>, any registered DRep, one team per wallet per season, within a{" "}
                <B>10-star Draft Cost</B>. Each DRep costs 1–5 gold stars in proportion to their Projected Points, fixed when you pick
                them. One star is worth a fifth of the season&apos;s top projections (the 99th percentile), so prices rescale every
                season and every star buys about the same expected points. Go for one superstar and fill with long shots, or build a
                balanced team: both can win.
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
                <B>The global game</B>: everyone&apos;s main leaderboard, and the one that wins DRep All-Star Season Trophies. Teams
                opt in when they save (on by default).
              </>,
              <>
                <B>Public leagues</B> anyone can join, and <B>private leagues</B> by invite link, each with its own
                leaderboard and league champion. Your one team can be in the global game and any number of leagues.
              </>,
            ]}
          />

          <H3>Playing for prizes</H3>
          <p>
            Anyone can play for fun. Prizes can only be won by global teams whose wallet delegates its vote (to any DRep, Abstain or No
            Confidence) since before the season&apos;s first epoch, with at least 100 ADA in the stake snapshot at the season&apos;s end.
            Cardano&apos;s own per-epoch stake snapshot is used, so the same ADA can&apos;t qualify two wallets. The draft page tells you
            where you stand, and the{" "}
            <Link href="/match" className="text-blue-400 hover:text-blue-300">
              DRep Match-maker
            </Link>{" "}
            helps you choose if you haven&apos;t delegated yet.
          </p>

          <H3>What you can win</H3>
          <Bullets
            items={[
              <>
                <B>DRep All-Star Season Trophies:</B> six one-of-ones each season. The top 3 qualifying teams in the global game win a
                Team Trophy (gold, silver, bronze) with the team name, final points and their five picks; the top 3 DReps win a DRep
                Trophy.
              </>,
              <>
                <B>DRep All-Star NFTs:</B> if your team finishes in the top 25 qualifying teams, you can mint the DRep All-Star card of
                every DRep on it who finished in the season&apos;s top 10 (below).
              </>,
              <>
                <B>Free to play.</B> No ADA prizes and no paid entry. Prizes need a wallet delegated with 100+ ADA.
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
          <H2>DRep All-Star NFTs</H2>
          <p>
            Every DRep has a card showing real-time stats that update daily. At the end of each season, the top 10 DReps&apos; cards become
            mintable as official DRep All-Star NFTs, digital collectibles that commemorate the historic victory. The top 3 winning DReps and
            Teams can also mint the exclusive DRep All-Star Season Trophy NFT to showcase their success. A minted card is frozen as it stood
            at the season&apos;s final whistle; the live card keeps evolving. <B>Season 1&apos;s DRep All-Stars are the Genesis set.</B> The
            Preseason produces test cards so you can see how it works; they are never minted.
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
                <B>Team Test Mint.</B> The first pressing of each card is minted by the ADApolis team to ensure quality. Test Pressing
                cards may be used or distributed for promotion or other business needs at the team&apos;s discretion.
              </>,
              <>
                <B>Mint during the window, or never.</B> The mint window opens 48 hours after the season ends and closes 3 epochs (about
                15 days) after it ends, for everyone, DReps included. Unclaimed copies are never minted, and then the supply is fixed
                forever. Each copy is numbered (&ldquo;3 of 12&rdquo;).
              </>,
            ]}
          />

          <H3>Editions</H3>
          <Bullets
            items={[
              <>
                <B>Gold</B> for the season&apos;s #1 DRep, <B>Silver</B> for #2, <B>Bronze</B> for #3, and{" "}
                <B>Holographic</B> for #4–10.
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
            wallet holds the right DRep All-Star card in the snapshot at the season&apos;s end (cards bought after that
            don&apos;t count):
          </p>
          <Bullets
            items={[
              <>
                <B>Team copy of a DRep All-Star card:</B> any DRep All-Star card of that DRep.
              </>,
              <>
                <B>Team Trophy:</B> a DRep All-Star card of a DRep you drafted that season who finished in the top 10. Holding
                without drafting doesn&apos;t count; drafting without holding gets the regular trophy.
              </>,
              <>
                <B>DReps</B> (their own cards and DRep Trophy): an earlier DRep All-Star card of their own.
              </>,
            ]}
          />

          <H3>Every NFT in a season</H3>
          <Bullets
            items={[
              <>
                <B>DRep All-Star cards:</B> the top 10 DReps (Gold, Silver, Bronze, then 7 Holographic). Each has up to 30 copies: 5 for
                the DRep and 1 for each of up to 25 qualifying teams that drafted them. A team gets a copy of every top-10 DRep on its
                team, so up to 5.
              </>,
              <>
                <B>DRep All-Star Season Trophies:</B> 6 one-of-ones: Gold, Silver and Bronze Team Trophies for the top 3 qualifying teams,
                and DRep Trophies for the top 3 DReps.
              </>,
              <>
                <B>At most 181 a season</B> (50 DRep copies, up to 125 team copies, 6 trophies), plus one Team Test Mint pressing of each
                of the 10 cards (191 in all). Usually far fewer: unclaimed copies are never minted. The Preseason mints none.
              </>,
            ]}
          />
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
            <Link href="/hall-of-fame" className="text-slate-400 hover:text-slate-300 transition-colors">
              Hall of Fame
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
