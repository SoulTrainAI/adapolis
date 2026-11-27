'use client';

/**
 * The Scoreboard: every DRep's card, searched, filtered and sorted in the
 * browser with the shared card filters (any combination of stats, badges,
 * class, archetype, rarity and Draft Cost). The search lives in the URL, so
 * any view can be shared. Alignment sorts use the visitor's own quiz answers
 * and never leave their browser.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { TradingCard } from '@/components/cards/TradingCard';
import { useCards } from '@/components/cards/useCards';
import { CardFilters } from '@/components/cards/CardFilters';
import { useAlignment } from '@/components/match/useAlignment';
import type { Alignment } from '@/lib/match/personal';
import type { CardSummary } from '@/lib/cards/types';
import { applyFilters, DEFAULT_SPEC, fromQuery, toQuery, type FilterSpec } from '@/lib/cards/filter';
import { TIPS } from '@/lib/site/glossary';

const PER_PAGE = 50;
const ALIGNMENT_SORTS = ['alignment', 'personal_govscore'];
const POOLS = [
  { value: 'active' as const, label: 'Active' },
  { value: 'registered' as const, label: 'All registered' },
  { value: 'all' as const, label: 'Retired too' },
];

interface ScoreboardClientProps {
  initialEpoch: number;
  /** Which stat to rank by on load (the Cardanathon page opens on season points). */
  initialSort?: string;
}

function SkeletonCard() {
  return <div className="aspect-[5/7] animate-pulse rounded-lg border border-slate-700 bg-slate-800" />;
}

export function ScoreboardClient({ initialEpoch, initialSort = 'govscore' }: ScoreboardClientProps) {
  const defaults = useMemo<FilterSpec>(() => ({ ...DEFAULT_SPEC, sort: initialSort === 'adjusted_govscore' ? 'govscore' : initialSort }), [initialSort]);
  const [spec, setSpec] = useState<FilterSpec>(defaults);
  const [page, setPage] = useState(1);
  const [retired, setRetired] = useState<CardSummary[] | null>(null);
  const { cards, loaded, currentEpoch } = useCards();
  const align = useAlignment();

  // Read a shared search from the URL once, then keep the URL in step.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.toString()) setSpec(fromQuery(p, defaults));
  }, [defaults]);
  const change = useCallback(
    (s: FilterSpec) => {
      setSpec(s);
      setPage(1);
      const q = toQuery(s, defaults).toString();
      window.history.replaceState(null, '', `${window.location.pathname}${q ? `?${q}` : ''}${window.location.hash}`);
    },
    [defaults]
  );

  // Retired DReps are only fetched when someone asks for them.
  useEffect(() => {
    if (spec.pool !== 'all' || retired) return;
    fetch('/api/cards?retired=1')
      .then((r) => (r.ok ? r.json() : { cards: [] }))
      .then((b: { cards: CardSummary[] }) => setRetired(b.cards))
      .catch(() => setRetired([]));
  }, [spec.pool, retired]);

  const all = useMemo(() => [...Array.from(cards.values()), ...(spec.pool === 'all' ? retired ?? [] : [])], [cards, retired, spec.pool]);
  const byAlignment = ALIGNMENT_SORTS.includes(spec.sort);

  const list = useMemo(() => {
    if (!byAlignment) return applyFilters(all, spec);
    const rows = applyFilters(all, { ...spec, sort: 'govscore', order: 'desc' });
    if (!align.byDRep) return rows;
    const key = spec.sort === 'alignment' ? 'alignment' : 'personal';
    const dir = spec.order === 'asc' ? 1 : -1;
    const v = (c: CardSummary) => align.byDRep!.get(c.drep_id)?.[key] ?? null;
    // DReps without enough votes to compare go last.
    return rows.sort((a, b) => {
      const x = v(a);
      const y = v(b);
      if (x === null && y === null) return 0;
      if (x === null) return 1;
      if (y === null) return -1;
      return dir * (x - y);
    });
  }, [all, spec, byAlignment, align.byDRep]);

  const totalPages = Math.max(1, Math.ceil(list.length / PER_PAGE));
  const shown = list.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const loading = !loaded || (spec.pool === 'all' && !retired);

  return (
    <div className="w-full">
      <CardFilters
        spec={spec}
        onChange={change}
        cards={all}
        defaults={defaults}
        resultCount={list.length}
        pools={POOLS}
        extraSorts={[
          { value: 'alignment', label: 'Alignment', disabled: !align.hasQuiz, tip: TIPS.alignment },
          { value: 'personal_govscore', label: 'GovScore (aligned)', disabled: !align.hasQuiz, tip: TIPS.personalGovscore },
        ]}
      />
      {!align.hasQuiz && (
        <p className="-mt-3 mb-5 text-sm text-slate-400">
          Rank by <span title={TIPS.alignment}>Alignment</span> with your own values:{' '}
          <Link href="/match" className="text-brand-lilac hover:underline">
            take the DRep Match-maker quiz →
          </Link>
        </p>
      )}

      {loading ? (
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 xl:gap-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <div className="mb-8 py-12 text-center">
          <p className="text-slate-400">No DReps match all of these filters. Remove one to widen the search.</p>
        </div>
      ) : (
        <div className="mb-8 grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 xl:gap-5">
          {shown.map((c) => (
            <div key={c.drep_id} className="flex min-w-0 flex-col gap-1.5">
              {align.byDRep && <AlignmentStrip a={align.byDRep.get(c.drep_id)} />}
              <TradingCard variant="scoreboard" card={c} />
            </div>
          ))}
        </div>
      )}

      {!loading && totalPages > 1 && (
        <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-800 pt-8 sm:flex-row">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex min-h-[44px] items-center gap-2 rounded border border-slate-700 bg-slate-800 px-4 text-slate-200 hover:border-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChevronLeft size={18} /> Previous
          </button>
          <span className="text-sm text-slate-400">
            Page {page} of {totalPages} · {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, list.length)} of {list.length.toLocaleString()}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="flex min-h-[44px] items-center gap-2 rounded border border-slate-700 bg-slate-800 px-4 text-slate-200 hover:border-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next <ChevronRight size={18} />
          </button>
        </div>
      )}

      <div className="mt-6 text-center text-sm text-slate-500">
        Epoch {currentEpoch ?? initialEpoch}
        {byAlignment && align.byDRep ? ' · Alignment is worked out from your answers, in this browser only' : spec.pool === 'active' ? ' · active means registered, has voted, and holds delegated ADA' : ''}
      </div>
    </div>
  );
}

/** The visitor's Alignment and Personal GovScore for one DRep (only they see it). */
function AlignmentStrip({ a }: { a: Alignment | undefined }) {
  if (!a) {
    return <p className="rounded-lg bg-slate-900/60 px-3 py-1 text-xs text-slate-500">Alignment: not enough votes to compare</p>;
  }
  return (
    <p className="flex items-center justify-between gap-2 whitespace-nowrap rounded-lg bg-brand-violet/15 px-3 py-1 text-xs text-slate-200">
      <span title={TIPS.alignment}>
        Alignment <strong className="text-brand-lilac">{Math.round(a.alignment)}%</strong>
      </span>
      <span title={TIPS.personalGovscore}>
        Personal <strong className="text-white">{a.personal.toFixed(1)}</strong>
      </span>
    </p>
  );
}
