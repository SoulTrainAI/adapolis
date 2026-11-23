'use client';

/**
 * A DRep's full page: the card (tap to flip), plus everything too long for a
 * card back: the whole bio and links, ability details, trend charts, every
 * window played, the vote record and the card's traits.
 */

import Link from 'next/link';
import { BadgeCheck, BookOpen, Dog, ExternalLink, Flame, Globe, Hammer, Loader2, Medal, Shield, Sparkles, Sprout, Sunrise, type LucideIcon } from 'lucide-react';
import { MyDRepBadge } from '@/components/auth/MyDRepBadge';
import { tierFor, type CardAbility, type SeasonLine } from '@/lib/cards/types';
import { BarChart, LineChart } from './Charts';
import { TradingCard, activeSeasons, cardName } from './TradingCard';
import { placeholderCard, useCardDetail, useCards, useJourney } from './useCards';
import { formatAda } from './TradingCard';
import { TIPS } from '@/lib/site/glossary';

const ICONS: Record<string, LucideIcon> = {
  scholar: BookOpen,
  early_bird: Sunrise,
  ironclad: Shield,
  workhorse: Hammer,
  on_fire: Flame,
  veteran: Medal,
  underdog: Dog,
  rookie: Sprout,
  identified: BadgeCheck,
};
const TIER_TEXT: Record<number, string> = { 0: 'text-violet-200', 1: 'text-orange-300', 2: 'text-slate-100', 3: 'text-amber-300' };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">{title}</h2>
      {children}
    </section>
  );
}

function Ability({ a }: { a: CardAbility }) {
  const Icon = ICONS[a.id] ?? Sparkles;
  return (
    <div className="flex items-start gap-2 border border-slate-700 bg-slate-900/60 px-3 py-2">
      <Icon className={`mt-0.5 h-4 w-4 flex-shrink-0 ${TIER_TEXT[a.tier ?? 0]}`} />
      <div>
        <p className={`text-sm font-bold ${TIER_TEXT[a.tier ?? 0]}`}>{a.label}</p>
        <p className="text-xs text-slate-300">{a.detail}</p>
      </div>
    </div>
  );
}

