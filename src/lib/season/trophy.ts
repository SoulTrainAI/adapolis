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
import { planetNear, spaceLayers } from './space';
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

export interface TrophyArtInput {
  width: number;
  height: number;
  climbers: Climber[];
  winner: string;
  medal: Medal;
  starts_at: number;
  /** Where the time axis ends: the season's end, or "now" for a preview (so the race so far fills the frame). */
  ends_at: number;
  /** Draw up to here: the season's end, or now while it's still being played. */
  t: number;
  /** Makes the sky unique to this trophy. */
  seed: string;
  /** Optional licensed logo for the destination planet (data URI). */
  logo?: string | null;
}

/**
 * The trophy artwork as a self-contained SVG (no text, so it renders the same
 * anywhere): deep space, the field's flight paths toward the destination
 * planet in faint silver, and the winner's as a comet trail in their medal's
 * colour, with a sparkle at its head.
 */
export function trophyArt(o: TrophyArtInput): string {
  const m = MEDALS[o.medal];
  const W = o.width;
  const H = o.height;
  const final = o.climbers.map((c) => c.events.filter((e) => e.t <= o.t).reduce((s, e) => s + e.pts, 0));
  const g = mountain(o.climbers, {
    width: W,
    height: H,
    starts_at: o.starts_at,
    ends_at: o.ends_at,
    t: o.t,
    scaleTo: Math.max(0, ...final),
    exponent: summitExponent(final),
    padding: { left: Math.round(W * 0.05), right: Math.round(W * 0.2), top: Math.round(H * 0.36), bottom: Math.round(H * 0.07) },
    curve: 'smooth',
    samples: 28,
  });
  const { plot } = g;
  const lead = [...g.lines].sort((a, b) => b.points - a.points)[0];
  const r = W * 0.14;
  const planet = planetNear(lead?.x ?? plot.right, lead?.y ?? plot.top, r, W * 0.035);
  const layers = spaceLayers({ width: W, height: H, seed: o.seed, planet, logo: o.logo, id: 't' });

  const trail = `<linearGradient id="trail" gradientUnits="userSpaceOnUse" x1="${plot.left}" y1="0" x2="${plot.right}" y2="0"><stop offset="0" stop-color="#e2e8f0" stop-opacity="0"/><stop offset="0.6" stop-color="#e2e8f0" stop-opacity="0.22"/><stop offset="1" stop-color="#f8fafc" stop-opacity="0.55"/></linearGradient>`;
  const comet = `<linearGradient id="comet" gradientUnits="userSpaceOnUse" x1="${plot.left}" y1="0" x2="${plot.right}" y2="0"><stop offset="0" stop-color="${m.deep}" stop-opacity="0.15"/><stop offset="0.55" stop-color="${m.deep}" stop-opacity="0.85"/><stop offset="1" stop-color="${m.light}"/></linearGradient>`;
  const halo = `<radialGradient id="head"><stop offset="0" stop-color="#fff"/><stop offset="0.18" stop-color="${m.light}" stop-opacity="0.9"/><stop offset="1" stop-color="${m.deep}" stop-opacity="0"/></radialGradient>`;
  const glow = `<filter id="cglow" x="-10%" y="-30%" width="120%" height="160%"><feGaussianBlur stdDeviation="${(W * 0.009).toFixed(1)}"/></filter>`;
  const spike = `<filter id="spk" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="1.2"/></filter>`;

  const win = g.lines.find((l) => l.drep_id === o.winner);
  const others = g.lines
    .filter((l) => l.drep_id !== o.winner)
    .map((l) => `<path d="${l.d}" fill="none" stroke="url(#trail)" stroke-width="${(W * 0.0035).toFixed(2)}" stroke-linecap="round"/><circle cx="${l.x.toFixed(1)}" cy="${l.y.toFixed(1)}" r="${(W * 0.005).toFixed(1)}" fill="#f8fafc" opacity="0.75"/>`)
    .join('');

  let lit = '';
  if (win) {
    const x = win.x.toFixed(1);
    const y = win.y.toFixed(1);
    const L = W * 0.06;
    lit =
      `<path d="${win.d}" fill="none" stroke="${m.deep}" stroke-width="${(W * 0.022).toFixed(1)}" stroke-opacity="0.55" filter="url(#cglow)" stroke-linecap="round"/>` +
      `<path d="${win.d}" fill="none" stroke="url(#comet)" stroke-width="${(W * 0.009).toFixed(1)}" stroke-linecap="round"/>` +
      `<path d="${win.d}" fill="none" stroke="#fff" stroke-opacity="0.55" stroke-width="${(W * 0.0025).toFixed(1)}" stroke-linecap="round"/>` +
      `<circle cx="${x}" cy="${y}" r="${(W * 0.07).toFixed(1)}" fill="url(#head)" opacity="0.85"/>` +
      `<ellipse cx="${x}" cy="${y}" rx="${L.toFixed(1)}" ry="1.1" fill="${m.light}" filter="url(#spk)"/>` +
      `<ellipse cx="${x}" cy="${y}" rx="1.1" ry="${L.toFixed(1)}" fill="${m.light}" filter="url(#spk)"/>` +
      `<ellipse cx="${x}" cy="${y}" rx="${(L * 0.9).toFixed(1)}" ry="0.6" fill="#fff"/>` +
      `<ellipse cx="${x}" cy="${y}" rx="0.6" ry="${(L * 0.9).toFixed(1)}" fill="#fff"/>` +
      `<circle cx="${x}" cy="${y}" r="${(W * 0.009).toFixed(1)}" fill="#fff"/>`;
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
    layers.sky +
    layers.planet +
    `<defs>${trail}${comet}${halo}${glow}${spike}</defs>` +
    others +
    layers.vignette +
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

/**
 * A trophy cup in the medal's metal (bowl, handles, star emblem, stem and
 * plinth), as a standalone SVG for the card's corner. 100 × 120 view box.
 */
export function trophyCup(medal: Medal): string {
  const m = MEDALS[medal];
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="120" viewBox="0 0 100 120">` +
    `<defs>` +
    `<radialGradient id="glow" cx="0.5" cy="0.42" r="0.55"><stop offset="0" stop-color="${m.light}" stop-opacity="0.45"/><stop offset="1" stop-color="${m.light}" stop-opacity="0"/></radialGradient>` +
    `<linearGradient id="metal" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${m.deep}"/><stop offset="0.28" stop-color="${m.light}"/><stop offset="0.5" stop-color="#ffffff"/><stop offset="0.72" stop-color="${m.light}"/><stop offset="1" stop-color="${m.deep}"/></linearGradient>` +
    `<linearGradient id="shade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.28"/></linearGradient>` +
    `<linearGradient id="plinth" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#334155"/><stop offset="1" stop-color="#0f172a"/></linearGradient>` +
    `</defs>` +
    `<circle cx="50" cy="48" r="48" fill="url(#glow)"/>` +
    // Handles behind the bowl.
    `<path d="M24 22 C8 22 8 46 26 50" fill="none" stroke="url(#metal)" stroke-width="6" stroke-linecap="round"/>` +
    `<path d="M76 22 C92 22 92 46 74 50" fill="none" stroke="url(#metal)" stroke-width="6" stroke-linecap="round"/>` +
    // Bowl.
    `<path d="M22 14 H78 V30 C78 54 64 67 50 69 C36 67 22 54 22 30 Z" fill="url(#metal)" stroke="${m.deep}" stroke-width="1.5"/>` +
    `<path d="M22 14 H78 V30 C78 54 64 67 50 69 C36 67 22 54 22 30 Z" fill="url(#shade)"/>` +
    `<ellipse cx="50" cy="14" rx="28" ry="4" fill="${m.light}" stroke="${m.deep}" stroke-width="1.5"/>` +
    // Star emblem.
    `<polygon points="50,28 53.5,36.5 62.5,37 55.5,42.8 57.8,51.5 50,46.6 42.2,51.5 44.5,42.8 37.5,37 46.5,36.5" fill="#ffffff" fill-opacity="0.85" stroke="${m.deep}" stroke-width="1.2" stroke-linejoin="round"/>` +
    // Shine.
    `<path d="M30 20 C29 34 32 46 38 54" fill="none" stroke="#ffffff" stroke-opacity="0.7" stroke-width="2.5" stroke-linecap="round"/>` +
    // Stem, knot and cup foot.
    `<path d="M45 68 H55 L53 82 H47 Z" fill="url(#metal)" stroke="${m.deep}" stroke-width="1.2"/>` +
    `<ellipse cx="50" cy="83" rx="9" ry="3.2" fill="url(#metal)" stroke="${m.deep}" stroke-width="1.2"/>` +
    `<path d="M38 92 C38 87 62 87 62 92 Z" fill="url(#metal)" stroke="${m.deep}" stroke-width="1.2"/>` +
    // Plinth with a metal plate.
    `<rect x="28" y="92" width="44" height="22" rx="3" fill="url(#plinth)" stroke="${m.deep}" stroke-width="1.2"/>` +
    `<rect x="36" y="98" width="28" height="10" rx="1.5" fill="url(#metal)"/>` +
    `</svg>`
  );
}
