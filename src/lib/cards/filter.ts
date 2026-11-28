/**
 * One search-and-filter engine for every list of DRep cards (Hall of Fame,
 * Draft). Any combination works: text search, a range on every stat, badges
 * (with a minimum tier), class, archetype, rarity, Draft Cost, flags, and a
 * sort on any stat. Pure, so it runs in the browser and in tests.
 */

import { tierFor, type CardSummary } from './types';
import { ABILITY_RULES } from './abilities';

/** A card plus fields only some lists have (the draft knows how many teams picked a DRep). */
export type FilterCard = CardSummary & { drafted_by?: number };

export type StatGroup = 'Scores' | 'Game' | 'Backing' | 'Record';

export interface StatDef {
  key: string;
  label: string;
  group: StatGroup;
  get: (c: FilterCard) => number | null;
  /** How a value reads in the UI. */
  format: (v: number) => string;
  /** Sliders on a log scale (ADA, delegators): most DReps are small, a few are huge. */
  log?: boolean;
  /** Whole numbers only. */
  integer?: boolean;
  /** Fraction stored 0–1, shown and filtered as a percentage. */
  percent?: boolean;
  /** Only present in some lists (e.g. the draft). */
  optional?: boolean;
  /** Lower is better (rank), so the default sort is ascending. */
  lowFirst?: boolean;
  tip: string;
}

const fmt = (v: number, d = 1) => (Number.isInteger(v) ? v.toLocaleString('en-US') : v.toFixed(d));
const ada = (v: number) => (v >= 1e9 ? `₳${(v / 1e9).toFixed(1)}B` : v >= 1e6 ? `₳${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `₳${(v / 1e3).toFixed(0)}K` : `₳${Math.round(v)}`);
const pct = (v: number) => `${Math.round(v * 100)}%`;

export const STATS: StatDef[] = [
  { key: 'govscore', label: 'GovScore', group: 'Scores', get: (c) => c.govscore, format: (v) => fmt(v), tip: 'How much of the job they’ve done over their career, 0–100: points earned ÷ points possible.' },
  { key: 'rank', label: 'GovScore rank', group: 'Scores', get: (c) => c.rank, format: (v) => `#${v}`, integer: true, lowFirst: true, tip: 'Rank among active DReps by GovScore (1 is best).' },
  { key: 'delta1', label: 'GovScore change', group: 'Scores', get: (c) => c.delta1, format: (v) => `${v > 0 ? '+' : ''}${fmt(v)}`, tip: 'Change since the end of last season.' },
  { key: 'participation', label: 'Participation', group: 'Scores', get: (c) => c.participation, format: pct, percent: true, tip: 'Votes cast ÷ actions they could vote on (Stamina).' },
  { key: 'season_points', label: 'Season points', group: 'Game', get: (c) => c.season.points, format: (v) => fmt(v), integer: true, tip: 'Points in the race so far this season.' },
  { key: 'projection', label: 'Projected points', group: 'Game', get: (c) => c.projection, format: (v) => fmt(v), tip: 'Expected points next season (recent form).' },
  { key: 'form', label: 'Form', group: 'Game', get: (c) => c.form, format: (v) => fmt(v), tip: 'Average of the last three seasons played.' },
  { key: 'avg_points', label: 'Avg points / season', group: 'Game', get: (c) => c.avg_points, format: (v) => fmt(v), tip: 'Average points in seasons they took part in.' },
  { key: 'best_points', label: 'Best season', group: 'Game', get: (c) => c.best_points, format: (v) => fmt(v), integer: true, tip: 'Most points in a single season.' },
  { key: 'momentum', label: 'Momentum', group: 'Game', get: (c) => c.momentum?.bonus ?? null, format: (v) => `+${Math.round(v * 100)}%`, percent: true, tip: 'Cardanathon bonus for growing backing since last season: (Power growth % + Charisma growth %) ÷ 2, up to +20%.' },
  { key: 'last_points', label: 'Last season', group: 'Game', get: (c) => c.last_points, format: (v) => fmt(v), integer: true, tip: 'Points in the last finished season.' },
  { key: 'lifetime_points', label: 'Lifetime points', group: 'Game', get: (c) => c.lifetime.points, format: (v) => fmt(v), integer: true, tip: 'All points across every season.' },
  { key: 'draft_cost', label: 'Draft Cost', group: 'Game', get: (c) => c.draft_cost ?? 1, format: (v) => `${v}★`, integer: true, tip: 'Stars this DRep costs in a 10-star team.' },
  { key: 'underdog', label: 'Underdog bonus', group: 'Backing', optional: true, get: (c) => c.underdog, format: (v) => `${v.toFixed(2)}×`, tip: 'Size-based bonus, 1.00–1.50×: higher for smaller DReps. The Match-maker’s Decentralization weight uses it.' },
  { key: 'ownership', label: 'Drafted by (% of teams)', group: 'Game', get: (c) => c.ownership, format: pct, percent: true, tip: 'Share of this season’s teams that picked them.' },
  { key: 'drafted_by', label: 'Drafted by (teams)', group: 'Game', get: (c) => c.drafted_by ?? null, format: (v) => fmt(v), integer: true, optional: true, tip: 'Number of teams that picked them this season.' },
  { key: 'ada', label: 'ADA delegated', group: 'Backing', get: (c) => c.ada, format: ada, log: true, tip: 'Voting power (Power).' },
  { key: 'delegators', label: 'Delegators', group: 'Backing', get: (c) => c.delegators, format: (v) => fmt(v), log: true, integer: true, tip: 'Wallets delegating to them (Charisma).' },
  { key: 'avg_ada', label: 'ADA per delegator', group: 'Backing', get: (c) => c.drep_class?.avg_ada ?? null, format: ada, log: true, tip: 'Average delegation: decides the Class.' },
  { key: 'votes_cast', label: 'Career votes', group: 'Record', get: (c) => c.votes_cast, format: (v) => fmt(v), integer: true, tip: 'Votes cast over their career (XP).' },
  { key: 'rationale_rate', label: 'Explains votes', group: 'Record', get: (c) => c.lifetime.rationale_rate, format: pct, percent: true, tip: 'Share of votes with a rationale.' },
  { key: 'early_rate', label: 'Votes early', group: 'Record', get: (c) => c.lifetime.early_rate, format: pct, percent: true, tip: 'Share of votes cast in the first half of the window.' },
  { key: 'streak', label: 'Voting streak', group: 'Record', get: (c) => c.streak, format: (v) => `${v} ep.`, integer: true, tip: 'Epochs in a row with a vote.' },
  { key: 'missed', label: 'Missed votes', group: 'Record', get: (c) => c.lifetime.missed, format: (v) => fmt(v), integer: true, tip: 'Actions that closed without their vote.' },
  { key: 'seasons', label: 'Seasons played', group: 'Record', get: (c) => c.lifetime.seasons, format: (v) => fmt(v), integer: true, tip: 'Seasons with at least one vote.' },
  { key: 'tenure', label: 'Tenure (epochs)', group: 'Record', get: (c) => c.lifetime.tenure_epochs, format: (v) => fmt(v), integer: true, tip: 'Epochs since their first vote.' },
];

