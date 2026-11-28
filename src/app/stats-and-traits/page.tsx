import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { BarChart3 } from 'lucide-react';
import { ABILITY_RULES, TIER_NAMES } from '@/lib/cards/abilities';
import { DREP_CLASSES } from '@/lib/cards/classes';
import { STATS, type StatGroup } from '@/lib/cards/filter';
import { getCards } from '@/lib/cards/data';
import { ABILITY_ICONS, CLASS_ICONS, FALLBACK_ICON } from '@/components/cards/trait-icons';
import { TIPS } from '@/lib/site/glossary';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Stats and Traits — ADApolis',
  description: 'Every stat, badge, class, rarity and NFT trait on the DRep All-Star cards and trophies, and what each one means.',
};

const RARITY: Array<[string, string, string]> = [
  ['Legend', '#1 by GovScore', 'from-yellow-200 via-amber-500 to-yellow-300'],
  ['Silver', '#2', 'from-slate-100 via-slate-400 to-slate-200'],
  ['Bronze', '#3', 'from-orange-300 via-orange-700 to-amber-400'],
  ['Holographic', '#4–10', 'from-fuchsia-400 via-violet-500 to-cyan-400'],
  ['Rare', '#11–50', 'from-sky-300 via-blue-600 to-sky-400'],
  ['Common', 'everyone else', 'from-slate-200 via-slate-400 to-slate-300'],
];

/** What each trait on a minted card or trophy means (CIP-25 metadata keys). */
const NFT_TRAITS: Array<[string, string]> = [
  ['name', 'The card or trophy title.'],
  ['drep_id', 'The DRep’s on-chain ID.'],
  ['set', 'The season it was minted for (Season 1 is the Genesis set).'],
  ['rarity', 'The frame: Legend, Silver, Bronze, Holographic, Rare or Common, from the GovScore rank.'],
  ['card_number', 'GovScore rank out of all ranked DReps when the card was frozen.'],
  ['govscore', 'GovScore when the card was frozen.'],
  ['season_points', 'Points that season.'],
  ['lifetime_votes', 'Career votes cast.'],
  ['lifetime_points', 'Points across every season.'],
  ['seasons_played', 'Seasons with at least one vote.'],
  ['best_season_points', 'Most points in a single season.'],
  ['rationale_pct', 'Share of votes explained with a rationale.'],
  ['archetype', 'The headline badge on the card front.'],
  ['abilities', 'Every badge the DRep holds, with its tier.'],
  ['class', 'Who backs the DRep, from Whale Watcher to Rabble Rouser.'],
  ['rookie', 'Yes if their first votes were in the last two seasons.'],
  ['draft_cost_stars', 'Draft Cost in stars (1–5) at the season’s end.'],
  ['trophy, medal, place', 'Trophies only: DRep or Team Trophy, Gold / Silver / Bronze, and 1st–3rd.'],
  ['winner, team, epochs', 'Trophies only: who won, the five DReps a winning team drafted, and the season’s epochs.'],
  ['edition', 'Trophies only: always 1 of 1.'],
];

const GROUP_TITLE: Record<StatGroup, string> = { Scores: 'Scores', Game: 'The game', Backing: 'Backing', Record: 'Voting record' };

/** Tooltips open with their own label ("Power: …"); under a big title that reads twice. */
function withoutLabel(tip: string): string {
  const rest = tip.replace(/^[^:]{1,20}:\s*/, '');
  return rest.charAt(0).toUpperCase() + rest.slice(1);
}

function Section({ id, title, intro, children }: { id: string; title: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 space-y-3">
      <h2 className="text-2xl font-bold text-white">{title}</h2>
      {intro && <p className="max-w-3xl text-slate-300">{intro}</p>}
      {children}
    </section>
  );
}

