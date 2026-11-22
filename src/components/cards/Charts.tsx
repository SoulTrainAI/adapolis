/** Small dependency-free SVG charts for the trading cards. */

type Point = { label: string; value: number | null };

/** Tiny trend line for the card front. Gaps (null) are skipped. */
export function Sparkline({ values, color = '#c4b5fd', width = 120, height = 22 }: { values: Array<number | null>; color?: string; width?: number; height?: number }) {
  const nums = values.filter((v): v is number => v !== null);
  if (nums.length < 2) return <svg width={width} height={height} aria-hidden />;
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const span = max - min || 1;
  const step = width / Math.max(1, values.length - 1);
  const pts = values
    .map((v, i) => (v === null ? null : `${(i * step).toFixed(1)},${(height - 2 - ((v - min) / span) * (height - 4)).toFixed(1)}`))
    .filter((p): p is string => p !== null);
  const last = pts[pts.length - 1].split(',');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r="2.6" fill={color} />
    </svg>
  );
}

const AXIS = '#475569';
const GRID = '#1e293b';
const TEXT = '#94a3b8';

function niceRange(values: number[]): [number, number] {
  const min = Math.min(0, ...values);
  const max = Math.max(...values, 1);
  return [min, max];
}

/** Line chart with labelled ends, for GovScore over time. */
export function LineChart({ points, color = '#8b5cf6', unit = '', height = 180 }: { points: Point[]; color?: string; unit?: string; height?: number }) {
  const width = 560;
  const pad = { l: 36, r: 10, t: 10, b: 24 };
  const nums = points.map((p) => p.value).filter((v): v is number => v !== null);
  if (nums.length < 2) return <p className="text-sm text-slate-500">Not enough history yet.</p>;
  const [lo, hi] = [Math.min(...nums), Math.max(...nums)];
  const min = Math.max(0, Math.floor(lo - (hi - lo) * 0.15));
  const max = Math.min(100, Math.ceil(hi + (hi - lo) * 0.15)) || 1;
  const x = (i: number) => pad.l + (i / Math.max(1, points.length - 1)) * (width - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - (v - min) / (max - min || 1)) * (height - pad.t - pad.b);
  const path = points
    .map((p, i) => (p.value === null ? null : `${x(i).toFixed(1)},${y(p.value).toFixed(1)}`))
    .filter((p): p is string => p !== null)
    .join(' ');
  const ticks = [min, (min + max) / 2, max];
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label={`Trend from ${nums[0]}${unit} to ${nums[nums.length - 1]}${unit}`}>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={pad.l} x2={width - pad.r} y1={y(t)} y2={y(t)} stroke={GRID} />
          <text x={pad.l - 6} y={y(t) + 4} fontSize="11" textAnchor="end" fill={TEXT}>
            {Math.round(t)}
          </text>
        </g>
      ))}
      <polyline points={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) =>
        p.value === null ? null : (
          <circle key={i} cx={x(i)} cy={y(p.value)} r="3.5" fill={color}>
            <title>{`${p.label}: ${p.value}${unit}`}</title>
          </circle>
        )
      )}
      <text x={pad.l} y={height - 6} fontSize="11" fill={TEXT}>
        {points[0].label}
      </text>
      <text x={width - pad.r} y={height - 6} fontSize="11" textAnchor="end" fill={TEXT}>
        {points[points.length - 1].label}
      </text>
    </svg>
  );
}

/** Bar chart for points per window; negative bars (missed votes) drop below the axis. */
export function BarChart({ points, color = '#f5b301', negative = '#f87171', height = 180 }: { points: Point[]; color?: string; negative?: string; height?: number }) {
  const width = 560;
  const pad = { l: 36, r: 10, t: 10, b: 24 };
  const nums = points.map((p) => p.value ?? 0);
  if (nums.length === 0) return <p className="text-sm text-slate-500">No seasons yet.</p>;
  const [min, max] = niceRange(nums);
  const y = (v: number) => pad.t + (1 - (v - min) / (max - min || 1)) * (height - pad.t - pad.b);
  const slot = (width - pad.l - pad.r) / nums.length;
  const bw = Math.max(2, slot * 0.7);
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Fantasy points per window">
      {[min, 0, max].filter((v, i, a) => a.indexOf(v) === i).map((t) => (
        <g key={t}>
          <line x1={pad.l} x2={width - pad.r} y1={y(t)} y2={y(t)} stroke={t === 0 ? AXIS : GRID} />
          <text x={pad.l - 6} y={y(t) + 4} fontSize="11" textAnchor="end" fill={TEXT}>
            {Math.round(t)}
          </text>
        </g>
      ))}
      {nums.map((v, i) => {
        const top = y(Math.max(0, v));
        const h = Math.abs(y(v) - y(0));
        return (
          <rect key={i} x={pad.l + i * slot + (slot - bw) / 2} y={top} width={bw} height={Math.max(1, h)} rx="2" fill={v < 0 ? negative : color}>
            <title>{`${points[i].label}: ${v} pts`}</title>
          </rect>
        );
      })}
      <text x={pad.l} y={height - 6} fontSize="11" fill={TEXT}>
        {points[0].label}
      </text>
      <text x={width - pad.r} y={height - 6} fontSize="11" textAnchor="end" fill={TEXT}>
        {points[points.length - 1].label}
      </text>
    </svg>
  );
}