export const STAT_BY_KEY = new Map(STATS.map((s) => [s.key, s]));

export type Pool = 'active' | 'registered' | 'all';

export interface FilterSpec {
  search: string;
  /** A stat key, or 'name'. */
  sort: string;
  order: 'asc' | 'desc';
  /** Stat key → [min, max]; null leaves that end open. Percent stats are fractions (0–1). */
  ranges: Record<string, [number | null, number | null]>;
  /** Badge id → minimum tier (0 = has it at any tier). All listed badges must be held. */
  badges: Record<string, 0 | 1 | 2 | 3>;
  /** Any of these (empty = all). */
  classes: string[];
  archetypes: string[];
  rarities: string[];
  stars: number[];
  pool: Pool;
  /** Hide DReps who set CIP-119 doNotList (not seeking delegation). */
  hideNotListed: boolean;
}

export const DEFAULT_SPEC: FilterSpec = {
  search: '',
  sort: 'govscore',
  order: 'desc',
  ranges: {},
  badges: {},
  classes: [],
  archetypes: [],
  rarities: [],
  stars: [],
  pool: 'active',
  hideNotListed: false,
};

export const RARITIES = ['Legend', 'Silver', 'Bronze', 'Holographic', 'Rare', 'Common'];

export function rarityOf(c: CardSummary): string {
  return tierFor(c.rank).label;
}

export function inPool(c: CardSummary, pool: Pool): boolean {
  if (pool === 'all') return true;
  if (!c.registered) return false;
  return pool === 'registered' || (c.votes_cast > 0 && c.ada > 0);
}

export function matches(c: FilterCard, s: FilterSpec): boolean {
  if (!inPool(c, s.pool)) return false;
  if (s.hideNotListed && c.do_not_list) return false;
  const q = s.search.trim().toLowerCase();
  if (q && !c.drep_id.toLowerCase().includes(q) && !(c.name ?? '').toLowerCase().includes(q)) return false;
  for (const [key, [lo, hi]] of Object.entries(s.ranges)) {
    const def = STAT_BY_KEY.get(key);
    if (!def || (lo === null && hi === null)) continue;
    const v = def.get(c);
    if (v === null) return false;
    if (lo !== null && v < lo - 1e-9) return false;
    if (hi !== null && v > hi + 1e-9) return false;
  }
  for (const [id, min] of Object.entries(s.badges)) {
    const a = c.abilities.find((x) => x.id === id);
    if (!a || (min > 0 && (a.tier ?? 0) < min)) return false;
  }
  if (s.classes.length && !s.classes.includes(c.drep_class?.id ?? 'none')) return false;
  if (s.archetypes.length && !s.archetypes.includes(c.archetype?.id ?? 'none')) return false;
  if (s.rarities.length && !s.rarities.includes(rarityOf(c))) return false;
  if (s.stars.length && !s.stars.includes(c.draft_cost ?? 1)) return false;
  return true;
}