function SeasonHistory({ seasons }: { seasons: SeasonLine[] }) {
  const rows = seasons.filter((s) => s.played || s.in_progress).slice().reverse();
  if (rows.length === 0) return <p className="text-slate-400">No windows played yet.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[36rem] text-right text-sm">
        <thead className="text-xs uppercase tracking-wider text-slate-500">
          <tr>
            <th className="py-1 text-left font-semibold">Window</th>
            <th className="font-semibold">Points</th>
            <th className="font-semibold">Votes</th>
            <th className="font-semibold">Explained</th>
            <th className="font-semibold">Early</th>
            <th className="font-semibold">Missed</th>
            <th className="font-semibold">Streak pts</th>
            <th className="font-semibold">GovScore</th>
          </tr>
        </thead>
        <tbody className="text-slate-200">
          {rows.map((s) => (
            <tr key={s.window} className="border-t border-slate-800">
              <td className="py-1 text-left">
                {s.label} <span className="text-slate-500">({s.start_epoch}–{s.end_epoch})</span>
                {s.in_progress && <span className="ml-1 text-xs text-violet-300">live</span>}
              </td>
              <td className={`font-bold ${s.points < 0 ? 'text-rose-300' : 'text-white'}`}>{s.points}</td>
              <td>{s.votes}</td>
              <td>{s.rationales}</td>
              <td>{s.early}</td>
              <td className={s.missed > 0 ? 'text-rose-300' : ''}>{s.missed}</td>
              <td>{s.streak_points}</td>
              <td>{s.govscore_end === null ? '—' : s.govscore_end.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DrepProfile({ drepId }: { drepId: string }) {
  const { detail, error } = useCardDetail(drepId, true);
  const { cards } = useCards();
  const card = detail?.summary ?? cards.get(drepId) ?? placeholderCard({ drep_id: drepId, name: null, image: null });
  const tier = tierFor(card.rank);

  return (
    <div className="grid gap-10 lg:grid-cols-[22rem_1fr]">
      <div className="mx-auto w-full max-w-[22rem] lg:sticky lg:top-24 lg:self-start">
        <TradingCard card={card} variant="scoreboard" />
        <p className="mt-2 text-center text-xs text-slate-500">Tap the card to flip it.</p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <a href={`/api/cards/${drepId}/image?download=1`} className="border border-slate-700 bg-slate-900 py-2 text-center text-slate-200 hover:border-violet-500 hover:text-white">
            Download card
          </a>
          <a
            href={`https://x.com/intent/tweet?${new URLSearchParams({ text: `${cardName(card)}'s DRep card on @ADApolisdotnet`, url: `https://www.adapolis.net/dreps/${drepId}` })}`}
            target="_blank"
            rel="noopener noreferrer"
            className="border border-slate-700 bg-slate-900 py-2 text-center text-slate-200 hover:border-violet-500 hover:text-white"
          >
            Share on X
          </a>
        </div>
      </div>

      <div className="min-w-0 space-y-8">
        <header className="space-y-2">
          <p className={`text-xs font-bold uppercase tracking-widest ${tier.accent}`}>
            {card.rank !== null ? `#${card.rank} of ${card.total} active DReps · ` : ''}
            {tier.label}
          </p>
          <h1 className="break-words font-display text-4xl font-bold text-white">{cardName(card)}</h1>
          <p className="break-all font-mono text-xs text-slate-500">{drepId}</p>
          <MyDRepBadge drepId={drepId} />
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {!card.do_not_list && (
              <a
                href={`https://gov.tools/connected/drep_directory/${drepId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-violet-600 px-4 py-2 font-semibold text-white hover:bg-violet-500"
              >
                Delegate via GovTool <ExternalLink className="h-4 w-4" />
              </a>
            )}
            <Link href="/drep" className="text-sm text-slate-400 hover:text-white">
              Is this you? Edit this card →
            </Link>
          </div>
        </header>

        {error && <p className="text-rose-300">{error}</p>}
        {!detail && !error && (
          <p className="flex items-center gap-2 text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading the full record…
          </p>
        )}

        {detail && (
          <>
            <Section title="Bio">
              <p className="whitespace-pre-line leading-relaxed text-slate-200">{detail.bio || 'No bio provided.'}</p>
              {detail.links.length > 0 && (
                <div className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
                  {detail.links.map((l) => (
                    <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer nofollow" className="flex min-w-0 items-center gap-2 text-sm text-slate-300 hover:text-white">
                      <Globe className="h-4 w-4 flex-shrink-0 text-slate-500" />
                      <span className="truncate">{l.label}</span>
                    </a>
                  ))}
                </div>
              )}
            </Section>

            {card.abilities.length > 0 && (
              <Section title="Abilities">
                <div className="grid gap-2 sm:grid-cols-2">
                  {card.abilities.map((a) => (
                    <Ability key={a.id} a={a} />
                  ))}
                </div>
                <p className="text-xs text-slate-500">
                  Thresholds are public: <Link href="/methodology#card-abilities" className="text-violet-300 hover:text-violet-200">how abilities are earned</Link>.
                </p>
              </Section>
            )}

            <Section title="Trends">
              <div className="grid gap-6 xl:grid-cols-2">
                <div>
                  <p className="mb-1 text-sm text-slate-300">GovScore at the end of each 6-epoch window</p>
                  <LineChart points={activeSeasons(detail.seasons).map((s) => ({ label: s.label, value: s.govscore_end }))} />
                </div>
                <div>
                  <p className="mb-1 text-sm text-slate-300">Points per season</p>
                  <BarChart points={activeSeasons(detail.seasons).map((s) => ({ label: s.label, value: s.played || s.in_progress ? s.points : null }))} />
                </div>
              </div>
              <p className="text-xs text-slate-500">Points come only from voting, explaining votes and voting on time. Which way a DRep votes never counts.</p>
              <JourneyTrends drepId={drepId} />
            </Section>

            <Section title="Every window played">
              <SeasonHistory seasons={detail.seasons} />
            </Section>

            <Section title="How they voted (not scored)">
              <div className="grid max-w-md grid-cols-3 gap-2 text-center">
                <div className="bg-emerald-900/30 p-2">
                  <p className="text-2xl font-black text-emerald-300">{detail.votes.yes}</p>
                  <p className="text-xs uppercase tracking-widest text-slate-400">Yes</p>
                </div>
                <div className="bg-red-900/30 p-2">
                  <p className="text-2xl font-black text-red-300">{detail.votes.no}</p>
                  <p className="text-xs uppercase tracking-widest text-slate-400">No</p>
                </div>
                <div className="bg-slate-700/40 p-2">
                  <p className="text-2xl font-black text-slate-200">{detail.votes.abstain}</p>
                  <p className="text-xs uppercase tracking-widest text-slate-400">Abstain</p>
                </div>
              </div>
            </Section>

            <Section title="Card traits">
              <p className="text-sm text-slate-400">What this card carries as collectible metadata. Season editions freeze these at the end of each season.</p>
              <dl className="grid gap-x-8 sm:grid-cols-2">
                {Object.entries(detail.metadata).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3 border-b border-slate-800 py-1 text-sm">
                    <dt className="text-slate-500">{k.replace(/_/g, ' ')}</dt>
                    <dd className="truncate text-right text-slate-200" title={String(v)}>
                      {String(v)}
                    </dd>
                  </div>
                ))}
              </dl>
            </Section>
          </>
        )}
      </div>
    </div>
  );
}

const JOURNEY: Array<{ key: 'power' | 'stamina' | 'xp' | 'charisma'; label: string; color: string; tip: string; format: (v: number) => string }> = [
  { key: 'power', label: 'Power: ADA delegated', color: '#a78bfa', tip: TIPS.power, format: (v) => formatAda(v) },
  { key: 'stamina', label: 'Stamina: career participation', color: '#34d399', tip: TIPS.stamina, format: (v) => `${Math.round(v)}%` },
  { key: 'xp', label: 'XP: career votes', color: '#fbbf24', tip: TIPS.xp, format: (v) => String(Math.round(v)) },
  {
    key: 'charisma',
    label: 'Charisma: delegators',
    color: '#38bdf8',
    tip: `${TIPS.charisma} History is estimated from when today's delegators joined; delegators who later left aren't counted.`,
    format: (v) => Math.round(v).toLocaleString(),
  },
];

/** The card back's four journey lines, one chart each, over the last 12 seasons. */
function JourneyTrends({ drepId }: { drepId: string }) {
  const journey = useJourney(drepId, true);
  if (journey === 'error') return <p className="text-sm text-slate-500">Power and Charisma history is unavailable right now.</p>;
  if (!journey) return <p className="text-sm text-slate-500">Loading the journey…</p>;
  return (
    <div className="mt-6 space-y-2">
      <p className="text-sm font-semibold text-white">Journey over the last {journey.length} seasons</p>
      <div className="grid gap-6 sm:grid-cols-2">
        {JOURNEY.map((j) => (
          <div key={j.key} title={j.tip}>
            <p className="mb-1 flex items-center gap-2 text-sm text-slate-300">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: j.color }} /> {j.label}
            </p>
            <LineChart
              points={journey.map((p) => {
                const v = p[j.key];
                return { label: p.label, value: v === null ? null : j.key === 'stamina' ? v * 100 : v };
              })}
              color={j.color}
              height={150}
              fromZero
              max100={j.key === 'stamina'}
              format={j.format}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
