'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type { Race } from '@/lib/season/race';
import { mountain, summitExponent } from '@/lib/season/mountain';
import { planetNear, spaceScene } from '@/lib/season/space';
import { displayName, orderAt } from '@/lib/season/commentary';

const COLORS = ['#fbbf24', '#e2e8f0', '#fb923c', '#a78bfa', '#38bdf8', '#34d399', '#f472b6', '#60a5fa', '#facc15', '#2dd4bf'];
const CLIMBERS = 10;

/**
 * The Cardanathon as a flight through space: the top 10 DReps' season points
 * carry them from bottom-left toward the destination planet in the top-right
 * as the season goes on. Height follows points (stretched near the top so a
 * tight race spreads out), so a bigger lead always flies higher.
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
  // Who climbs: the top 10 at this moment, matching the podium above. Colours stay with a DRep for the whole replay.
  const cast = useMemo(() => orderAt(race.racers, t).slice(0, CLIMBERS), [race, t]);
  const color = useMemo(() => new Map(orderAt(race.racers, until).map((c, i) => [c.drep_id, COLORS[i % COLORS.length]])), [race, until]);
  const finalTop = useMemo(() => orderAt(race.racers, until)[0]?.points ?? 0, [race, until]);
  // One curve for the whole replay, set by where the final top 10 finish.
  const exponent = useMemo(() => summitExponent(orderAt(race.racers, until).slice(0, CLIMBERS).map((o) => o.points)), [race, until]);
  const planetR = Math.round(height * (narrow ? 0.15 : 0.17));
  const pad = narrow ? { left: 8, right: 96, top: Math.round(planetR * 1.35), bottom: 26 } : { left: 40, right: 170, top: Math.round(planetR * 1.35), bottom: 30 };
  const planet = planetNear(width - pad.right, pad.top, planetR, planetR * 0.3, -42);
  // The sky only changes with the frame's size, not as the replay runs.
  const sky = useMemo(
    () => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(spaceScene({ width, height, seed: race.label, planet, id: 'race', stars: 0.8 }))}`,
    // eslint-disable-next-line react-hooks/exhaustive-deps -- planet derives from width/height
    [width, height, race.label]
  );
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
          scaleTo: finalTop,
          exponent,
          padding: pad,
          labelGap: narrow ? 16 : 20,
          curve: 'smooth',
          samples: (race.end_epoch - race.start_epoch + 1) * 8,
        }
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pad derives from narrow/height
    [cast, byId, width, height, race.starts_at, race.ends_at, race.start_epoch, race.end_epoch, t, narrow, finalTop, exponent]
  );
  const ranked = useMemo(() => [...geo.lines].sort((a, b) => b.points - a.points), [geo]);
  const leader = ranked[0];
  const epochs = race.end_epoch - race.start_epoch + 1;
  const x = (frac: number) => geo.plot.left + frac * (geo.plot.right - geo.plot.left);

  return (
    <div ref={box} className="relative w-full overflow-hidden rounded-2xl border border-slate-800 bg-[#05071a]">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${race.label} Cardanathon race: ${leader ? `${displayName(byId.get(leader.drep_id)!)} leads with ${leader.points} points` : 'no points yet'}`}>
        <defs>
          <filter id="race-glow" x="-5%" y="-20%" width="110%" height="140%">
            <feGaussianBlur stdDeviation="4" />
          </filter>
          {geo.lines.map((l) => (
            <clipPath key={l.drep_id} id={`av-${l.drep_id}`}>
              <circle cx={l.x} cy={l.y} r={narrow ? 9 : 12} />
            </clipPath>
          ))}
        </defs>

        {/* Deep space and the destination planet */}
        <image href={sky} x={0} y={0} width={width} height={height} preserveAspectRatio="none" />

        {/* Epoch markers */}
        {Array.from({ length: epochs + 1 }, (_, i) => (
          <g key={i}>
            <line x1={x(i / epochs)} x2={x(i / epochs)} y1={geo.plot.top} y2={geo.plot.bottom} stroke="#cbd5e1" strokeOpacity={0.08} strokeDasharray="2 6" />
            <text x={x(i / epochs)} y={height - 8} textAnchor="middle" fontSize={narrow ? 9 : 11} fill="#64748b">
              {i < epochs ? `E${race.start_epoch + i}` : '🏁'}
            </text>
          </g>
        ))}

        {/* The leader's trail glows */}
        {leader && <path d={leader.d} fill="none" stroke={color.get(leader.drep_id)} strokeWidth={8} strokeOpacity={0.45} filter="url(#race-glow)" strokeLinecap="round" />}

        {/* Flight paths: lowest first so the leaders draw on top */}
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
              strokeLinecap="round"
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
          const short = fitLabel(name, narrow ? 10 : 18);
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
                <text x={geo.plot.right + 12} y={l.labelY + 4} fontSize={narrow ? 10 : 12} fontWeight={600} fill="#e2e8f0" stroke="#020617" strokeWidth={3} strokeOpacity={0.85} paintOrder="stroke" strokeLinejoin="round">
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

/** Truncate to a width budget where wide (CJK, emoji) characters count double. */
function fitLabel(name: string, budget: number): string {
  const w = (c: string) => {
    const cp = c.codePointAt(0) ?? 0;
    const cjk = (cp >= 0x1100 && cp <= 0x115f) || (cp >= 0x2e80 && cp <= 0xa4cf) || (cp >= 0xac00 && cp <= 0xd7a3) || (cp >= 0xf900 && cp <= 0xfaff);
    const full = (cp >= 0xfe30 && cp <= 0xfe4f) || (cp >= 0xff00 && cp <= 0xff60) || (cp >= 0xffe0 && cp <= 0xffe6) || cp >= 0x1f300;
    return cjk || full ? 2 : 1;
  };
  const chars = Array.from(name);
  if (chars.reduce((a, c) => a + w(c), 0) <= budget) return name;
  let used = 0;
  let out = '';
  for (const c of chars) {
    if (used + w(c) > budget - 1) break;
    used += w(c);
    out += c;
  }
  return `${out.trimEnd()}…`;
}