/** Filter and sort. Missing values always sort last, whichever the direction. */
export function applyFilters<T extends FilterCard>(cards: T[], s: FilterSpec): T[] {
  const out = cards.filter((c) => matches(c, s));
  const dir = s.order === 'asc' ? 1 : -1;
  if (s.sort === 'name') {
    const name = (c: T) => (c.name ?? c.drep_id).toLowerCase();
    return out.sort((a, b) => dir * name(a).localeCompare(name(b)));
  }
  const def = STAT_BY_KEY.get(s.sort) ?? STAT_BY_KEY.get('govscore')!;
  return out.sort((a, b) => {
    const x = def.get(a);
    const y = def.get(b);
    if (x === null && y === null) return (b.govscore ?? -1) - (a.govscore ?? -1);
    if (x === null) return 1;
    if (y === null) return -1;
    return dir * (x - y) || (b.govscore ?? -1) - (a.govscore ?? -1);
  });
}

/** Smallest and largest value of a stat across the cards, for slider ends. */
export function statDomain(cards: FilterCard[], key: string): [number, number] | null {
  const def = STAT_BY_KEY.get(key);
  if (!def) return null;
  let lo = Infinity;
  let hi = -Infinity;
  for (const c of cards) {
    const v = def.get(c);
    if (v === null) continue;
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  return lo === Infinity ? null : [lo, hi];
}

/** How many filters are on (search and sort don't count). */
export function activeCount(s: FilterSpec): number {
  return (
    Object.values(s.ranges).filter(([lo, hi]) => lo !== null || hi !== null).length +
    Object.keys(s.badges).length +
    (s.classes.length ? 1 : 0) +
    (s.archetypes.length ? 1 : 0) +
    (s.rarities.length ? 1 : 0) +
    (s.stars.length ? 1 : 0) +
    (s.pool !== 'active' ? 1 : 0) +
    (s.hideNotListed ? 1 : 0)
  );
}

/** Badges that come in Bronze, Silver and Gold (the rest are on or off). */
export const TIERED_BADGES = new Set(ABILITY_RULES.filter((r) => r.tiers).map((r) => r.id));

/* ---------- Shareable URLs ---------- */

const LIST_KEYS = ['classes', 'archetypes', 'rarities'] as const;

/** The spec as query parameters (only what differs from the defaults), so a search can be shared. */
export function toQuery(s: FilterSpec, defaults: FilterSpec = DEFAULT_SPEC): URLSearchParams {
  const p = new URLSearchParams();
  if (s.search) p.set('q', s.search);
  if (s.sort !== defaults.sort) p.set('sort', s.sort);
  if (s.order !== defaults.order) p.set('order', s.order);
  if (s.pool !== defaults.pool) p.set('pool', s.pool);
  if (s.hideNotListed) p.set('listed', '1');
  for (const k of LIST_KEYS) if (s[k].length) p.set(k, s[k].join(','));
  if (s.stars.length) p.set('stars', s.stars.join(','));
  const badges = Object.entries(s.badges).map(([id, t]) => (t ? `${id}:${t}` : id));
  if (badges.length) p.set('badges', badges.join(','));
  for (const [key, [lo, hi]] of Object.entries(s.ranges)) {
    if (lo === null && hi === null) continue;
    p.set(`r_${key}`, `${lo ?? ''}..${hi ?? ''}`);
  }
  return p;
}

export function fromQuery(p: URLSearchParams, defaults: FilterSpec = DEFAULT_SPEC): FilterSpec {
  const s: FilterSpec = { ...defaults, ranges: {}, badges: {}, classes: [], archetypes: [], rarities: [], stars: [] };
  s.search = p.get('q') ?? '';
  const sort = p.get('sort');
  // Any simple key: lists may add their own sorts (e.g. Alignment); unknown ones fall back to GovScore.
  if (sort && /^[a-z_0-9]+$/.test(sort)) s.sort = sort;
  if (p.get('order') === 'asc' || p.get('order') === 'desc') s.order = p.get('order') as 'asc' | 'desc';
  const pool = p.get('pool');
  if (pool === 'active' || pool === 'registered' || pool === 'all') s.pool = pool;
  s.hideNotListed = p.get('listed') === '1';
  for (const k of LIST_KEYS) s[k] = (p.get(k) ?? '').split(',').filter(Boolean).slice(0, 20);
  s.stars = (p.get('stars') ?? '')
    .split(',')
    .map(Number)
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 5);
  for (const part of (p.get('badges') ?? '').split(',').filter(Boolean)) {
    const [id, t] = part.split(':');
    const tier = Number(t ?? 0);
    if (/^[a-z_]+$/.test(id)) s.badges[id] = (tier >= 0 && tier <= 3 ? tier : 0) as 0 | 1 | 2 | 3;
  }
  p.forEach((value, key) => {
    if (!key.startsWith('r_') || !STAT_BY_KEY.has(key.slice(2))) return;
    const [a, b] = value.split('..');
    const num = (x: string | undefined) => (x === undefined || x === '' || !Number.isFinite(Number(x)) ? null : Number(x));
    s.ranges[key.slice(2)] = [num(a), num(b)];
  });
  return s;
}
