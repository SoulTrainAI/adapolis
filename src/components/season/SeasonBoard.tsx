'use client';

import { useState } from 'react';
import { LayoutGrid, List } from 'lucide-react';
import type { SeasonStanding } from '@/lib/season/data';
import { POINT_RULES } from '@/lib/season/points';
import type { CardSummary } from '@/lib/cards/types';
import { TradingCard, formatAda } from '@/components/cards/TradingCard';
import { placeholderCard, useCards } from '@/components/cards/useCards';
import { MyDRepBadge } from '@/components/auth/MyDRepBadge';

const PAGE = 24;

const BREAKDOWN_LABELS: Array<[keyof SeasonStanding['breakdown'], string]> = [
  ['votes', 'Votes'],
  ['rationales', 'Rationales'],
  ['fresh', 'Unique rationales'],
  ['early', 'Early votes'],
  ['streak', 'Streak'],
  ['missed', 'Missed'],
];

/** The standings page's numbers win over the card engine's, so card and table always agree on this page. */
function seasonCard(s: SeasonStanding, base: CardSummary | undefined): CardSummary {
  const card =
    base ??
    placeholderCard({
      drep_id: s.drep_id,
      name: s.profile.name,
      image: s.profile.image,
      ada: s.amount_lovelace / 1_000_000,
      delegators: s.delegator_count,
      do_not_list: s.profile.doNotList,
    });
  return {
    ...card,
    season: {
      ...card.season,
      points: s.points,
      rank: s.rank,
      votes: s.votes_cast,
      missed: s.actions_missed,
      rationales: Math.round(s.breakdown.rationales / POINT_RULES.rationale),
      early: Math.round(s.breakdown.early / POINT_RULES.early),
    },
  };
}

function Row({ s }: { s: SeasonStanding }) {
  const name = s.profile.name ?? `${s.drep_id.slice(0, 12)}…${s.drep_id.slice(-6)}`;
  return (
    <details className="rounded-xl border border-slate-800 bg-slate-900/60">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3">
        <span className="w-8 text-right font-mono text-slate-400">{s.rank}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-white">
            {name} <MyDRepBadge drepId={s.drep_id} className="ml-1 align-middle" />
          </p>
          <p className="text-xs text-slate-400">
            {s.votes_cast} votes · {s.actions_missed} missed · ₳{formatAda(s.amount_lovelace / 1_000_000)} · {s.delegator_count.toLocaleString()} delegators
          </p>
        </div>
        {s.underdog > 1.05 && (
          <span className="hidden rounded-full border border-amber-800/60 bg-amber-900/40 px-2 py-0.5 text-xs text-amber-300 sm:inline" title="Underdog multiplier a fantasy team would get for drafting this DRep">
            {s.underdog.toFixed(2)}× underdog
          </span>
        )}
        <span className="w-16 text-right text-xl font-bold text-white">{s.points}</span>
      </summary>
      <div className="grid grid-cols-3 gap-2 px-4 pb-4 pt-1 text-center sm:grid-cols-6">
        {BREAKDOWN_LABELS.map(([key, label]) => (
          <div key={key} className="rounded-lg bg-slate-800/60 py-2">
            <p className={`font-semibold ${s.breakdown[key] < 0 ? 'text-rose-300' : 'text-white'}`}>{s.breakdown[key]}</p>
            <p className="text-[11px] text-slate-400">{label}</p>
          </div>
        ))}
      </div>
    </details>
  );
}

export function SeasonBoard({ standings }: { standings: SeasonStanding[] }) {
  const [view, setView] = useState<'cards' | 'list'>('cards');
  const [shown, setShown] = useState(PAGE);
  const { cards } = useCards();
  const visible = standings.slice(0, view === 'cards' ? shown : standings.length);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">Tap a card for its full season-by-season record.</p>
        <div className="flex overflow-hidden rounded-lg border border-slate-700" role="group" aria-label="View">
          {(
            [
              ['cards', LayoutGrid],
              ['list', List],
            ] as const
          ).map(([v, Icon]) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              aria-pressed={view === v}
              aria-label={v === 'cards' ? 'Card view' : 'List view'}
              className={`px-2.5 py-2 ${view === v ? 'bg-violet-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'}`}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
      </div>

      {view === 'cards' ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {visible.map((s) => (
            <TradingCard key={s.drep_id} variant="season" card={seasonCard(s, cards.get(s.drep_id))} />
          ))}
        </div>
      ) : (
        <ol className="space-y-2">
          {visible.map((s) => (
            <li key={s.drep_id}>
              <Row s={s} />
            </li>
          ))}
        </ol>
      )}

      {view === 'cards' && standings.length > shown && (
        <button type="button" onClick={() => setShown((n) => n + PAGE)} className="text-sm text-violet-300 hover:text-violet-200">
          Show {Math.min(PAGE, standings.length - shown)} more
        </button>
      )}
    </div>
  );
}
