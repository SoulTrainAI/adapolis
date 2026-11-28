'use client';

/**
 * The one filter panel for every DRep list (Hall of Fame, Draft): search, sort
 * by any stat, badge toggles with tiers, class / archetype / rarity / Draft
 * Cost chips, and a two-handle slider for every stat. Every control combines
 * with every other; the parent applies the spec with applyFilters().
 */

import { useMemo, useState } from 'react';
import { ArrowDownWideNarrow, ArrowUpNarrowWide, RotateCcw, Search, SlidersHorizontal, Star, X } from 'lucide-react';
import { ABILITY_RULES, TIER_NAMES } from '@/lib/cards/abilities';
import { DREP_CLASSES } from '@/lib/cards/classes';
import {
  activeCount,
  RARITIES,
  rarityOf,
  STATS,
  STAT_BY_KEY,
  statDomain,
  TIERED_BADGES,
  type FilterCard,
  type FilterSpec,
  type Pool,
  type StatDef,
  type StatGroup,
} from '@/lib/cards/filter';
import { ABILITY_ICONS, CLASS_ICONS, FALLBACK_ICON } from './trait-icons';

export interface ExtraSort {
  value: string;
  label: string;
  disabled?: boolean;
  tip?: string;
}

interface Props {
  spec: FilterSpec;
  onChange: (s: FilterSpec) => void;
  /** Every card the list could show (any pool), for slider ends and counts. */
  cards: FilterCard[];
  defaults: FilterSpec;
  /** How many cards match right now. */
  resultCount: number;
  /** Sorts the list adds on top of the stats (e.g. Alignment). */
  extraSorts?: ExtraSort[];
  /** Optional stats this list has (e.g. 'drafted_by' on the draft). */
  optionalStats?: string[];
  pools?: Array<{ value: Pool; label: string }>;
}

const TIER_RING = ['border-slate-500 text-slate-200', 'border-orange-400 text-orange-200', 'border-slate-200 text-white', 'border-amber-300 text-amber-200'];
const GROUPS: StatGroup[] = ['Scores', 'Game', 'Backing', 'Record'];
const STEPS = 1000;

function chip(on: boolean): string {
  return `inline-flex min-h-[36px] items-center gap-1.5 rounded-full border px-3 text-sm transition-colors ${
    on ? 'border-violet-400 bg-violet-500/20 text-white' : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500'
  }`;
}

/** Slider position (0–STEPS) ↔ value, on a log scale for ADA-like stats. */
function scale(def: StatDef, [lo, hi]: [number, number]) {
  const log = def.log && lo >= 0;
  const a = log ? Math.log10(lo + 1) : lo;
  const b = log ? Math.log10(hi + 1) : hi;
  const toValue = (pos: number) => {
    const t = a + ((b - a) * pos) / STEPS;
    let v = log ? 10 ** t - 1 : t;
    if (def.integer || log) v = Math.round(v);
    else if (def.percent) v = Math.round(v * 100) / 100;
    else v = Math.round(v * 100) / 100;
    return Math.min(hi, Math.max(lo, v));
  };
  const toPos = (v: number) => (b === a ? 0 : Math.round((((log ? Math.log10(Math.max(0, v) + 1) : v) - a) / (b - a)) * STEPS));
  return { toValue, toPos };
}

function RangeSlider({ def, domain, value, onChange }: { def: StatDef; domain: [number, number]; value: [number | null, number | null]; onChange: (v: [number | null, number | null]) => void }) {
  const { toValue, toPos } = scale(def, domain);
  const loPos = value[0] === null ? 0 : toPos(value[0]);
  const hiPos = value[1] === null ? STEPS : toPos(value[1]);
  const set = (lo: number, hi: number) => onChange([lo <= 0 ? null : toValue(lo), hi >= STEPS ? null : toValue(hi)]);
  const active = value[0] !== null || value[1] !== null;
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2" title={def.tip}>
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className={`font-semibold ${active ? 'text-violet-200' : 'text-slate-300'}`}>{def.label}</span>
        <span className="font-mono text-slate-400">
          {def.format(value[0] ?? domain[0])} – {def.format(value[1] ?? domain[1])}
        </span>
      </div>
      <div className="relative mt-2 h-5">
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-slate-800" />
        <div className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-violet-500" style={{ left: `${(loPos / STEPS) * 100}%`, right: `${100 - (hiPos / STEPS) * 100}%` }} />
        <input
          type="range"
          min={0}
          max={STEPS}
          value={loPos}
          aria-label={`${def.label} minimum`}
          className="dual-range"
          onChange={(e) => set(Math.min(Number(e.target.value), hiPos), hiPos)}
        />
        <input
          type="range"
          min={0}
          max={STEPS}
          value={hiPos}
          aria-label={`${def.label} maximum`}
          className="dual-range"
          onChange={(e) => set(loPos, Math.max(Number(e.target.value), loPos))}
        />
      </div>
    </div>
  );
}

