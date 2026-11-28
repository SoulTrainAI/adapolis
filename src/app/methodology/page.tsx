/**
 * Methodology: every rule ADApolis uses to score, rank, match and summarize,
 * in enough detail to check our numbers against the chain.
 */

import type { ReactNode } from "react";
import { ABILITY_RULES, TIER_NAMES } from "@/lib/cards/abilities";
import { PROVISIONAL_BELOW_ELIGIBLE } from "@/lib/scoring/confidence";
import { BLANK_ACTIONS } from "@/lib/scoring/govscore-v2";
import { POINT_RULES, SEASON_LENGTH_EPOCHS } from "@/lib/season/points";
import { ROSTER_SIZE } from "@/lib/season/fantasy";
import { MATCH_RULES } from "@/lib/match/topics";

export const metadata = {
  title: "Methodology — ADApolis",
  description:
    "How ADApolis scores DReps: GovScore, ADA-power dampening, season points, the game, DRep All-Star NFTs, trading cards, the DRep Match-maker and AI summaries.",
};

const LAST_UPDATED = "November 2026";
const MAX_UNDERDOG = 1 + POINT_RULES.maxUnderdogBonus;

function Section({
  id,
  n,
  title,
  children,
}: {
  id: string;
  n: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="space-y-5 scroll-mt-24">
      <h2 className="text-2xl sm:text-3xl font-bold text-white">
        {n}. {title}
      </h2>
      {children}
    </section>
  );
}

