'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type { Race } from '@/lib/season/race';
import { mountain } from '@/lib/season/mountain';
import { displayName, orderAt } from '@/lib/season/commentary';

const COLORS = ['#fbbf24', '#e2e8f0', '#fb923c', '#a78bfa', '#38bdf8', '#34d399', '#f472b6', '#60a5fa', '#facc15', '#2dd4bf'];
const CLIMBERS = 10;

/**
 * The Cardanathon as a mountain climb: the top 10 DReps' season points rise
 * from bottom-left to top-right through the season. Heights are proportional
 * to points, so the summit gap shows how big a win really is.
 */
export function MountainRace({ race, t, until, highlight }: { race: Race; t: number; until: number; highlight: string[] }) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(1000);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(320, Math.round(entry.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const narrow = width < 640;
  const height = narrow ? 340 : Math.min(520, Math.round(width * 0.42));
  const byId = useMemo(() => new Map(race.racers.map((r) => [r.drep_id, r])), [race]);
  // Who climbs: the final (or current) top 10, so the cast doesn't change mid-replay.
  const cast = useMemo(() => orderAt(race.racers, until).slice(0, CLIMBERS), [race, until]);
  const color = useMemo(() => new Map(cast.map((c, i) => [c.drep_id, COLORS[i % COLORS.length]])), [cast]);
  const geo = useMemo(
    () =>
      mountain(
        cast.map((c) => byId.get(c.drep_id)!),
        {
          width,
          height,
          starts_at: race.starts_at,
          ends_at: race.ends_at,
          t,
          scaleTo: cast[0]?.points ?? 0,
          padding: narrow ? { left: 8, right: 96, top: 24, bottom: 26 } : { left: 40, right: 170, top: 30, bottom: 30 },
          labelGap: narrow ? 16 : 20,
        }
      ),
    [cast, byId, width, height, race.starts_at, race.ends_at, t, narrow]
  );
  const ranked = useMemo(() => [...geo.lines].sort((a, b) => b.points - a.points), [geo]);
  const leader = ranked[0];
  const epochs = race.end_epoch - race.start_epoch + 1;
  const x = (frac: number) => geo.plot.left + frac * (geo.plot.right - geo.plot.left);

  return (
    <div ref={box} className="relative w-full overflow-hidden rounded-2xl border border-slate-800 bg-[linear-gradient(180deg,#070b1d_0%,#101a3d_55%,#1b2452_100%)]">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${race.label} Cardanathon mountain: ${leader ? `${displayName(byId.get(leader.drep_id)!)} leads with ${leader.points} points` : 'no points yet'}`}>
        <defs>
          <linearGradient id="mtn-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#1e1b4b" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="mtn-far" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#334155" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
          </linearGradient>
          {geo.lines.map((l) => (
            <clipPath key={l.drep_id} id={`av-${l.drep_id}`}>
              <circle cx={l.x} cy={l.y} r={narrow ? 9 : 12} />
            </clipPath>
          ))}
        </defs>

        {/* Stars and distant ranges, for atmosphere. */}
        {Array.from({ length: 40 }, (_, i) => (
          <circle key={i} cx={((i * 97) % 100) * (width / 100)} cy={((i * 53) % 45) * (height / 100)} r={i % 7 === 0 ? 1.2 : 0.6} fill="#fff" opacity={0.35} />
        ))}
        <path
          d={`M0,${height} L${width * 0.12},${height * 0.62} L${width * 0.25},${height * 0.75} L${width * 0.42},${height * 0.5} L${width * 0.58},${height * 0.7} L${width * 0.75},${height * 0.45} L${width * 0.9},${height * 0.66} L${width},${height * 0.55} L${width},${height} Z`}
          fill="url(#mtn-far)"
        />

        {/* Epoch markers */}
        {Array.from({ length: epochs + 1 }, (_, i) => (
          <g key={i}>
            <line x1={x(i / epochs)} x2={x(i / epochs)} y1={geo.plot.top} y2={geo.plot.bottom} stroke="#94a3b8" strokeOpacity={0.12} strokeDasharray="3 5" />
            <text x={x(i / epochs)} y={height - 8} textAnchor="middle" fontSize={narrow ? 9 : 11} fill="#64748b">
              {i < epochs ? `E${race.start_epoch + i}` : '🏁'}
            </text>
          </g>
        ))}

        {/* The mountain under the leader's climb */}
        {geo.ridge && <path d={geo.ridge} fill="url(#mtn-fill)" />}

        {/* Climbs: lowest first so the leaders draw on top */}
        {[...ranked].reverse().map((l) => {
          const lit = highlight.includes(l.drep_id);
          return (
            <path
              key={l.drep_id}
              d={l.d}
              fill="none"
              stroke={color.get(l.drep_id)}
              strokeWidth={lit ? 4 : l === leader ? 3 : 2}
              strokeOpacity={highlight.length && !lit ? 0.3 : 0.95}
              strokeLinejoin="round"
            />
          );
        })}

        {/* Climbers at the end of their lines, with leader lines to their labels */}
        {ranked.map((l, i) => {
          const r = byId.get(l.drep_id)!;
          const name = displayName(r);
          const c = color.get(l.drep_id)!;
          const rad = narrow ? 9 : 12;
          const short = name.length > (narrow ? 10 : 18) ? `${name.slice(0, narrow ? 9 : 17)}…` : name;
          return (
            <g key={l.drep_id}>
              <line x1={l.x + rad} y1={l.y} x2={geo.plot.right + 8} y2={l.labelY} stroke={c} strokeOpacity={0.35} />
              <circle cx={l.x} cy={l.y} r={rad + 2} fill={c} />
              {r.image ? (
                <image href={r.image} x={l.x - rad} y={l.y - rad} width={rad * 2} height={rad * 2} clipPath={`url(#av-${l.drep_id})`} preserveAspectRatio="xMidYMid slice" />
              ) : (
                <text x={l.x} y={l.y + 4} textAnchor="middle" fontSize={rad} fontWeight={700} fill="#0f172a">
                  {name.slice(0, 1).toUpperCase()}
                </text>
              )}
              {i === 0 && l.points > 0 && (
                <text x={l.x} y={l.y - rad - 6} textAnchor="middle" fontSize={narrow ? 14 : 18}>
                  👑
                </text>
              )}
              <Link href={`/dreps/${l.drep_id}`}>
                <text x={geo.plot.right + 12} y={l.labelY + 4} fontSize={narrow ? 10 : 12} fontWeight={600} fill="#e2e8f0">
                  <tspan fill={c}>{i + 1}.</tspan> {short} <tspan fill={c}>{l.points}</tspan>
                </text>
              </Link>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
