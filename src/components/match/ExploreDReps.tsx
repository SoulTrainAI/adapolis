'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react';
import type { MatchResult } from '@/lib/match/score';
import type { MatchDRep } from '@/lib/match/profiles';
import { MyDRepBadge, useMyDRep } from '@/components/auth/MyDRepBadge';
import { DRepAvatar, ResultCard } from './ResultCard';
import { TradingCard } from '@/components/cards/TradingCard';
import { placeholderCard, useCards } from '@/components/cards/useCards';
import { personalGovScore } from '@/lib/match/personal';
import { TIPS } from '@/lib/site/glossary';
import { CardFilters } from '@/components/cards/CardFilters';
import { applyFilters, DEFAULT_SPEC, type FilterSpec } from '@/lib/cards/filter';
import type { CardSummary } from '@/lib/cards/types';

type WeightKey = 'values' | 'track' | 'stamina' | 'xp' | 'insight' | 'power' | 'charisma' | 'decent';
type Weights = Record<WeightKey, number>;
/** Weights that add up a DRep's score; Decentralization then multiplies it. */
const ADDITIVE: WeightKey[] = ['values', 'track', 'stamina', 'xp', 'insight', 'power', 'charisma'];
// The list's own sorts, on top of every card stat.
const EXPLORE_DEFAULTS: FilterSpec = { ...DEFAULT_SPEC, pool: 'registered', sort: 'personal' };

const WEIGHTS_KEY = 'adapolis.explore.weights.v1';

const SLIDERS: Array<{ key: WeightKey; label: string; help: string; bipolar?: [string, string] }> = [
  { key: 'values', label: 'Values', help: 'How closely they vote the way you answered' },
  { key: 'track', label: 'Track record', help: 'GovScore: long, consistent participation' },
  { key: 'stamina', label: 'Stamina', help: 'Share of votes they showed up for' },
  { key: 'xp', label: 'XP', help: 'Total votes cast' },
  { key: 'insight', label: 'Insight', help: 'How often they explain their votes' },
  { key: 'power', label: 'Power', help: 'ADA delegated to them', bipolar: ['Smaller', 'Bigger'] },
  { key: 'charisma', label: 'Charisma', help: 'Number of delegators', bipolar: ['Fewer', 'More'] },
  {
    key: 'decent',
    label: 'Decentralization',
    help: 'Boosts smaller DReps by their underdog bonus: at 10 they get the full bonus (up to +50%), at 0 none',
  },
];

const PRESETS: Array<{ id: string; label: string; weights: Weights; needsAnswers?: boolean }> = [
  { id: 'values', label: 'Match my values', needsAnswers: true, weights: { values: 10, track: 4, stamina: 3, xp: 2, insight: 3, power: 0, charisma: 0, decent: 5 } },
  { id: 'reliable', label: 'Reliable & thoughtful', weights: { values: 0, track: 8, stamina: 6, xp: 3, insight: 8, power: 0, charisma: 0, decent: 5 } },
  { id: 'balanced', label: 'Balanced', needsAnswers: true, weights: { values: 6, track: 6, stamina: 4, xp: 3, insight: 5, power: 0, charisma: 1, decent: 5 } },
];

interface Row {
  drep: MatchDRep;
  result: MatchResult | null;
  parts: Record<WeightKey, number>;
  score: number;
  /** Share added by the Decentralization weight (0.25 = +25%). */
  bonus: number;
}

function percentiles(values: number[]): (v: number) => number {
  const sorted = values.slice().sort((a, b) => a - b);
  return (v) => {
    if (sorted.length <= 1) return 0.5;
    let lo = 0;
    while (lo < sorted.length && sorted[lo] < v) lo++;
    let hi = lo;
    while (hi < sorted.length && sorted[hi] === v) hi++;
    return (lo + Math.max(0, hi - lo - 1) / 2) / (sorted.length - 1);
  };
}

function loadWeights(): Weights | null {
  try {
    const raw = localStorage.getItem(WEIGHTS_KEY);
    return raw ? (JSON.parse(raw) as Weights) : null;
  } catch {
    return null;
  }
}