function Bullets({
  items,
  mark = "•",
  markClass = "text-violet-400",
}: {
  items: ReactNode[];
  mark?: string;
  markClass?: string;
}) {
  return (
    <ul className="space-y-2 text-slate-300">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span className={`${markClass} flex-shrink-0`}>{mark}</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function Formula({ children }: { children: string }) {
  return (
    <pre className="bg-slate-950 border border-slate-700 rounded p-4 overflow-x-auto text-sm font-mono text-slate-200">
      {children}
    </pre>
  );
}

function P({
  children,
  muted = false,
}: {
  children: ReactNode;
  muted?: boolean;
}) {
  return (
    <p
      className={
        muted
          ? "text-slate-400 text-sm leading-relaxed"
          : "text-slate-300 leading-relaxed"
      }
    >
      {children}
    </p>
  );
}

function A({ href, children }: { href: string; children: ReactNode }) {
  const external = href.startsWith("http");
  return (
    <a
      href={href}
      className="text-violet-400 hover:text-violet-300"
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {children}
    </a>
  );
}

const DAMPENING = [
  ["0", "1.000", "90.0"],
  ["100K", "0.990", "89.1"],
  ["1M", "0.930", "83.7"],
  ["10M", "0.793", "71.4"],
  ["100M", "0.666", "60.0"],
];

const CONTENTS = [
  ["overview", "Overview"],
  ["govscore", "GovScore"],
  ["dampening", "ADA-power dampening"],
  ["not-measured", "What we never score"],
  ["season-points", "Season points"],
  ["game", "The game"],
  ["champion-cards", "DRep All-Star NFTs"],
  ["cards", "Trading cards"],
  ["card-abilities", "Card abilities"],
  ["find-my-drep", "DRep Match-maker"],
  ["stated-positions", "Stated positions (AI)"],
  ["hot-topics", "Hot Takes"],
  ["data", "Data, refresh and transparency"],
  ["limitations", "Limitations"],
];

export default function MethodologyPage() {
  let n = 0;
  const next = () => ++n;
  return (
    <div className="min-h-screen bg-brand-navy text-slate-100 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-12">
        <div className="space-y-4">
          <h1 className="text-4xl sm:text-5xl font-bold text-white">
            ADApolis Methodology
          </h1>
          <p className="text-base sm:text-lg text-slate-300">
            Every rule we use to score, rank, match and summarize DReps, in
            enough detail to check our numbers against the chain.
          </p>
          <p className="text-xs sm:text-sm text-slate-400">
            Last updated: {LAST_UPDATED}
          </p>
          <nav
            aria-label="Contents"
            className="bg-slate-900/50 border border-slate-800 rounded-lg p-4"
          >
            <ol className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm list-decimal list-inside text-slate-300">
              {CONTENTS.map(([id, label]) => (
                <li key={id}>
                  <A href={`#${id}`}>{label}</A>
                </li>
              ))}
            </ol>
          </nav>
        </div>

        <Section id="overview" n={next()} title="Overview">
          <P>
            ADApolis measures DReps with two scores that answer different
            questions:
          </P>
          <Bullets
            items={[
              <>
                <strong>GovScore</strong> (career): how reliably a DRep has
                voted over their whole record. It drives the{" "}
                <A href="/scoreboard">Scoreboard</A>, the card tiers and the
                DRep&apos;s rank.
              </>,
              <>
                <strong>Season points</strong> (this season): how well a DRep
                did the job over the current 6-epoch season: voting, explaining,
                voting early and not missing actions. They drive the{" "}
                <A href="/cardanathon">season standings</A> and the game.
              </>,
            ]}
          />
          <P>
            Both come only from public on-chain data, by fixed rules published
            on this page. Neither depends on which way a DRep votes or whether a
            proposal passes. AI is used only to summarize what DReps and the
            community have written, never to score anyone.
          </P>
        </Section>

        <Section id="govscore" n={next()} title="GovScore">
          <P>
            GovScore (0–100) is how much of the job a DRep has done over their
            whole career. It uses the same points as the Cardanathon.
          </P>
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6 space-y-3">
            <h3 className="text-xl font-semibold text-slate-100">In three lines</h3>
            <ol className="list-decimal space-y-2 pl-5 text-slate-200">
              <li>
                Every governance action a DRep could vote on is worth{" "}
                {POINT_RULES.vote + POINT_RULES.early + POINT_RULES.freshRationale} points: {POINT_RULES.vote} for
                voting, {POINT_RULES.early} for voting early and {POINT_RULES.freshRationale} for an original
                rationale. Voting every epoch without a miss adds a small streak bonus.
              </li>
              <li>GovScore = the points they earned ÷ the points they could have earned × 100.</li>
              <li>
                Every DRep starts with {BLANK_ACTIONS} blank actions, so a perfect first 5 votes score about 50–60, not 100.
                The blanks matter less and less as their record grows.
              </li>
            </ol>
            <p className="text-sm text-slate-400">
              Very large DReps are then scaled down gently (next section), so reliable smaller DReps can stand out.
            </p>
          </div>
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-slate-100">What that looks like</h3>
            <div className="bg-slate-900/30 border border-slate-700 rounded p-4 text-sm text-slate-300 space-y-2">
              <p>Votes on everything, early, explaining each vote in their own words → <strong className="text-slate-100">about 95</strong></p>
              <p>Votes on everything, early, but never explains → <strong className="text-slate-100">about 80</strong></p>
              <p>Explains every vote but always votes late → <strong className="text-slate-100">about 80</strong></p>
              <p>Votes on half the actions, never explains → <strong className="text-slate-100">about 35</strong></p>
            </div>
          </div>
          <Bullets
            items={[
              <>
                <strong>Yes, No and Abstain</strong> score exactly the same.
                GovScore never looks at which way anyone voted.
              </>,
              <>
                <strong>Actions they could vote on:</strong> actions that closed
                while they were registered, plus open ones they&apos;ve already
                voted on. A vote can&apos;t be missed until its window closes.
              </>,
              <>
                <strong>Original rationale:</strong> not identical to any
                rationale posted before, by them or anyone else.
              </>,
              <>
                <strong>Provisional:</strong> DReps with fewer than{" "}
                {PROVISIONAL_BELOW_ELIGIBLE} actions are marked provisional.
              </>,
              <>
                <strong>Participation</strong> (votes cast ÷ actions they could
                vote on) is shown separately on every card, as Stamina.
              </>,
              <>
                <strong>Who is ranked:</strong> by default the Scoreboard covers{" "}
                <em>active</em> DReps: registered, at least one vote cast, and
                some ADA delegated.
              </>,
              <>
                <strong>History:</strong> until 27 November 2026 GovScore was
                participation only. Trend lines are recalculated with today&apos;s
                rules.
              </>,
            ]}
          />
        </Section>

        <Section id="dampening" n={next()} title="ADA-power dampening">
          <P>
            GovScore multiplies the raw score by a factor that shrinks gently as
            delegated ADA grows. It surfaces reliable, under-delegated DReps
            without punishing large DReps for being trusted.
          </P>
          <Formula>
            {`D = 1 / (1 + log₁₀(ADA_M + 1) / 4)      ADA_M = delegated ADA in millions`}
          </Formula>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-700 text-slate-100">
                  <th className="text-left py-3 px-4 font-semibold">
                    ADA delegated
                  </th>
                  <th className="text-center py-3 px-4 font-semibold">
                    Factor D
                  </th>
                  <th className="text-center py-3 px-4 font-semibold">
                    Raw 90.0 becomes
                  </th>
                </tr>
              </thead>
              <tbody className="text-slate-300 font-mono">
                {DAMPENING.map(([ada, d, adj]) => (
                  <tr key={ada} className="border-b border-slate-800">
                    <td className="py-3 px-4">{ada}</td>
                    <td className="text-center py-3 px-4">{d}</td>
                    <td className="text-center py-3 px-4">{adj}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <P>
            <strong>Participation still dominates.</strong> A 93% DRep with 100M
            ADA scores 93.0 × 0.666 = 61.9; a 60% DRep with no delegation scores
            60.0. Dampening breaks near-ties; it can&apos;t lift a weak record
            over a strong one by much. The logarithm means each tenfold increase
            in ADA costs a similar, modest step.
          </P>
        </Section>

        <Section id="not-measured" n={next()} title="What we never score">
          <div className="bg-violet-950/30 border border-violet-800 rounded-lg p-6 space-y-3">
            <h3 className="text-lg font-semibold text-violet-200">
              The Cardinal Rule
            </h3>
            <P>
              <strong className="text-violet-100">
                Scores, points, abilities and game results come from how a
                DRep does the job, never from how they vote.
              </strong>
            </P>
            <P>
              Yes, No and Abstain are worth the same, and nothing depends on
              whether a proposal passed. Rewarding the winning side would turn
              governance into a bet on outcomes and push DReps to vote with the
              crowd. ADApolis takes no position on any proposal, treasury
              request or policy direction.
            </P>
          </div>
          <Bullets
            mark="✗"
            markClass="text-red-400"
            items={[
              <>
                <strong>Vote direction or outcomes.</strong> Never scored. Find
                My DRep uses vote direction only to show you which DReps agree
                with <em>you</em>; it doesn&apos;t rank anyone as right or
                wrong.
              </>,
              <>
                <strong>Rationale quality.</strong> Season points reward
                attaching a rationale and writing a fresh one per action, not
                how good it is. Judging quality by AI would be contested;
                community ratings may come later.
              </>,
              <>
                <strong>Off-chain activity.</strong> Forum posts, social media
                and Discord activity don&apos;t affect any score.
              </>,
              <>
                <strong>Delegator satisfaction.</strong> Not measured yet.
              </>,
            ]}
          />
        </Section>

        <Section id="season-points" n={next()} title="Season points">
          <P>
            A season is {SEASON_LENGTH_EPOCHS} epochs (about 30 days), on a
            fixed grid starting at epoch 666. Season 1 starts at epoch 678;
            windows before that are public previews of the rules. Points are
            added in the epoch they happen:
          </P>
          <ul className="space-y-2 text-slate-300">
            <li>
              <span className="text-emerald-400 font-semibold">
                +{POINT_RULES.vote}
              </span>{" "}
              <strong>Vote</strong> on a governance action. A changed vote
              counts once, at its latest time.
            </li>
            <li>
              <span className="text-emerald-400 font-semibold">
                +{POINT_RULES.freshRationale}
              </span>{" "}
              <strong>Original rationale</strong> attached to the vote
              (CIP-100 anchor): its content can&apos;t be identical to any
              rationale posted before, by this DRep or anyone else (compared by
              the document&apos;s hash). Copies and reused texts earn nothing.
            </li>
            <li>
              <span className="text-emerald-400 font-semibold">
                +{POINT_RULES.early}
              </span>{" "}
              <strong>Early vote</strong>, in the first half of the
              action&apos;s voting window, which gives delegators time to react.
            </li>
            <li>
              <span className="text-emerald-400 font-semibold">
                +{POINT_RULES.streakStep} to +
                {POINT_RULES.streakStep * POINT_RULES.streakCap}
              </span>{" "}
              <strong>Streak</strong>: an epoch where the DRep voted and missed
              nothing is clean. Each clean epoch in a row adds +
              {POINT_RULES.streakStep} more, up to +
              {POINT_RULES.streakStep * POINT_RULES.streakCap} per epoch. Epochs
              with nothing to vote on neither extend nor break a streak.
            </li>
            <li>
              <span className="text-slate-400 font-semibold">0</span>{" "}
              <strong>Missed</strong>: an action closed while the DRep was
              registered and they never voted. No points, and it ends the
              streak. Points are never taken away.
            </li>
          </ul>
          <P muted>
            Card and draft stats derived from season points:{" "}
            <strong>Form</strong> is the average of the DRep&apos;s last 3
            completed seasons; <strong>Projected</strong> is their form, or their
            career average when they have no completed season yet;{" "}
            <strong>Season rank</strong> is among DReps who voted this season.
          </P>
        </Section>

        <Section id="game" n={next()} title="The game">
          <P>
            Pick {ROSTER_SIZE} DReps before each season; your team scores the
            season points they earn. The full rules, in order:
          </P>
          <Bullets
            items={[
              <>
                <strong>Seasons:</strong> {SEASON_LENGTH_EPOCHS} epochs each. The
                Preseason (epochs 672–677, from 5 December 2026) is fully playable
                but its DRep All-Star cards are tests, never minted. Season 1 is epochs
                678–683 (from 4 January 2027); each season follows straight on.
              </>,
              <>
                <strong>Free to play.</strong> Connect a Cardano wallet and sign
                a message to prove it&apos;s yours. No transaction or fee. One
                team per wallet per season.
              </>,
              <>
                <strong>Draft {ROSTER_SIZE} different DReps</strong>, any
                registered DRep, within a 10-star Draft Cost. Stars = Projected
                Points ÷ (99th-percentile projection among active DReps ÷ 5),
                rounded up, from 1 to 5; DReps with no projection cost 1. The
                scale resets every season, and a pick&apos;s cost locks when
                picked. The next season&apos;s draft is
                always open; picks can change until the roster lock, 24 hours
                after the season&apos;s first epoch begins.
              </>,
              <>
                <strong>Team points</strong> are the sum of your DReps&apos;
                season points. Points are never taken away.
              </>,
              <>
                <strong>Retirements:</strong> if a drafted DRep deregisters
                mid-season, you get one free replacement for that slot. Points
                already earned stay.
              </>,
              <>
                <strong>Leaderboards:</strong> the global game (opt in when you
                save; on by default) decides DRep All-Star Season Trophies. Public leagues and
                invite-only private leagues have their own leaderboards; one team
                can be in the global game and any number of leagues. Ties share a
                rank; the team that drafted first is listed first.
              </>,
              <>
                <strong>Prize eligibility:</strong> anyone can play. Prizes can
                only be won by global teams whose wallet delegates its vote (to
                any DRep, Abstain or No Confidence) since before the
                season&apos;s first epoch, with at least 100 ADA in the stake
                snapshot at the season&apos;s end. Snapshots stop the same ADA
                from qualifying two wallets.
              </>,
              <>
                <strong>Rewards:</strong> the top 3 qualifying global teams win a
                one-of-one DRep All-Star Season Trophy NFT (the top 3 DReps win a
                DRep Trophy); each of the top 25 qualifying teams can mint the
                DRep All-Star card of
                every top-10 DRep on their team (next section).
              </>,
            ]}
          />
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6 space-y-4">
            <h3 className="text-xl font-semibold text-slate-100">
              Underdog bonus
            </h3>
            <P>
              A size-based bonus every DRep card shows. It doesn&apos;t change
              game points (until 27 November 2026 it multiplied a team&apos;s
              gains); the DRep Match-maker&apos;s Decentralization weight uses
              it to favor smaller DReps.
            </P>
            <Formula>
              {`smallness = 1 − mean(ADA percentile, delegator percentile)
bonus     = 1 + ${POINT_RULES.maxUnderdogBonus} × smallness        (1.00× to ${MAX_UNDERDOG.toFixed(2)}×)`}
            </Formula>
            <Bullets
              items={[
                <>
                  <strong>Size, not rank.</strong> Percentiles are taken among
                  DReps active in the last finished season, using both delegated
                  ADA and delegator count, since a DRep can be small in either
                  sense. A DRep gains nothing by performing badly on purpose.
                </>,
                <>
                  <strong>Smooth, no cutoff.</strong> There is no threshold to
                  sit just under.
                </>,
                <>
                  <strong>Why it exists:</strong> a few large DReps hold much of
                  the voting power. The bonus lets people who care about
                  decentralization find reliable small DReps to delegate to.
                </>,
              ]}
            />
          </div>
          <P muted>
            Leagues, the global opt-in and retirement replacements arrive with
            Season 1.
          </P>
        </Section>

        <Section id="champion-cards" n={next()} title="DRep All-Star NFTs">
          <P>
            At each season&apos;s end, the top 10 DReps by season points become
            mintable as DRep All-Star NFTs: their card as it stood at the final
            whistle. A minted card never changes; the live card on the site keeps
            evolving. Season 1&apos;s cards are the Genesis set.
          </P>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-2 pr-4 font-semibold">Season rank</th>
                  <th className="py-2 font-semibold">Edition</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["#1", "Gold"],
                  ["#2", "Silver"],
                  ["#3", "Bronze"],
                  ["#4–10", "Holographic"],
                ].map(([rank, edition]) => (
                  <tr key={rank} className="border-t border-slate-800">
                    <td className="py-2 pr-4 font-semibold text-white">{rank}</td>
                    <td className="py-2">{edition}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Bullets
            items={[
              <>
                <strong>Copies:</strong> the DRep gets 5 of their own card, and
                each of the top 25 qualifying teams that drafted them gets 1.
              </>,
              <>
                <strong>Mint window:</strong> opens 48 hours after the season
                ends (time for the ADApolis team to test-mint and check every
                card) and closes 3 epochs after it ends, for everyone, DReps
                included. Unclaimed copies are never minted; then the supply is
                fixed forever and each copy is numbered.
              </>,
              <>
                <strong>Team Test Mint:</strong> the first pressing of each card
                is minted by the ADApolis team to ensure quality. Test Pressing
                cards may be used or distributed for promotion or other business
                needs at the team&apos;s discretion. They are marked as test
                pressings: one per card, 10 a season, on top of the supply below.
              </>,
              <>
                <strong>Snapshots:</strong> prize eligibility and claims are
                recorded when the season ends. Each wallet
                sees its own claims and the number of copies per card is public;
                which wallet owns which team stays private.
              </>,
              <>
                <strong>On the card:</strong> the card front and back image;
                metadata (CIP-25) with season, edition, season rank, season points,
                GovScore, Power, Stamina, XP, Charisma, abilities, set
                (&ldquo;Genesis&rdquo; for Season 1), copy number and supply.
              </>,
              <>
                <strong>Supply is enforced on-chain:</strong> one minting policy
                per season, time-locked to close when the mint window ends, so
                nobody, ADApolis included, can mint more.
              </>,
              <>
                <strong>Cost:</strong> ADApolis charges nothing. Claimers pay the
                Cardano network fee and the minimum ADA an NFT must hold (about
                1.5–2 ADA, most of it staying with the NFT). No packs and no paid
                extra copies, for anyone.
              </>,
              <>
                <strong>Royalty:</strong> a single 5% CIP-27 royalty on resales to
                the ADApolis project wallet. Marketplaces honour it voluntarily.
              </>,
              <>
                <strong>Collector&apos;s Cup editions (from Season 2):</strong>{" "}
                every copy is identical except this edition: same item, own
                frame and trait, replacing the regular one. Checked at the
                season&apos;s end snapshot: a team copy needs a DRep All-Star card
                of that DRep; a Team Trophy needs a DRep All-Star card of a top-10
                DRep the team drafted; a DRep needs an earlier card of their own.
              </>,
              <>
                <strong>Supply per season:</strong> at most 175 DRep All-Star
                cards (50 DRep copies, up to 125 team copies), 6 DRep All-Star
                Season Trophies and 10 Team Test Mint pressings: 191 in all.
              </>,
              <>
                <strong>DRep All-Star Season Trophies</strong> are one-of-one NFTs: Team Trophies
                (top 3 qualifying global teams, with the team name, final points
                and five picks) and DRep Trophies (top 3 DReps).
              </>,
            ]}
          />
          <P muted>
            The full design is in{" "}
            <A href="https://github.com/SoulTrainAI/adapolis/blob/main/docs/GAME.md">
              docs/GAME.md
            </A>
            .
          </P>
        </Section>

        <Section id="cards" n={next()} title="Trading cards">
          <P>
            Every active DRep has a trading card, rebuilt from on-chain data
            every hour. Front and back are fixed layouts so a card reads the
            same on the site, in Discord and as a downloaded image.
          </P>
          <Bullets
            items={[
              <>
                <strong>Frame tier</strong> by GovScore rank among active DReps:
                Legend (#1), Silver (#2), Bronze (#3), Holographic (top 10, with foil),
                Rare (top 50), Common.
              </>,
              <>
                <strong>Stats:</strong> Power = delegated ADA, Stamina =
                participation rate, XP = votes cast of eligible, Charisma =
                delegators. These describe the DRep; only participation feeds
                GovScore.
              </>,
              <>
                <strong>Scores:</strong> GovScore with its change since the last
                season and a trend line; season points with season rank and
                trend.
              </>,
              <>
                <strong>Art, bio and links</strong> come from the DRep&apos;s
                CIP-119 metadata. A DRep can <A href="/drep">claim their card</A>{" "}
                by signing with their DRep key (CIP-95) and replace the art, bio
                and links. Stats can&apos;t be edited.
              </>,
              <>
                <strong>Quote:</strong> the card back prints a complete quote of
                up to 120 characters, never a cut-off one: the whole bio if it
                fits, otherwise its opening sentences, otherwise another whole
                sentence from the profile. If nothing fits, the card has no
                quote until the DRep writes one.
              </>,
              <>
                <strong>Not seeking delegation:</strong> DReps who set CIP-119{" "}
                <code>doNotList</code> are labelled so and left out of Find My
                DRep.
              </>,
            ]}
          />
        </Section>

        <Section id="card-abilities" n={next()} title="Card abilities">
          <P>
            Abilities are badges earned by how a DRep does the job. Most have{" "}
            {TIER_NAMES[1]}, {TIER_NAMES[2]} and {TIER_NAMES[3]} tiers. None
            depends on vote direction or outcomes. The headline ability on the
            front of a card is the rarest one that DRep holds.
          </P>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-2 pr-4 font-semibold">Ability</th>
                  <th className="py-2 pr-4 font-semibold">Counts</th>
                  <th className="py-2 pr-4 font-semibold">{TIER_NAMES[1]}</th>
                  <th className="py-2 pr-4 font-semibold">{TIER_NAMES[2]}</th>
                  <th className="py-2 font-semibold">{TIER_NAMES[3]}</th>
                </tr>
              </thead>
              <tbody>
                {ABILITY_RULES.map((r) => (
                  <tr
                    key={r.id}
                    className="border-t border-slate-800 align-top"
                  >
                    <td className="py-2 pr-4 font-semibold text-white">
                      {r.label}
                    </td>
                    <td className="py-2 pr-4">{r.measures}</td>
                    {r.tiers ? (
                      r.tiers.map((t, i) => (
                        <td key={i} className="py-2 pr-4">
                          {t}
                        </td>
                      ))
                    ) : (
                      <td colSpan={3} className="py-2 text-slate-500">
                        One level
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section id="find-my-drep" n={next()} title="DRep Match-maker">
          <P>
            The <A href="/match">DRep Match-maker</A> quiz compares your answers
            with how DReps have actually voted. Matching uses fixed rules, no
            AI. Answers are scored in your browser; they are saved only if you
            sign in with a wallet and choose to save them, and you can delete
            them at any time.
          </P>
          <Bullets
            items={[
              <>
                <strong>Alignment and GovScore (aligned):</strong> Alignment is
                your values match with a DRep, 0–100%. GovScore (aligned) is
                GovScore × (1 + 0.25 × (Alignment − 50%) ÷ 50%), capped at 100:
                50% alignment leaves it unchanged, 100% raises it by a quarter,
                0% lowers it by a quarter. Both are worked out in your browser,
                shown only to you (in the DRep Match-maker and as sorts on the
                Scoreboard) and never change the public GovScore, which depends on
                whether DReps vote, never how.
              </>,
              <>
                <strong>Who can be matched:</strong> registered DReps with at
                least {MATCH_RULES.minVotesCast} votes and at least{" "}
                {MATCH_RULES.minParticipation * 100}% participation, excluding
                DReps who set <code>doNotList</code>.
              </>,
              <>
                <strong>Your answers:</strong> each statement is rated 1–10 for
                agreement and Not at all / A little / Somewhat / Very for
                importance (weights 0 / 1 / 2 / 3).
              </>,
              <>
                <strong>DRep positions:</strong> measured from votes on the
                relevant actions (e.g. treasury withdrawals), from rationale
                publication rate, or from delegated ADA. Treasury,
                protocol-change, transparency and size positions are ranked
                relative to other DReps.
              </>,
              <>
                <strong>Parameter topics</strong> (pool decentralization,
                staking rewards, fees) use parameter-change votes, classified by
                comparing proposed values with the values in force when
                proposed. A Yes on lowering the minimum pool fee, for example,
                counts as siding with small pools.
              </>,
              <>
                <strong>Thin records:</strong> each position is blended with the
                average DRep as if the DRep had cast{" "}
                {MATCH_RULES.shrinkagePriorVotes} extra average votes, so one
                vote can&apos;t make anyone look extreme. Profiles with fewer
                than 10 votes are labelled early.
              </>,
              <>
                <strong>Real-vote questions</strong> are recent actions on which
                eligible DReps split most evenly. Yes counts as 10, No as 1,
                Abstain or not voting as the midpoint. Answers near the middle
                count less, since they usually mean &quot;unsure&quot;.
              </>,
              <>
                <strong>Match %</strong> is the importance-weighted average
                agreement across every answered topic.
              </>,
              <>
                <strong>Decentralization:</strong> a weight from 0 to 10, on
                at 5 by default, that multiplies a DRep&apos;s score by their
                underdog bonus (the same size-based bonus as the game, up to
                +50% for the smallest DReps): at 10 a DRep gets their full
                bonus, at 0 none. It never changes the match %, and the bonus is
                shown on each DRep.
              </>,
              <>
                <strong>Not yet measurable:</strong> topics nobody has voted on
                yet (e.g. DRep pay) are asked but don&apos;t affect matches
                until DReps state positions.
              </>,
            ]}
          />
          <P muted>
            Most governance actions so far are treasury withdrawals, so matches
            currently lean on treasury attitudes.
          </P>
        </Section>

        <Section
          id="stated-positions"
          n={next()}
          title="Stated positions (AI-summarized)"
        >
          <P>
            The DRep Match-maker can also show what each DRep has <em>said</em> about
            the quiz topics. These are kept apart from voting data and never
            change a vote-based match %, so you can compare what a DRep says
            with what they do.
          </P>
          <Bullets
            items={[
              <>
                <strong>Sources:</strong> only the DRep&apos;s own published
                words: their CIP-119 profile and up to 100 recent distinct vote
                rationales (CIP-100/136), each checked against its on-chain
                hash. Newer writing wins over older.
              </>,
              <>
                <strong>Summarizer:</strong> Claude Haiku records a 1–10 stance
                only when the DRep clearly states a general view. Objections to
                a single proposal don&apos;t count. Leaving a topic out is
                preferred to guessing.
              </>,
              <>
                <strong>Every stance is quoted.</strong> Each must include a
                verbatim quote from its source; any quote that can&apos;t be
                found word for word is discarded along with its stance.
              </>,
              <>
                <strong>Says vs. does:</strong> when a stated stance and the
                voting record on the same topic (3+ votes) differ by half the
                scale or more, results flag it.
              </>,
              <>
                <strong>&quot;What they say&quot; ranking</strong> uses only
                stated positions and needs at least 2 topics in common with
                you.
              </>,
              <>
                <strong>Freshness:</strong> a DRep is re-summarized only when
                their profile or rationales change.
              </>,
            ]}
          />
          <P muted>
            AI summaries can misread nuance. Check the quoted source before
            relying on a stated position.
          </P>
        </Section>

        <Section id="hot-topics" n={next()} title="Hot Takes">
          <P>
            <A href="/hot-topics">Hot Takes</A> lists governance actions open
            for voting: how DReps are splitting by count and by ADA, who has
            explained their vote, and the main arguments on each side.
          </P>
          <Bullets
            items={[
              <>
                <strong>DRep arguments</strong> are summarized from published
                rationales. &quot;For&quot; points may cite only Yes rationales
                and &quot;against&quot; points only No rationales, at most 3 per
                side, each with a verbatim quote and a link to the full
                rationale.
              </>,
              <>
                <strong>Forum discussion</strong> is linked to an action only on
                solid evidence: the action references the thread, a post
                contains the action ID, or the titles closely match. Posts are
                summarized into arguments the same way, each quoting and linking
                its post. Quoted replies are stripped so nobody is credited with
                words they were quoting.
              </>,
              <>
                <strong>Summaries never feed a score.</strong> They are reading
                aids, not judgements.
              </>,
            ]}
          />
        </Section>

        <Section id="data" n={next()} title="Data, refresh and transparency">
          <Bullets
            mark="✓"
            markClass="text-green-400"
            items={[
              <>
                <strong>Source:</strong>{" "}
                <A href="https://api.koios.rest/">Koios</A>, a community-run
                Cardano indexer. Every vote, action, registration and delegation
                can be checked on-chain or on an independent explorer such as{" "}
                <A href="https://gov.tools/">gov.tools</A>.
              </>,
              <>
                <strong>Refresh:</strong> new votes are picked up every hour
                and season points recomputed; the full sync and scoring run every
                6 hours.
              </>,
              <>
                <strong>Open data:</strong> the JSON behind the site is public,
                for example <A href="/api/dreps">/api/dreps</A> (Scoreboard) and{" "}
                <A href="/api/cards">/api/cards</A> (every card&apos;s stats).
                No key needed; please cache and be gentle.
              </>,
              <>
                <strong>Published rules:</strong> every formula and threshold on
                this page is the one in use, and most numbers on it are read
                from the same code that computes the scores. The date above
                changes whenever a rule does.
              </>,
              <>
                <strong>Open source:</strong> the full code is on{" "}
                <A href="https://github.com/SoulTrainAI/adapolis">GitHub</A> under the AGPL-3.0 license, so anyone
                can check exactly how every score is computed.
              </>,
              <>
                <strong>AI is disclosed:</strong> it appears only where this
                page says so, and every AI summary carries a verbatim, linked
                quote.
              </>,
            ]}
          />
        </Section>

        <Section id="limitations" n={next()} title="Limitations">
          <Bullets
            items={[
              <>
                <strong>Attendance isn&apos;t wisdom.</strong> A DRep can vote
                on everything and still reason poorly. A high GovScore says a
                DRep shows up, not that you&apos;ll agree with it.
              </>,
              <>
                <strong>Rationale points reward effort, not quality.</strong> A
                short fresh rationale earns the same as a careful one.
              </>,
              <>
                <strong>Missing metadata.</strong> DReps without CIP-119
                metadata show a generated avatar and no bio. It doesn&apos;t
                mean they&apos;re inactive.
              </>,
              <>
                <strong>Uneven calendar.</strong> Some epochs have many actions
                and others none, so season points vary with the governance
                calendar as well as with effort.
              </>,
              <>
                <strong>Size is a snapshot.</strong> Underdog bonuses use the
                last finished season&apos;s sizes.
              </>,
              <>
                <strong>Indexer lag.</strong> Data can trail the chain slightly,
                and a Koios outage delays updates.
              </>,
            ]}
          />
          <div className="bg-yellow-950/30 border border-yellow-800 rounded-lg p-6">
            <P>
              <strong className="text-yellow-100">Found a mistake?</strong>{" "}
              Report data anomalies or rule suggestions in our{" "}
              <A href="https://discord.gg/64QvF9WWMM">Discord</A>.
            </P>
          </div>
        </Section>

        <section className="pt-8 border-t border-slate-800 space-y-2">
          <P muted>
            <strong>Last updated:</strong> {LAST_UPDATED}
          </P>
          <P muted>
            <strong>Citation:</strong> ADApolis Methodology. ADApolis, 2026.
            adapolis.net/methodology
          </P>
        </section>
      </div>
    </div>
  );
}