export default async function StatsAndTraitsPage() {
  const cards = await getCards()
    .then((p) => p.cards)
    .catch(() => []);
  const classCount = new Map<string, number>();
  const badgeCount = new Map<string, number>();
  for (const c of cards) {
    if (c.drep_class) classCount.set(c.drep_class.id, (classCount.get(c.drep_class.id) ?? 0) + 1);
    for (const a of c.abilities) badgeCount.set(a.id, (badgeCount.get(a.id) ?? 0) + 1);
  }
  const headline: Array<[string, string]> = [
    ['Power', TIPS.power],
    ['Stamina', TIPS.stamina],
    ['XP', TIPS.xp],
    ['Charisma', TIPS.charisma],
  ];

  return (
    <div className="min-h-screen bg-brand-navy px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1200px] space-y-12">
        <header className="space-y-3">
          <h1 className="flex items-center gap-3 text-4xl font-bold">
            <BarChart3 className="h-9 w-9 text-brand-gold" aria-hidden /> Stats and Traits
          </h1>
          <p className="max-w-3xl text-slate-300">
            Everything on a DRep All-Star card or trophy, and what it means. Every stat and badge comes from how a DRep does the job: showing up, voting
            early and explaining their votes. None depends on which way anyone voted. You can search and filter by all of these on the{' '}
            <Link href="/hall-of-fame" className="text-brand-lilac hover:underline">
              Hall of Fame
            </Link>{' '}
            and when you{' '}
            <Link href="/draft" className="text-brand-lilac hover:underline">
              draft a team
            </Link>
            .
          </p>
          <nav aria-label="On this page" className="flex flex-wrap gap-2 text-sm">
            {[
              ['stats', 'Stats'],
              ['badges', 'Badges'],
              ['classes', 'Classes'],
              ['rarity', 'Rarity'],
              ['nft', 'NFT traits'],
            ].map(([id, label]) => (
              <a key={id} href={`#${id}`} className="rounded-full border border-slate-700 px-3 py-1 text-slate-300 hover:border-slate-500 hover:text-white">
                {label}
              </a>
            ))}
          </nav>
        </header>

        <Section id="stats" title="Stats" intro="The four big numbers on every card front, then every stat you can sort and filter by.">
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {headline.map(([label, tip]) => (
              <div key={label} className="rounded-xl border border-brand-gold/30 bg-brand-ink/70 p-4">
                <dt className="font-display text-lg font-bold text-brand-gold-light">{label}</dt>
                <dd className="mt-1 text-sm text-slate-300">{withoutLabel(tip)}</dd>
              </div>
            ))}
          </dl>
          {(['Scores', 'Game', 'Backing', 'Record'] as StatGroup[]).map((g) => (
            <div key={g}>
              <h3 className="mb-2 mt-4 text-sm font-semibold uppercase tracking-wider text-slate-400">{GROUP_TITLE[g]}</h3>
              <dl className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-900/60">
                {STATS.filter((s) => s.group === g && s.key !== 'underdog').map((s) => (
                  <div key={s.key} className="grid gap-1 px-4 py-2.5 sm:grid-cols-[14rem_1fr]">
                    <dt className="font-semibold text-white">{s.label}</dt>
                    <dd className="text-sm text-slate-300">{s.tip}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </Section>

        <Section
          id="badges"
          title="Badges"
          intro={
            <>
              Earned from a DRep’s record. Most come in Bronze, Silver and Gold. The card front shows one as the <strong>archetype</strong>: the
              DRep’s headline badge.
            </>
          }
        >
          <ul className="grid gap-3 md:grid-cols-2">
            {ABILITY_RULES.map((r) => {
              const Icon = ABILITY_ICONS[r.id] ?? FALLBACK_ICON;
              return (
                <li key={r.id} className="flex gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                  <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-200">
                    <Icon className="h-6 w-6" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-white">
                      {r.label} <span className="text-xs font-normal text-slate-500">· {badgeCount.get(r.id) ?? 0} DReps</span>
                    </p>
                    <p className="text-sm text-slate-300">Measures {r.measures}.</p>
                    {r.tiers && (
                      <p className="mt-1 flex flex-wrap gap-2 text-xs">
                        {r.tiers.map((t, i) => (
                          <span key={i} className={['text-orange-300', 'text-slate-200', 'text-amber-300'][i]}>
                            {TIER_NAMES[(i + 1) as 1 | 2 | 3]}: {t}+
                          </span>
                        ))}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </Section>

        <Section
          id="classes"
          title="Classes"
          intro={
            <>
              Who backs a DRep, read from their delegated ADA divided by their delegators (the average delegation). It runs from DReps carried by a few
              very large wallets to DReps carried by a crowd of small ones. A class is a trait only. It never changes anyone’s points.
            </>
          }
        >
          <ol className="space-y-2">
            {DREP_CLASSES.map((c, i) => {
              const Icon = CLASS_ICONS[c.id] ?? FALLBACK_ICON;
              return (
                <li key={c.id} className={`flex items-center gap-3 rounded-xl border p-3 border-sky-500/30 bg-sky-500/5`}>
                  <span className="w-6 text-center text-xs text-slate-500">{i + 1}</span>
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-sky-500/15 text-sky-200">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-white">{c.label}</p>
                    <p className="text-sm text-slate-300">{c.blurb}</p>
                  </div>
                  <span className="text-sm text-slate-400">{(classCount.get(c.id) ?? 0).toLocaleString()} DReps</span>
                </li>
              );
            })}
          </ol>
          <p className="text-xs text-slate-500">Thresholds are fixed in ADA, so a minted card’s class means the same thing in every season.</p>
        </Section>

        <Section id="rarity" title="Rarity" intro="The card’s frame, from its GovScore rank among active DReps.">
          <ul className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {RARITY.map(([label, rule, frame]) => (
              <li key={label} className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-center">
                <div className={`mx-auto mb-2 h-14 w-10 rounded bg-gradient-to-br ${frame}`} aria-hidden />
                <p className="font-semibold text-white">{label}</p>
                <p className="text-xs text-slate-400">{rule}</p>
              </li>
            ))}
          </ul>
          <p className="text-sm text-slate-400">
            Draft Cost (1–5 gold stars) shows next to the name: what the DRep costs in a 10-star team, in proportion to their projected points.
          </p>
        </Section>

        <Section id="nft" title="NFT traits" intro="The traits a minted DRep All-Star card or Season Trophy carries in its on-chain metadata, frozen at the season’s end.">
          <dl className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-900/60">
            {NFT_TRAITS.map(([key, meaning]) => (
              <div key={key} className="grid gap-1 px-4 py-2.5 sm:grid-cols-[14rem_1fr]">
                <dt className="font-mono text-sm text-violet-200">{key}</dt>
                <dd className="text-sm text-slate-300">{meaning}</dd>
              </div>
            ))}
          </dl>
        </Section>
      </div>
    </div>
  );
}
