/**
 * Geometry for the Cardanathon "mountain": each DRep's season points climb
 * from bottom-left (season start, 0 points) up and to the right as the season
 * goes on. Height follows points on a curve (points ^ exponent): exponent 1 is
 * strictly proportional; above 1 it stretches the summit so a tight top 10
 * spreads over the upper half instead of bunching at the top. Order is always
 * kept, and a bigger lead always stands higher. Pure: the page draws it live, and the same
 * function can draw the trophy NFT art at the season's end.
 */

import type { PointEvent } from './points';

export interface Climber {
  drep_id: string;
  events: PointEvent[];
}

export interface MountainLine {
  drep_id: string;
  points: number;
  /** SVG path for the climb so far */
  d: string;
  /** Where the line currently ends */
  x: number;
  y: number;
  /** Label y after nudging labels apart so they don't overlap */
  labelY: number;
}

export interface MountainGeometry {
  lines: MountainLine[];
  /** Silhouette under the leader's line, for the mountain fill */
  ridge: string;
  yMax: number;
  yMin: number;
  plot: { left: number; right: number; top: number; bottom: number };
}

export interface MountainOptions {
  width: number;
  height: number;
  starts_at: number;
  ends_at: number;
  /** Draw up to this moment (unix seconds) */
  t: number;
  /** Fix the vertical scale (e.g. the final leader's points) so replays don't rescale */
  scaleTo?: number;
  padding?: { left: number; right: number; top: number; bottom: number };
  labelGap?: number;
  /** Height curve: 1 = proportional; see summitExponent(). */
  exponent?: number;
}

/**
 * The curve that puts the 10th-placed climber at about `target` of the height
 * when the leader is at the top: exponent = ln(target) / ln(tenth / leader),
 * kept between 1 (proportional) and 3.
 */
export function summitExponent(finalPoints: number[], target = 0.35): number {
  const sorted = finalPoints.filter((p) => p > 0).sort((a, b) => b - a);
  if (sorted.length < 2) return 1;
  const ratio = sorted[Math.min(9, sorted.length - 1)] / sorted[0];
  if (ratio <= 0 || ratio >= 1) return 1;
  return Math.min(3, Math.max(1, Math.log(target) / Math.log(ratio)));
}

export function mountain(climbers: Climber[], o: MountainOptions): MountainGeometry {
  const pad = o.padding ?? { left: 36, right: 150, top: 28, bottom: 28 };
  const plot = { left: pad.left, right: o.width - pad.right, top: pad.top, bottom: o.height - pad.bottom };
  const span = Math.max(1, o.ends_at - o.starts_at);

  const series = climbers.map((c) => {
    const pts: Array<[number, number]> = [[o.starts_at, 0]];
    let sum = 0;
    for (const e of c.events) {
      if (e.t > o.t) break;
      sum += e.pts;
      pts.push([e.t, sum]);
    }
    pts.push([Math.min(o.t, o.ends_at), sum]);
    return { drep_id: c.drep_id, pts, points: sum };
  });

  const yMax = Math.max(10, o.scaleTo ?? 0, ...series.map((s) => s.points)) * 1.08;
  const yMin = Math.min(0, ...series.flatMap((s) => s.pts.map((p) => p[1])));
  const X = (t: number) => plot.left + ((t - o.starts_at) / span) * (plot.right - plot.left);
  const k = o.exponent ?? 1;
  const h = plot.bottom - plot.top;
  // Below zero (missed votes) stays linear in a thin band under the baseline.
  const zero = plot.bottom - (yMin < 0 ? (-yMin / (yMax - yMin)) * h : 0);
  const Y = (v: number) => (v >= 0 ? zero - Math.pow(v / yMax, k) * (zero - plot.top) : zero + (v / yMin) * (plot.bottom - zero));

  const lines: MountainLine[] = series.map((s) => {
    // A step climb (flat, then up at each scoring moment) reads like switchbacks on a trail.
    let d = '';
    let prevY = Y(0);
    s.pts.forEach(([t, v], i) => {
      const x = X(t);
      const y = Y(v);
      d += i === 0 ? `M${x.toFixed(1)},${y.toFixed(1)}` : `L${x.toFixed(1)},${prevY.toFixed(1)}L${x.toFixed(1)},${y.toFixed(1)}`;
      prevY = y;
    });
    const [lt, lv] = s.pts[s.pts.length - 1];
    return { drep_id: s.drep_id, points: s.points, d, x: X(lt), y: Y(lv), labelY: Y(lv) };
  });

  // Nudge labels apart (top to bottom) so names stay readable.
  const gap = o.labelGap ?? 18;
  const byY = [...lines].sort((a, b) => a.y - b.y);
  for (let i = 1; i < byY.length; i++) {
    if (byY[i].labelY - byY[i - 1].labelY < gap) byY[i].labelY = byY[i - 1].labelY + gap;
  }
  const overflow = byY.length ? byY[byY.length - 1].labelY - plot.bottom : 0;
  if (overflow > 0) for (const l of byY) l.labelY = Math.max(plot.top, l.labelY - overflow);

  const leader = [...lines].sort((a, b) => b.points - a.points)[0];
  const ridge = leader ? `${leader.d}L${leader.x.toFixed(1)},${plot.bottom}L${plot.left},${plot.bottom}Z` : '';

  return { lines, ridge, yMax, yMin, plot };
}
