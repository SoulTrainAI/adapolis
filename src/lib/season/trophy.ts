/**
 * DRep All-Star Season Trophies (docs/GAME.md 2.9b): six one-of-one NFTs per
 * season, Gold / Silver / Bronze for the top 3 DReps and the top 3
 * prize-eligible global teams. The artwork is the season's own Cardanathon
 * mountain with the winner's climb lit up in their medal's colour.
 *
 * Pure: no database, no fetches. Points come from the season's process-only
 * scoring (Cardinal Rule); nothing here looks at how anyone voted.
 */

import { mountain, summitExponent, type Climber } from './mountain';
import { epochAt, pickContribution, type PointEvent } from './points';

export type TrophyKind = 'drep' | 'team';
export type Medal = 'gold' | 'silver' | 'bronze';

export const MEDALS: Record<Medal, { label: string; place: number; light: string; deep: string }> = {
  gold: { label: 'Gold', place: 1, light: '#fde68a', deep: '#f59e0b' },
  silver: { label: 'Silver', place: 2, light: '#f1f5f9', deep: '#94a3b8' },
  bronze: { label: 'Bronze', place: 3, light: '#fdba74', deep: '#c2410c' },
};

export function medalFor(place: number): Medal | null {
  return place === 1 ? 'gold' : place === 2 ? 'silver' : place === 3 ? 'bronze' : null;
}

export function trophyTitle(seasonLabel: string): string {
  return `DRep All-Star ${seasonLabel} Trophy`;
}

export interface TeamSlot {
  drep_id: string;
  multiplier: number;
  swapped_from?: string | null;
  swapped_from_multiplier?: number | null;
  swap_epoch?: number | null;
}

/**
 * A team's climb through the season as point events, so it can be drawn like
 * a DRep's. At every moment the total equals the leaderboard's rule: each
 * slot's points so far, gains times the multiplier locked at the pick (losses
 * at 1×); a swapped slot keeps the old DRep's points before the swap epoch
 * and the new DRep's from it on.
 */
