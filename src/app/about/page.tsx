/**
 * About ADApolis: what the site is, what you can do on it, and the
 * principles it holds to.
 */

import type { ReactNode } from "react";
import Link from "next/link";
import { DISCORD_URL, X_HANDLE, X_URL } from "@/lib/site/social";

export const metadata = {
  title: "About — ADApolis",
  description:
    "ADApolis turns Cardano governance into something you can follow, play and collect: DRep scores, seasons, a free fantasy game, trading cards and Find My DRep.",
};

const FEATURES: Array<{ href: string; title: string; body: ReactNode }> = [
  {
    href: "/scoreboard",
    title: "Scoreboard",
    body: "Every active DRep ranked by GovScore: how reliably it has voted over its whole record, adjusted for how long that record is and gently dampened for very large ADA holdings. Sort by season points or projections too.",
  },
  {
    href: "/season",
    title: "Seasons",
    body: "Governance runs in 6-epoch seasons (about a month). DReps earn points for voting, explaining their votes, voting early and keeping a streak, and lose points for missed actions.",
  },
  {
    href: "/draft",
    title: "Fantasy draft",
    body: "Free to play. Draft 5 DReps each season and score their season points. Smaller DReps carry an underdog multiplier, so scouting reliable newcomers pays off.",
  },
  {
    href: "/leaderboard",
    title: "Leaderboard",
    body: "Every fantasy team's score, pick by pick, updated as the season unfolds.",
  },
  {
    href: "/collection",
    title: "Trading cards",
    body: "Every active DRep has a card with its stats, tier, trends and earned abilities. Flip it for the full record, download it, or share it. Collectible editions are planned.",
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
    body: "Claim your card by signing with your DRep key, then set its art, bio and links. Your stats always come from the chain.",
  },
];

const PRINCIPLES: Array<[string, ReactNode]> = [
  [
    "Process, never outcomes",
    "Scores, points and fantasy results reward how a DRep does the job: showing up, explaining, voting on time. Yes, No and Abstain are worth the same, and nothing depends on whether a proposal passes. We never reward voting with the winning side.",
  ],
  [
    "Neutral",
    "ADApolis takes no position on any proposal, treasury request or policy direction. AI summaries present both sides, quote their sources verbatim and never feed a score.",
  ],
  [
    "Decentralization by design",
    "Find My DRep gives small DReps a visible boost, GovScore gently dampens very large ones, and the fantasy game rewards drafting underdogs, all to help voting power spread out.",
  ],
  [
    "Transparent",
    <>
      Every formula is published on the{" "}
      <Link href="/methodology" className="text-blue-400 hover:text-blue-300">
        methodology
      </Link>{" "}
      page and every number comes from public on-chain data you can check
      yourself. The data behind the site is available as open JSON, and
      the code is 
      <a href="https://github.com/SoulTrainAI/adapolis" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
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
  return (
    <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-blue-400">
      {children}
    </h2>
  );
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-brand-navy text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">
            About ADApolis
          </h1>
          <p className="text-base sm:text-lg text-slate-300">
            The civic engine for Cardano governance
          </p>
        </div>

        <section className="mb-12 space-y-4 text-slate-300 leading-relaxed">
          <H2>What is ADApolis</H2>
          <p>
            Cardano is governed on-chain, but following it is hard: hundreds of
            DReps, dozens of proposals, and votes buried in block explorers.
            ADApolis makes it something you can follow, play and collect.
          </p>
          <p>
            We score every DRep on how reliably it does the job, run monthly
            seasons with a free fantasy game, turn each DRep into a trading
            card, and help delegators find a DRep that actually votes the way
            they think. The goal is more people paying attention to governance,
            more DReps doing it well, and voting power spread across more hands.
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
                <p className="text-sm text-slate-400 leading-relaxed">
                  {f.body}
                </p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mb-12 space-y-4 text-slate-300 leading-relaxed">
          <H2>What is a DRep</H2>
          <p>
            A DRep (Delegated Representative) votes on Cardano governance
            actions such as treasury withdrawals, parameter changes and
            constitutional updates. Introduced by CIP-1694, DReps can be
            individuals, organizations or scripts.
          </p>
          <p>
            Any ADA holder can delegate their voting power to a DRep without
            moving or locking their ADA, and can change DRep at any time.
            Delegators can also choose the built-in Abstain or No Confidence
            options. A DRep&apos;s votes carry the weight of all the ADA
            delegated to it, which is why it matters who your DRep is and
            whether it shows up.
          </p>
        </section>

        <section className="mb-12 space-y-4 text-slate-300 leading-relaxed">
          <H2>How scoring works</H2>
          <p>
            <span className="text-slate-100 font-semibold">GovScore</span>{" "}
            (career) is the share of eligible actions a DRep voted on, adjusted
            for how long its record is so that 5 of 5 doesn&apos;t outrank 159
            of 164, then gently dampened for very large ADA holdings.
          </p>
          <p>
            <span className="text-slate-100 font-semibold">Season points</span>{" "}
            (this season) reward voting (+10), attaching a rationale (+10),
            writing a fresh one (+5), voting early (+5) and clean-epoch streaks
            (up to +20), and take 5 points for each action a DRep let close
            without voting.
          </p>
          <p>
            Data comes from the Cardano blockchain via Koios and refreshes every
            6 hours. The{" "}
            <Link
              href="/methodology"
              className="text-blue-400 hover:text-blue-300"
            >
              methodology
            </Link>{" "}
            page has every formula, threshold and worked example.
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
            <a
              href={DISCORD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300"
            >
              Discord
            </a>{" "}
            has a feed of every new governance action, season recaps, an Ask a
            DRep channel, guides for newcomers, and channels for DReps and
            fantasy players. Verified DReps and delegators get roles
            automatically by linking their wallet.
          </p>
          <p>
            Questions, corrections and data issues are welcome there or on X at{" "}
            <a
              href={X_URL}
              target="_blank"
              rel="noopener noreferrer me"
              className="text-blue-400 hover:text-blue-300"
            >
              {X_HANDLE}
            </a>
            .
          </p>
        </section>

        <div className="mt-16 pt-8 border-t border-slate-800">
          <p className="text-sm text-slate-500">
            ADApolis is independent and not affiliated with Intersect, the
            Cardano Foundation, IOG or EMURGO. Nothing on this site is financial
            advice or an endorsement of any DRep.
          </p>
          <div className="mt-6 flex flex-wrap gap-6 text-sm">
            <Link
              href="/scoreboard"
              className="text-slate-400 hover:text-slate-300 transition-colors"
            >
              Scoreboard
            </Link>
            <Link
              href="/methodology"
              className="text-slate-400 hover:text-slate-300 transition-colors"
            >
              Methodology
            </Link>
            <a
              href={DISCORD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-slate-300 transition-colors"
            >
              Discord
            </a>
            <a
              href={X_URL}
              target="_blank"
              rel="noopener noreferrer me"
              className="text-slate-400 hover:text-slate-300 transition-colors"
            >
              𝕏 {X_HANDLE}
            </a>
            <a
              href="https://forum.cardano.org/c/governance/140"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-slate-300 transition-colors"
            >
              Governance Forum
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