export function ExploreDReps({
  dreps,
  results,
  hasAnswers,
  quickPick,
}: {
  dreps: MatchDRep[];
  results: MatchResult[];
  hasAnswers: boolean;
  quickPick: boolean;
}) {
  const defaultPreset = PRESETS.find((p) => p.id === (quickPick || !hasAnswers ? 'reliable' : 'values'))!;
  const [weights, setWeights] = useState<Weights>(defaultPreset.weights);
  const [preset, setPreset] = useState<string | null>(defaultPreset.id);
  const [showTuning, setShowTuning] = useState(false);
  const [spec, setSpec] = useState<FilterSpec>(EXPLORE_DEFAULTS);
  const [shown, setShown] = useState(10);
  const [expanded, setExpanded] = useState<string | null>(null);
  const myDRep = useMyDRep();
  const { cards } = useCards();

  useEffect(() => {
    if (quickPick || !hasAnswers) return;
    const saved = loadWeights();
    if (saved) {
      // Saved before Decentralization existed: keep the preset's.
      setWeights({ ...defaultPreset.weights, ...saved });
      setPreset(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- defaultPreset follows quickPick and hasAnswers
  }, [quickPick, hasAnswers]);

  const setWeight = (key: WeightKey, value: number) => {
    const next = { ...weights, [key]: value };
    setWeights(next);
    setPreset(null);
    try {
      localStorage.setItem(WEIGHTS_KEY, JSON.stringify(next));
    } catch {
      // Storage can be unavailable (private mode); tuning still works for this visit.
    }
  };

  const effective: Weights = { ...weights, values: hasAnswers ? weights.values : 0 };

  const rows = useMemo<Row[]>(() => {
    const byId = new Map(results.map((r) => [r.drep.drep_id, r]));
    const xpPct = percentiles(dreps.map((d) => d.votes_cast));
    const adaPct = percentiles(dreps.map((d) => d.ada));
    const delPct = percentiles(dreps.map((d) => d.delegators));
    const total = ADDITIVE.reduce((s, k) => s + Math.abs(effective[k] ?? 0), 0) || 1;
    const decent = Math.max(0, Math.min(10, effective.decent ?? 0)) / 10;
    // Defaults guard against a stale cached payload from before these fields existed.
    return dreps.map((raw) => {
      const drep = { ...raw, govscore: raw.govscore ?? 0, delegators: raw.delegators ?? 0, votes_eligible: raw.votes_eligible ?? 0 };
      const result = byId.get(drep.drep_id) ?? null;
      const parts: Record<WeightKey, number> = {
        values: result ? result.matchPercent / 100 : 0.5,
        track: Math.min(1, Math.max(0, drep.govscore / 100)),
        stamina: drep.participation,
        xp: xpPct(drep.votes_cast),
        insight: drep.positions.transparency?.n ? drep.positions.transparency.rate : 0,
        power: adaPct(drep.ada),
        charisma: delPct(drep.delegators),
        decent: (cards.get(drep.drep_id)?.underdog ?? 1) - 1,
      };
      let sum = 0;
      ADDITIVE.forEach((k) => {
        const w = effective[k] ?? 0;
        // Negative Power/Charisma weights favor the smaller side.
        sum += w >= 0 ? w * parts[k] : -w * (1 - parts[k]);
      });
      // Decentralization multiplies: the underdog bonus (up to +50%), scaled by how much the visitor cares.
      const bonus = decent * parts.decent;
      return { drep, result, parts, score: (sum / total) * 100 * (1 + bonus), bonus };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `effective` is derived from weights and hasAnswers
  }, [dreps, results, weights, hasAnswers, cards]);

  const ranked = useMemo(() => rows.slice().sort((a, b) => b.score - a.score), [rows]);
  const rankOf = useMemo(() => new Map(ranked.map((r, i) => [r.drep.drep_id, i + 1])), [ranked]);

  // Every DRep in the matching pool as a card, so the shared filters (class, badges, any stat) work here too.
  const cardOf = useMemo(() => {
    const m = new Map<string, CardSummary>();
    for (const r of rows) {
      m.set(
        r.drep.drep_id,
        cards.get(r.drep.drep_id) ??
          placeholderCard({ drep_id: r.drep.drep_id, name: r.drep.name, image: r.drep.image, ada: r.drep.ada, delegators: r.drep.delegators })
      );
    }
    return m;
  }, [rows, cards]);
  const rowById = useMemo(() => new Map(rows.map((r) => [r.drep.drep_id, r])), [rows]);
  const listed = useMemo(() => {
    const own = spec.sort === 'personal' || spec.sort === 'match';
    const filtered = applyFilters(Array.from(cardOf.values()), own ? { ...spec, sort: 'govscore', order: 'desc' } : spec).map((c) => rowById.get(c.drep_id)!);
    if (!own) return filtered;
    const dir = spec.order === 'asc' ? 1 : -1;
    const v = (r: Row) => (spec.sort === 'personal' ? r.score : r.result?.matchPercent ?? -1);
    return filtered.sort((a, b) => dir * (v(a) - v(b)));
  }, [cardOf, rowById, spec]);

  const mine = myDRep ? rows.find((r) => r.drep.drep_id === myDRep) : undefined;

  return (
    <div className="space-y-4">
      {myDRep && (
        <div className="rounded-xl border border-sky-800/70 bg-sky-950/40 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-sky-300">Your current DRep</p>
          {mine ? (
            <div className="mt-2 flex items-center gap-3">
              <DRepAvatar drep={mine.drep} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-white">{mine.drep.name ?? `${mine.drep.drep_id.slice(0, 18)}…`}</p>
                <p className="text-sm text-slate-300">
                  Ranked <span className="font-semibold text-white">#{rankOf.get(mine.drep.drep_id)}</span> of {rows.length} by your
                  settings
                  {mine.result && hasAnswers && (
                    <>
                      {' '}
                      · <span className="font-semibold text-white">{Math.round(mine.result.matchPercent)}%</span> values match
                    </>
                  )}
                </p>
              </div>
              <p className="text-2xl font-bold text-sky-200">{Math.round(mine.score)}</p>
            </div>
          ) : (
            <p className="mt-1 text-sm text-slate-300">
              Your wallet delegates to <span className="font-mono text-xs">{myDRep.slice(0, 20)}…</span>, which isn&apos;t in the
              matching pool: they have voted fewer than 3 times, aren&apos;t active, or have asked not to be promoted.
            </p>
          )}
        </div>
      )}

      <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-slate-400">Rank by:</span>
          {PRESETS.filter((p) => hasAnswers || !p.needsAnswers).map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={preset === p.id}
              onClick={() => {
                setWeights(p.weights);
                setPreset(p.id);
              }}
              className={`rounded-md px-3 py-1.5 text-sm ${preset === p.id ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
            >
              {p.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowTuning((v) => !v)}
            aria-expanded={showTuning}
            className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-slate-800 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-700"
          >
            <SlidersHorizontal size={14} /> {preset === null ? 'Custom weights' : 'Fine-tune'}
          </button>
        </div>
        {!hasAnswers && (
          <p className="text-xs text-slate-400">
            Ranked on how reliably DReps show up and explain their votes. Take the quiz to also match on your values.
          </p>
        )}

        {showTuning && (
          <div className="grid grid-cols-[minmax(0,1fr)] gap-x-6 gap-y-3 pt-2 sm:grid-cols-2 [&>*]:min-w-0">
            {SLIDERS.map((s) => {
              const disabled = s.key === 'values' && !hasAnswers;
              const value = weights[s.key];
              return (
                <label key={s.key} className={`block ${disabled ? 'opacity-40' : ''}`}>
                  <span className="flex items-baseline justify-between text-sm">
                    <span className="font-semibold text-slate-100">{s.label}</span>
                    <span className="text-xs text-slate-400">
                      {s.bipolar ? (value === 0 ? "Don't care" : `${value < 0 ? s.bipolar[0] : s.bipolar[1]} ${Math.abs(value)}`) : value === 0 ? 'Off' : value}
                    </span>
                  </span>
                  <input
                    type="range"
                    min={s.bipolar ? -10 : 0}
                    max={10}
                    step={1}
                    value={value}
                    disabled={disabled}
                    onChange={(e) => setWeight(s.key, Number(e.target.value))}
                    className="w-full accent-violet-500"
                  />
                  <span className="text-[11px] text-slate-500">
                    {disabled ? 'Take the quiz to use this' : s.help}
                    {s.bipolar && ` · left prefers ${s.bipolar[0].toLowerCase()}`}
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      <CardFilters
        spec={spec}
        onChange={(next) => {
          setSpec(next);
          setShown(10);
        }}
        cards={Array.from(cardOf.values())}
        defaults={EXPLORE_DEFAULTS}
        resultCount={listed.length}
        extraSorts={[
          { value: 'personal', label: 'Your score', tip: 'Your score from the weights above, with the Decentralization bonus.' },
          { value: 'match', label: 'Values match', disabled: !hasAnswers, tip: TIPS.alignment },
        ]}
      />

      <ol className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 xl:gap-5 [&>*]:min-w-0">
        {listed.slice(0, shown).map((r) => {
          const open = expanded === r.drep.drep_id;
          const card =
            cards.get(r.drep.drep_id) ??
            placeholderCard({ drep_id: r.drep.drep_id, name: r.drep.name, image: r.drep.image, ada: r.drep.ada, delegators: r.drep.delegators });
          return (
            <li key={r.drep.drep_id} className={`flex flex-col gap-2 ${open ? 'sm:col-span-2 lg:col-span-3 xl:col-span-3' : ''}`}>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded-lg bg-slate-900/70 px-3 py-1.5 text-xs">
                <span className="font-mono text-slate-500">#{rankOf.get(r.drep.drep_id)}</span>
                <MyDRepBadge drepId={r.drep.drep_id} />
                {hasAnswers && r.result ? (
                  <>
                    <span className="ml-auto text-slate-300" title={TIPS.alignment}>
                      Alignment <strong className="text-brand-lilac">{Math.round(r.result.matchPercent)}%</strong>
                    </span>
                    <span className="text-slate-300" title={TIPS.personalGovscore}>
                      Aligned{' '}
                      <strong className="text-white">{personalGovScore(r.drep.govscore, r.result.matchPercent).toFixed(1)}</strong>
                    </span>
                  </>
                ) : (
                  <span className="ml-auto text-slate-400">GovScore {r.drep.govscore.toFixed(1)}</span>
                )}
                <span className="text-slate-400" title="Your score from the weights above, including the Decentralization bonus.">
                  · You {Math.round(r.score)}
                </span>
                {r.bonus >= 0.005 && (
                  <span className="text-emerald-300" title="Decentralization bonus: this DRep's underdog bonus, scaled by your Decentralization weight.">
                    +{Math.round(r.bonus * 100)}% decentral.
                  </span>
                )}
              </div>
              <TradingCard
                variant="scoreboard"
                card={card}
                action={
                  <button
                    type="button"
                    onClick={() => setExpanded(open ? null : r.drep.drep_id)}
                    aria-expanded={open}
                    className="flex min-h-[44px] w-full items-center justify-center gap-1 rounded-lg bg-slate-800 py-1.5 text-sm text-slate-200 hover:bg-slate-700"
                  >
                    {r.result ? 'Why this match' : 'Delegate'} {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                }
              />
              {open && r.result && <ResultCard result={r.result} rank={rankOf.get(r.drep.drep_id) ?? 0} bonus={r.bonus} />}
              {open && !r.result && (
                <p className="text-sm text-slate-400">
                  <a
                    href={`https://gov.tools/connected/drep_directory/${r.drep.drep_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-violet-300 hover:text-violet-200"
                  >
                    View or delegate on GovTool ↗
                  </a>
                </p>
              )}
            </li>
          );
        })}
      </ol>
      {listed.length > shown && (
        <button type="button" onClick={() => setShown((n) => n + 20)} className="text-sm text-violet-300 hover:text-violet-200">
          Show {Math.min(20, listed.length - shown)} more of {listed.length}
        </button>
      )}
    </div>
  );
}