export function teamClimb(slots: TeamSlot[], eventsByDrep: Map<string, PointEvent[]>): PointEvent[] {
  type Tick = { t: number; slot: number; part: 'old' | 'new'; pts: number };
  const ticks: Tick[] = [];
  slots.forEach((s, slot) => {
    const swapped = s.swapped_from && s.swap_epoch != null;
    for (const e of eventsByDrep.get(s.drep_id) ?? []) {
      if (swapped && epochAt(e.t) < s.swap_epoch!) continue;
      ticks.push({ t: e.t, slot, part: 'new', pts: e.pts });
    }
    if (swapped) {
      for (const e of eventsByDrep.get(s.swapped_from!) ?? []) {
        if (epochAt(e.t) >= s.swap_epoch!) continue;
        ticks.push({ t: e.t, slot, part: 'old', pts: e.pts });
      }
    }
  });
  ticks.sort((a, b) => a.t - b.t);

  const sums = slots.map(() => ({ old: 0, new: 0 }));
  const total = () =>
    slots.reduce((acc, s, i) => acc + pickContribution(sums[i].new, s.multiplier) + pickContribution(sums[i].old, s.swapped_from_multiplier ?? 1), 0);
  const out: PointEvent[] = [];
  let before = 0;
  for (let i = 0; i < ticks.length; i++) {
    sums[ticks[i].slot][ticks[i].part] += ticks[i].pts;
    // Several picks scoring in the same second make one step.
    if (i + 1 < ticks.length && ticks[i + 1].t === ticks[i].t) continue;
    const now = total();
    const delta = Math.round((now - before) * 10) / 10;
    if (delta !== 0) out.push({ t: ticks[i].t, kind: 'votes', pts: delta });
    before += delta;
  }
  return out;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function rng(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface TrophyArtInput {
  width: number;
  height: number;
  climbers: Climber[];
  winner: string;
  medal: Medal;
  starts_at: number;
  ends_at: number;
  /** Draw up to here: the season's end, or now while it's still being played. */
  t: number;
  /** Makes the stars and far ridges unique to this trophy. */
  seed: string;
}

/**
 * The trophy artwork as a self-contained SVG (no text, so it renders the same
 * anywhere): night sky, far ridges, the field's climbs in grey and the
 * winner's in their medal colour with a glow, a lit slope under it and a star
 * at the summit.
 */
export function trophyArt(o: TrophyArtInput): string {
  const m = MEDALS[o.medal];
  const final = o.climbers.map((c) => c.events.filter((e) => e.t <= o.t).reduce((s, e) => s + e.pts, 0));
  const g = mountain(o.climbers, {
    width: o.width,
    height: o.height,
    starts_at: o.starts_at,
    ends_at: o.ends_at,
    t: o.t,
    scaleTo: Math.max(0, ...final),
    exponent: summitExponent(final),
    padding: { left: 24, right: 48, top: Math.round(o.height * 0.14), bottom: 24 },
  });
  const { plot } = g;
  const r = rng(hash(o.seed));
  const W = o.width;
  const H = o.height;

  const stars = Array.from({ length: 70 }, () => {
    const x = r() * W;
    const y = r() * H * 0.7;
    const rad = 0.6 + r() * 1.4;
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rad.toFixed(2)}" fill="#fff" opacity="${(0.25 + r() * 0.6).toFixed(2)}"/>`;
  }).join('');

  const ridge = (base: number, amp: number, n: number, fill: string, opacity: number) => {
    let d = `M0,${H}L0,${(base + (r() - 0.5) * amp).toFixed(1)}`;
    for (let i = 1; i <= n; i++) d += `L${((W * i) / n).toFixed(1)},${(base + (r() - 0.5) * amp).toFixed(1)}`;
    return `<path d="${d}L${W},${H}Z" fill="${fill}" opacity="${opacity}"/>`;
  };
  const far = ridge(H * 0.55, H * 0.22, 9, '#312e81', 0.45) + ridge(H * 0.68, H * 0.18, 7, '#1e1b4b', 0.7);

  const win = g.lines.find((l) => l.drep_id === o.winner);
  const others = g.lines
    .filter((l) => l.drep_id !== o.winner)
    .map((l) => `<path d="${l.d}" fill="none" stroke="#94a3b8" stroke-width="2" stroke-opacity="0.38" stroke-linejoin="round"/>`)
    .join('');

  let slopeFill = '';
  let lit = '';
  if (win) {
    const slope = `${win.d}L${win.x.toFixed(1)},${plot.bottom}L${plot.left},${plot.bottom}Z`;
    const sx = win.x.toFixed(1);
    const sy = win.y.toFixed(1);
    const star = (cx: number, cy: number, R: number) => {
      const pts = Array.from({ length: 10 }, (_, i) => {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const rad = i % 2 ? R * 0.45 : R;
        return `${(cx + Math.cos(a) * rad).toFixed(1)},${(cy + Math.sin(a) * rad).toFixed(1)}`;
      });
      return `<polygon points="${pts.join(' ')}" fill="${m.light}" stroke="${m.deep}" stroke-width="2"/>`;
    };
    slopeFill = `<path d="${slope}" fill="url(#slope)"/>`;
    lit =
      `<path d="${win.d}" fill="none" stroke="${m.deep}" stroke-width="12" stroke-opacity="0.55" filter="url(#glow)" stroke-linejoin="round"/>` +
      `<path d="${win.d}" fill="none" stroke="${m.light}" stroke-width="4.5" stroke-linejoin="round"/>` +
      `<circle cx="${sx}" cy="${sy}" r="${(H * 0.12).toFixed(1)}" fill="url(#halo)"/>` +
      `<circle cx="${sx}" cy="${sy}" r="9" fill="${m.light}" stroke="#fff" stroke-width="3"/>` +
      star(win.x, win.y - 34, 18);
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
    `<defs>` +
    `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#070b1f"/><stop offset="1" stop-color="#1e1b4b"/></linearGradient>` +
    `<linearGradient id="slope" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${m.deep}" stop-opacity="0.42"/><stop offset="1" stop-color="${m.deep}" stop-opacity="0.04"/></linearGradient>` +
    `<radialGradient id="halo"><stop offset="0" stop-color="${m.light}" stop-opacity="0.55"/><stop offset="1" stop-color="${m.light}" stop-opacity="0"/></radialGradient>` +
    `<filter id="glow" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="5"/></filter>` +
    `</defs>` +
    `<rect width="${W}" height="${H}" fill="url(#sky)"/>` +
    stars +
    far +
    `<line x1="${plot.left}" y1="${plot.bottom}" x2="${plot.right}" y2="${plot.bottom}" stroke="#475569" stroke-width="1.5"/>` +
    slopeFill +
    others +
    lit +
    `</svg>`
  );
}

export interface TrophySubject {
  season_number: number;
  season_label: string;
  kind: TrophyKind;
  medal: Medal;
  /** DRep display name or team name. */
  winner_name: string;
  points: number;
  /** For a DRep trophy, the DRep ID; for a team, the five DReps drafted. */
  drep_id?: string;
  picks?: string[];
  start_epoch: number;
  end_epoch: number;
}

/** Trait set for the minted token (CIP-25 style, like cardMetadata). */
export function trophyMetadata(s: TrophySubject): Record<string, string | number> {
  const m = MEDALS[s.medal];
  const meta: Record<string, string | number> = {
    name: `${trophyTitle(s.season_label)} · ${m.label} ${s.kind === 'drep' ? 'DRep' : 'Team'}`,
    set: s.season_label,
    trophy: s.kind === 'drep' ? 'DRep Trophy' : 'Team Trophy',
    medal: m.label,
    place: m.place,
    winner: s.winner_name,
    season_points: s.points,
    epochs: `${s.start_epoch}–${s.end_epoch}`,
    edition: '1 of 1',
  };
  if (s.drep_id) meta.drep_id = s.drep_id;
  if (s.picks?.length) meta.team = s.picks.join(', ');
  return meta;
}