export function CardFilters({ spec, onChange, cards, defaults, resultCount, extraSorts = [], optionalStats = [], pools }: Props) {
  const [open, setOpen] = useState(false);
  const stats = useMemo(() => STATS.filter((s) => !s.optional || optionalStats.includes(s.key)), [optionalStats]);
  const domains = useMemo(() => new Map(stats.map((s) => [s.key, statDomain(cards, s.key)])), [stats, cards]);
  const counts = useMemo(() => {
    const badge = new Map<string, number>();
    const cls = new Map<string, number>();
    const arch = new Map<string, number>();
    const rar = new Map<string, number>();
    for (const c of cards) {
      for (const a of c.abilities) badge.set(a.id, (badge.get(a.id) ?? 0) + 1);
      if (c.drep_class) cls.set(c.drep_class.id, (cls.get(c.drep_class.id) ?? 0) + 1);
      if (c.archetype) arch.set(c.archetype.id, (arch.get(c.archetype.id) ?? 0) + 1);
      rar.set(rarityOf(c), (rar.get(rarityOf(c)) ?? 0) + 1);
    }
    return { badge, cls, arch, rar };
  }, [cards]);

  const set = (patch: Partial<FilterSpec>) => onChange({ ...spec, ...patch });
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  // A list's own default pool (e.g. all registered on the Draft) isn't a filter the visitor switched on.
  const n = activeCount(spec) - (spec.pool !== 'active' && spec.pool === defaults.pool ? 1 : 0);

  // Tap a badge: off → any tier → Bronze+ → Silver+ → Gold → off (one-level badges: off ↔ on).
  const cycleBadge = (id: string) => {
    const badges = { ...spec.badges };
    const cur = badges[id];
    if (cur === undefined) badges[id] = 0;
    else if (!TIERED_BADGES.has(id) || cur === 3) delete badges[id];
    else badges[id] = (cur + 1) as 1 | 2 | 3;
    set({ badges });
  };

  const sortLabel = (key: string) => extraSorts.find((x) => x.value === key)?.label ?? (key === 'name' ? 'Name' : STAT_BY_KEY.get(key)?.label ?? key);

  // Everything that's on, as removable chips.
  const active: Array<{ key: string; label: string; clear: () => void }> = [];
  for (const [key, [lo, hi]] of Object.entries(spec.ranges)) {
    const def = STAT_BY_KEY.get(key);
    if (!def || (lo === null && hi === null)) continue;
    const label = lo !== null && hi !== null ? `${def.label} ${def.format(lo)}–${def.format(hi)}` : lo !== null ? `${def.label} ≥ ${def.format(lo)}` : `${def.label} ≤ ${def.format(hi!)}`;
    active.push({ key: `r-${key}`, label, clear: () => { const ranges = { ...spec.ranges }; delete ranges[key]; set({ ranges }); } });
  }
  for (const [id, t] of Object.entries(spec.badges)) {
    const rule = ABILITY_RULES.find((r) => r.id === id);
    active.push({ key: `b-${id}`, label: `${rule?.label ?? id}${t ? ` · ${TIER_NAMES[t as 1 | 2 | 3]}+` : ''}`, clear: () => { const badges = { ...spec.badges }; delete badges[id]; set({ badges }); } });
  }
  for (const id of spec.classes) active.push({ key: `c-${id}`, label: DREP_CLASSES.find((c) => c.id === id)?.label ?? id, clear: () => set({ classes: spec.classes.filter((x) => x !== id) }) });
  for (const id of spec.archetypes) active.push({ key: `a-${id}`, label: `Archetype: ${ABILITY_RULES.find((r) => r.id === id)?.label ?? id}`, clear: () => set({ archetypes: spec.archetypes.filter((x) => x !== id) }) });
  for (const r of spec.rarities) active.push({ key: `t-${r}`, label: r, clear: () => set({ rarities: spec.rarities.filter((x) => x !== r) }) });
  for (const st of spec.stars) active.push({ key: `s-${st}`, label: `${st}★`, clear: () => set({ stars: spec.stars.filter((x) => x !== st) }) });
  if (spec.hideNotListed) active.push({ key: 'nl', label: 'Seeking delegation only', clear: () => set({ hideNotListed: false }) });

  return (
    <div className="mb-6 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-[220px] flex-1">
          <span className="sr-only">Search DReps</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden />
          <input
            type="search"
            value={spec.search}
            onChange={(e) => set({ search: e.target.value })}
            placeholder="Search by name or DRep ID…"
            className="min-h-[44px] w-full rounded-lg border border-slate-700 bg-slate-900 pl-9 pr-3 text-slate-100 placeholder:text-slate-500 focus:border-violet-400 focus:outline-none"
          />
        </label>
        <label className="flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-slate-300">
          <span className="whitespace-nowrap">Sort by</span>
          <select
            value={spec.sort}
            onChange={(e) => {
              const key = e.target.value;
              set({ sort: key, order: key === 'name' || STAT_BY_KEY.get(key)?.lowFirst ? 'asc' : 'desc' });
            }}
            className="max-w-[210px] bg-transparent font-semibold text-white focus:outline-none"
          >
            {extraSorts.length > 0 && (
              <optgroup label="Personal">
                {extraSorts.map((x) => (
                  <option key={x.value} value={x.value} disabled={x.disabled} title={x.tip}>
                    {x.label}
                    {x.disabled ? ' (take the quiz)' : ''}
                  </option>
                ))}
              </optgroup>
            )}
            {GROUPS.map((g) => (
              <optgroup key={g} label={g}>
                {stats
                  .filter((s) => s.group === g)
                  .map((s) => (
                    <option key={s.key} value={s.key} title={s.tip}>
                      {s.label}
                    </option>
                  ))}
              </optgroup>
            ))}
            <optgroup label="Other">
              <option value="name">Name</option>
            </optgroup>
          </select>
        </label>
        <button
          type="button"
          onClick={() => set({ order: spec.order === 'asc' ? 'desc' : 'asc' })}
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-slate-200 hover:border-slate-500"
          title={spec.order === 'desc' ? 'Highest first' : 'Lowest first'}
        >
          {spec.order === 'desc' ? <ArrowDownWideNarrow className="h-4 w-4" aria-hidden /> : <ArrowUpNarrowWide className="h-4 w-4" aria-hidden />}
          {spec.order === 'desc' ? 'High → low' : 'Low → high'}
        </button>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className={`inline-flex min-h-[44px] items-center gap-2 rounded-lg border px-4 text-sm font-semibold ${open || n ? 'border-violet-400 bg-violet-600/25 text-white' : 'border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-500'}`}
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden /> Filters{n ? ` (${n})` : ''}
        </button>
        {(n > 0 || spec.search || spec.sort !== defaults.sort) && (
          <button type="button" onClick={() => onChange(defaults)} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-3 text-sm text-slate-400 hover:text-white">
            <RotateCcw className="h-4 w-4" aria-hidden /> Reset
          </button>
        )}
      </div>

      {active.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Active filters">
          {active.map((a) => (
            <li key={a.key}>
              <button type="button" onClick={a.clear} className="inline-flex items-center gap-1 rounded-full bg-violet-500/20 px-3 py-1 text-xs font-semibold text-violet-100 hover:bg-violet-500/30">
                {a.label} <X className="h-3 w-3" aria-label="Remove" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="text-sm text-slate-400">
        {resultCount.toLocaleString()} DRep{resultCount === 1 ? '' : 's'} · sorted by {sortLabel(spec.sort)}, {spec.order === 'desc' ? 'high to low' : 'low to high'}
      </p>

      {open && (
        <div className="space-y-5 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5">
          <section>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
              Badges <span className="normal-case tracking-normal text-slate-500">· tap again for Bronze+, Silver+, Gold</span>
            </h3>
            <div className="flex flex-wrap gap-2">
              {ABILITY_RULES.map((r) => {
                const Icon = ABILITY_ICONS[r.id] ?? FALLBACK_ICON;
                const t = spec.badges[r.id];
                const on = t !== undefined;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => cycleBadge(r.id)}
                    title={`${r.label}: ${r.measures}${r.tiers ? ` (Bronze ${r.tiers[0]}, Silver ${r.tiers[1]}, Gold ${r.tiers[2]})` : ''}`}
                    aria-pressed={on}
                    className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl border-2 px-3 text-sm font-semibold transition-colors ${on ? `${TIER_RING[t ?? 0]} bg-violet-500/15` : 'border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-500'}`}
                  >
                    <Icon className="h-5 w-5" aria-hidden />
                    {r.label}
                    {on && t ? <span className="text-xs">{TIER_NAMES[t as 1 | 2 | 3]}+</span> : null}
                    <span className="text-xs font-normal text-slate-500">{counts.badge.get(r.id) ?? 0}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
              Class <span className="normal-case tracking-normal text-slate-500">· who backs them, whales to crowds</span>
            </h3>
            <div className="flex flex-wrap gap-2">
              {DREP_CLASSES.map((c) => {
                const Icon = CLASS_ICONS[c.id] ?? FALLBACK_ICON;
                return (
                  <button key={c.id} type="button" title={c.blurb} aria-pressed={spec.classes.includes(c.id)} onClick={() => set({ classes: toggle(spec.classes, c.id) })} className={chip(spec.classes.includes(c.id))}>
                    <Icon className="h-4 w-4 text-sky-300" aria-hidden /> {c.label} <span className="text-xs text-slate-500">{counts.cls.get(c.id) ?? 0}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <div className="grid gap-5 lg:grid-cols-3">
            <section>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-400">Archetype</h3>
              <div className="flex flex-wrap gap-2">
                {ABILITY_RULES.filter((r) => counts.arch.has(r.id)).map((r) => {
                  const Icon = ABILITY_ICONS[r.id] ?? FALLBACK_ICON;
                  return (
                    <button key={r.id} type="button" aria-pressed={spec.archetypes.includes(r.id)} onClick={() => set({ archetypes: toggle(spec.archetypes, r.id) })} className={chip(spec.archetypes.includes(r.id))} title="The headline badge shown on the card front">
                      <Icon className="h-4 w-4" aria-hidden /> {r.label} <span className="text-xs text-slate-500">{counts.arch.get(r.id)}</span>
                    </button>
                  );
                })}
              </div>
            </section>
            <section>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-400">Rarity</h3>
              <div className="flex flex-wrap gap-2">
                {RARITIES.map((r) => (
                  <button key={r} type="button" aria-pressed={spec.rarities.includes(r)} onClick={() => set({ rarities: toggle(spec.rarities, r) })} className={chip(spec.rarities.includes(r))}>
                    {r} <span className="text-xs text-slate-500">{counts.rar.get(r) ?? 0}</span>
                  </button>
                ))}
              </div>
            </section>
            <section>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-400">Draft Cost</h3>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5].map((st) => (
                  <button key={st} type="button" aria-pressed={spec.stars.includes(st)} onClick={() => set({ stars: toggle(spec.stars, st) })} className={chip(spec.stars.includes(st))}>
                    {st}
                    <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" aria-hidden />
                  </button>
                ))}
              </div>
            </section>
          </div>

          <section className="flex flex-wrap items-center gap-4">
            {pools && (
              <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Which DReps">
                <span className="text-sm text-slate-400">Show</span>
                {pools.map((p) => (
                  <button key={p.value} type="button" role="radio" aria-checked={spec.pool === p.value} onClick={() => set({ pool: p.value })} className={chip(spec.pool === p.value)}>
                    {p.label}
                  </button>
                ))}
              </div>
            )}
            <label className="inline-flex min-h-[36px] items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" checked={spec.hideNotListed} onChange={(e) => set({ hideNotListed: e.target.checked })} />
              Only DReps seeking delegation
            </label>
          </section>

          {GROUPS.map((g) => {
            const list = stats.filter((s) => s.group === g && domains.get(s.key));
            if (!list.length) return null;
            return (
              <section key={g}>
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-400">{g}</h3>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {list.map((s) => (
                    <RangeSlider
                      key={s.key}
                      def={s}
                      domain={domains.get(s.key)!}
                      value={spec.ranges[s.key] ?? [null, null]}
                      onChange={(v) => {
                        const ranges = { ...spec.ranges };
                        if (v[0] === null && v[1] === null) delete ranges[s.key];
                        else ranges[s.key] = v;
                        set({ ranges });
                      }}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
