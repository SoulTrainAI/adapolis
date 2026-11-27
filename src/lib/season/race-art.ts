/**
 * The Cardanathon as it stands right now, as one picture: deep space, the
 * top 10's flight paths in their race colours with the leader's trail
 * glowing, heading for the destination planet. Pure SVG (no text); the
 * snapshot image adds names and points on top.
 */

import { mountain, summitExponent, type Climber, type MountainLine } from './mountain';
import { planetNear, spaceLayers } from './space';

/** Same colours, in finishing order, as the live race on /cardanathon. */
export const RACE_COLORS = ['#fbbf24', '#e2e8f0', '#fb923c', '#a78bfa', '#38bdf8', '#34d399', '#f472b6', '#60a5fa', '#facc15', '#2dd4bf'];

export interface RaceArtInput {
  width: number;
  height: number;
  /** Ranked climbers, leader first. */
  climbers: Climber[];
  starts_at: number;
  /** Draw up to here; the race so far fills the frame. */
  t: number;
  seed: string;
  /** Space kept clear on the right for a leaderboard panel. */
  right: number;
}

export function raceArt(o: RaceArtInput): { svg: string; lines: MountainLine[] } {
  const W = o.width;
  const H = o.height;
  const final = o.climbers.map((c) => c.events.filter((e) => e.t <= o.t).reduce((s, e) => s + e.pts, 0));
  const g = mountain(o.climbers, {
    width: W,
    height: H,
    starts_at: o.starts_at,
    ends_at: Math.max(o.t, o.starts_at + 1),
    t: o.t,
    scaleTo: Math.max(0, ...final),
    exponent: summitExponent(final),
    padding: { left: Math.round(W * 0.03), right: o.right, top: Math.round(H * 0.3), bottom: Math.round(H * 0.08) },
    curve: 'smooth',
    samples: 40,
  });
  const lead = g.lines.find((l) => l.drep_id === o.climbers[0]?.drep_id);
  const planet = planetNear(lead?.x ?? g.plot.right, lead?.y ?? g.plot.top, H * 0.17, H * 0.05, -38);
  const layers = spaceLayers({ width: W, height: H, seed: o.seed, planet, id: 'r' });
  const color = new Map(o.climbers.map((c, i) => [c.drep_id, RACE_COLORS[i % RACE_COLORS.length]]));

  const glow = `<filter id="rglow" x="-5%" y="-20%" width="110%" height="140%"><feGaussianBlur stdDeviation="${(W * 0.004).toFixed(1)}"/></filter>`;
  const ordered = [...g.lines].reverse();
  const paths =
    (lead ? `<path d="${lead.d}" fill="none" stroke="${color.get(lead.drep_id)}" stroke-width="${(W * 0.012).toFixed(1)}" stroke-opacity="0.5" filter="url(#rglow)" stroke-linecap="round"/>` : '') +
    ordered
      .map(
        (l) =>
          `<path d="${l.d}" fill="none" stroke="${color.get(l.drep_id)}" stroke-width="${(l === lead ? W * 0.0042 : W * 0.0026).toFixed(1)}" stroke-opacity="${l === lead ? 1 : 0.85}" stroke-linecap="round"/>` +
          `<circle cx="${l.x.toFixed(1)}" cy="${l.y.toFixed(1)}" r="${(W * 0.0065).toFixed(1)}" fill="${color.get(l.drep_id)}" stroke="#0b1024" stroke-width="2"/>`
      )
      .join('');

  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${layers.sky}${layers.planet}<defs>${glow}</defs>${layers.vignette}${paths}</svg>`,
    lines: g.lines,
  };
}
