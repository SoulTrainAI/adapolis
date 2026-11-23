'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Search, SlidersHorizontal } from 'lucide-react';
import { formatAda, type MatchResult } from '@/lib/match/score';
import type { MatchDRep } from '@/lib/match/profiles';
import { MyDRepBadge, useMyDRep } from '@/components/auth/MyDRepBadge';
import { DRepAvatar, ResultCard } from './ResultCard';

type WeightKey = 'values' | 'track' | 'stamina' | 'xp' | 'insight' | 'power' | 'charisma';
type Weights = Record<WeightKey, number>;
type Sort = 'personal' | 'match' | WeightKey | 'smallest';

const WEIGHTS_KEY = 'adapolis.explore.weights.v1';

const SLIDERS: Array<{ key: WeightKey; label: string; help: string; bipolar?: [string, string] }> = [
  { key: 'values', label: 'Values', help: 'How closely they vote the way you answered' },
  { key: 'track', label: 'Track record', help: 'GovScore: long, consistent participation' },
  { key: 'stamina', label: 'Stamina', help: 'Share of votes they showed up for' },
  { key: 'xp', label: 'XP', help: 'Total votes cast' },
  { key: 'insight', label: 'Insight', help: 'How often they explain their votes' },
  { key: 'power', label: 'Power', help: 'ADA delegated to them', bipolar: ['Smaller', 'Bigger'] },
  { key: 'charisma', label: 'Charisma', help: 'Number of delegators', bipolar: ['Fewer', 'More'] },
];

const PRESETS: Array<{ id: string; label: string; weights: Weights; needsAnswers?: boolean }> = [
  { id: 'values', label: 'Match my values', needsAnswers: true, weights: { values: 10, track: 4, stamina: 3, xp: 2, insight: 3, power: -3, charisma: 0 } },
  { id: 'reliable', label: 'Reliable & thoughtful', weights: { values: 0, track: 8, stamina: 6, xp: 3, insight: 8, power: -2, charisma: 0 } },
  { id: 'balanced', label: 'Balanced', needsAnswers: true, weights: { values: 6, track: 6, stamina: 4, xp: 3, insight: 5, power: -2, charisma: 1 } },
];

interface Row {
  drep: MatchDRep;
  result: MatchResult | null;
  parts: Record<WeightKey, number>;
  score: number;
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
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>('personal');
  const [shown, setShown] = useState(10);
  const [expanded, setExpanded] = useState<string | null>(null);
  const myDRep = useMyDRep();

  useEffect(() => {
    if (quickPick || !hasAnswers) return;
    const saved = loadWeights();
    if (saved) {
      setWeights(saved);
      setPreset(null);
    }
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
    const total = (Object.keys(effective) as WeightKey[]).reduce((s, k) => s + Math.abs(effective[k]), 0) || 1;
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
      };
      let sum = 0;
      (Object.keys(effective) as WeightKey[]).forEach((k) => {
        const w = effective[k];
        // Negative Power/Charisma weights favor the smaller side.
        sum += w >= 0 ? w * parts[k] : -w * (1 - parts[k]);
      });
      return { drep, result, parts, score: (sum / total) * 100 };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `effective` is derived from weights and hasAnswers
  }, [dreps, results, weights, hasAnswers]);

  const ranked = useMemo(() => rows.slice().sort((a, b) => b.score - a.score), [rows]);
  const rankOf = useMemo(() => new Map(ranked.map((r, i) => [r.drep.drep_id, i + 1])), [ranked]);

  const listed = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = rows.filter((r) => q === '' || r.drep.drep_id.toLowerCase().includes(q) || (r.drep.name ?? '').toLowerCase().includes(q));
    const by: Record<Sort, (r: Row) => number> = {
      personal: (r) => r.score,
      match: (r) => r.result?.matchPercent ?? -1,
      values: (r) => r.result?.matchPercent ?? -1,
      track: (r) => r.drep.govscore,
      stamina: (r) => r.drep.participation,
      xp: (r) => r.drep.votes_cast,
      insight: (r) => r.parts.insight,
      power: (r) => r.drep.ada,
      charisma: (r) => r.drep.delegators,
      smallest: (r) => -r.drep.ada,
    };
    return filtered.sort((a, b) => by[sort](b) - by[sort](a));
  }, [rows, query, sort]);

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
          <div className="grid gap-x-6 gap-y-3 pt-2 sm:grid-cols-2">
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

      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-[12rem] flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShown(10);
            }}
            placeholder="Search any DRep by name or ID"
            className="w-full rounded-lg border border-slate-700 bg-slate-900 py-2 pl-9 pr-3 text-sm text-white placeholder:text-slate-500"
          />
        </label>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          aria-label="Sort DReps"
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200"
        >
          <option value="personal">Your score</option>
          {hasAnswers && <option value="match">Values match</option>}
          <option value="track">Track record</option>
          <option value="stamina">Stamina (participation)</option>
          <option value="xp">XP (votes)</option>
          <option value="insight">Insight (explains votes)</option>
          <option value="power">Power (most ADA)</option>
          <option value="smallest">Smallest (least ADA)</option>
          <option value="charisma">Charisma (delegators)</option>
        </select>
      </div>

      <ol className="space-y-2">
        {listed.slice(0, shown).map((r) => {
          const open = expanded === r.drep.drep_id;
          return (
            <li key={r.drep.drep_id} className="rounded-xl border border-slate-800 bg-slate-900/60">
              <button
                type="button"
                onClick={() => setExpanded(open ? null : r.drep.drep_id)}
                aria-expanded={open}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
              >
                <span className="w-8 text-right font-mono text-sm text-slate-500">#{rankOf.get(r.drep.drep_id)}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-white">
                    {r.drep.name ?? `${r.drep.drep_id.slice(0, 16)}…`} <MyDRepBadge drepId={r.drep.drep_id} className="ml-1 align-middle" />
                  </p>
                  <p className="text-xs text-slate-400">
                    {hasAnswers && r.result ? `${Math.round(r.result.matchPercent)}% values · ` : ''}
                    GovScore {r.drep.govscore.toFixed(0)} · {Math.round(r.drep.participation * 100)}% stamina · {r.drep.votes_cast} XP ·{' '}
                    explains {Math.round(r.parts.insight * 100)}% · {formatAda(r.drep.ada)} · {r.drep.delegators.toLocaleString()} delegators
                  </p>
                </div>
                <span className="text-xl font-bold text-violet-300" title="Your personalized score (0-100)">
                  {Math.round(r.score)}
                </span>
                {open ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
              </button>
              {open && r.result && (
                <div className="px-3 pb-3">
                  <ResultCard result={r.result} rank={rankOf.get(r.drep.drep_id) ?? 0} />
                </div>
              )}
              {open && !r.result && (
                <p className="px-3 pb-3 text-sm text-slate-400">
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
