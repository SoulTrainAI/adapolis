'use client';

/**
 * The ADApolis DRep trading card, used everywhere a DRep appears. The front
 * changes with the page (scoreboard, draft, season); tapping it lifts the card
 * out and flips it to the back: profile, stats, trends and traits.
 *
 * Every size on the card is in container units (cqw: 1% of the card's width),
 * so the card looks identical at any size and the back is exactly the size
 * of the front.
 */

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion';
import {
  BadgeCheck,
  BookOpen,
  Dog,
  ExternalLink,
  Flame,
  Gem,
  Globe,
  Hammer,
  Loader2,
  Medal,
  RotateCcw,
  Shield,
  Sparkles,
  Sprout,
  Sunrise,
  X,
  type LucideIcon,
} from 'lucide-react';
import { hashDRepId } from '@/lib/utils/avatar';
import { MyDRepBadge } from '@/components/auth/MyDRepBadge';
import { PROVISIONAL_BELOW_ELIGIBLE } from '@/lib/scoring/confidence';
import { tierFor, type CardAbility, type CardSummary, type SeasonLine, type Tier } from '@/lib/cards/types';
import { BarChart, LineChart, Sparkline } from './Charts';
import { useCardDetail } from './useCards';

export type CardVariant = 'scoreboard' | 'draft' | 'season';

interface TradingCardProps {
  card: CardSummary;
  variant: CardVariant;
  /** Multiplier locked in on a saved fantasy pick; shown instead of today's */
  lockedUnderdog?: number;
  /** Fantasy teams that drafted this DRep this season */
  draftedBy?: number;
  /** Rendered under the card (e.g. Pick button); kept outside the card's own button */
  action?: ReactNode;
  selected?: boolean;
}

const ABILITY_ICONS: Record<string, LucideIcon> = {
  scholar: BookOpen,
  early_bird: Sunrise,
  ironclad: Shield,
  workhorse: Hammer,
  on_fire: Flame,
  veteran: Medal,
  underdog: Dog,
  rookie: Sprout,
  identified: BadgeCheck,
};

// Any letter or digit in any script (constructor form: the TS target predates the u flag).
const LETTER = new RegExp('[\\p{L}\\p{N}]', 'u');

/** Card-relative size: n% of the card's width. */
const cq = (n: number) => `${n}cqw`;
const icon = (n: number): CSSProperties => ({ width: cq(n), height: cq(n) });

export function cardName(card: Pick<CardSummary, 'name' | 'drep_id'>): string {
  return card.name ?? `${card.drep_id.slice(0, 12)}…${card.drep_id.slice(-4)}`;
}

export function formatAda(ada: number): string {
  if (ada >= 1e9) return `${(ada / 1e9).toFixed(1)}B`;
  if (ada >= 1e6) return `${(ada / 1e6).toFixed(1)}M`;
  if (ada >= 1e3) return `${(ada / 1e3).toFixed(1)}K`;
  return `${Math.round(ada)}`;
}

function pct(rate: number | null): string {
  return rate === null ? '—' : `${Math.round(rate * 100)}%`;
}

function num(v: number | null, digits = 0): string {
  return v === null ? '—' : v.toFixed(digits);
}

/* ---------- Art ---------- */

// Deterministic art for DReps without a photo, so every card is one of a kind.
function GeneratedArt({ drepId, name }: { drepId: string; name: string }) {
  const h = hashDRepId(drepId);
  const hue = h % 360;
  const from = `hsl(${hue} 85% 55%)`;
  const to = `hsl(${(hue + 40 + ((h >>> 9) % 140)) % 360} 80% ${42 + ((h >>> 5) % 16)}%)`;
  const rnd = (i: number) => (Math.abs((h >>> (i % 24)) ^ Math.imul(h, i + 7)) % 1000) / 1000;
  const initials = name.startsWith('drep1')
    ? drepId.slice(-2).toUpperCase()
    : name
        .split(/\s+/)
        .filter((w) => LETTER.test(w))
        .slice(0, 2)
        .map((w) => (w.match(LETTER)?.[0] ?? '').toUpperCase())
        .join('') || drepId.slice(-2).toUpperCase();
  const shapes = Array.from({ length: 7 }, (_, i) => ({
    cx: 20 + rnd(i) * 160,
    cy: 15 + rnd(i + 11) * 110,
    r: 12 + rnd(i + 23) * 55,
    o: 0.12 + rnd(i + 5) * 0.25,
  }));
  const rays = 10 + (h % 8);
  return (
    <svg viewBox="0 0 200 140" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden>
      <defs>
        <linearGradient id={`g-${drepId}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={from} />
          <stop offset="1" stopColor={to} />
        </linearGradient>
      </defs>
      <rect width="200" height="140" fill={`url(#g-${drepId})`} />
      {Array.from({ length: rays }, (_, i) => (
        <line
          key={i}
          x1="100"
          y1="70"
          x2={100 + Math.cos((i / rays) * Math.PI * 2) * 160}
          y2={70 + Math.sin((i / rays) * Math.PI * 2) * 160}
          stroke="white"
          strokeOpacity="0.08"
          strokeWidth="6"
        />
      ))}
      {shapes.map((c, i) => (
        <circle key={i} cx={c.cx} cy={c.cy} r={c.r} fill="white" fillOpacity={c.o * 0.5} stroke="white" strokeOpacity={c.o} strokeWidth="1.5" />
      ))}
      <text
        x="100"
        y="72"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={initials.length > 1 ? 54 : 64}
        fontWeight="900"
        fill="white"
        fillOpacity="0.92"
        style={{ fontFamily: 'system-ui, sans-serif', letterSpacing: '-2px' }}
      >
        {initials}
      </text>
    </svg>
  );
}

function CardArt({ card }: { card: CardSummary }) {
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const name = cardName(card);
  // A server-rendered image can fail before React attaches onError; catch that on mount.
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, [card.image]);
  if (!card.image || failed) return <GeneratedArt drepId={card.drep_id} name={name} />;
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- DRep images come from arbitrary self-chosen hosts */}
      <img src={card.image} alt="" aria-hidden referrerPolicy="no-referrer" className="absolute inset-0 h-full w-full scale-125 object-cover opacity-60 blur-xl" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={card.image}
        alt={`${name} profile image`}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="absolute inset-0 h-full w-full object-contain drop-shadow-2xl"
      />
    </>
  );
}

/* ---------- Card shell: frame, body, square corners ---------- */

/** A thick metallic frame around a lighter, tier-tinted body, like a printed card. */
function CardShell({ tier, children, selected = false }: { tier: Tier; children: ReactNode; selected?: boolean }) {
  return (
    <div className="relative aspect-[5/7] w-full" style={{ containerType: 'inline-size' }}>
      <div
        className={`absolute inset-0 bg-gradient-to-br ${tier.frame}`}
        style={{
          padding: cq(3.4),
          boxShadow: `0 0 0 1px rgba(0,0,0,0.65), 0 ${cq(3)} ${cq(8)} -${cq(2)} rgba(0,0,0,0.55)${selected ? ', 0 0 0 4px #f5b301' : ''}`,
        }}
      >
        {/* Light catching the metal frame */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.55),transparent_35%,transparent_60%,rgba(255,255,255,0.3)_75%,transparent_90%)]" />
        <div
          className="relative flex h-full w-full flex-col overflow-hidden"
          style={{
            background: `radial-gradient(120% 70% at 50% 0%, ${tier.art}, transparent 70%), repeating-linear-gradient(135deg, rgba(255,255,255,0.035) 0 2px, transparent 2px 7px), linear-gradient(180deg, #3d4a73 0%, #2c3659 50%, #222a47 100%)`,
            boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.55), inset 0 0 0 2px rgba(255,255,255,0.22)',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

/** Raised plate for the name bar and stat boxes. */
const plate: CSSProperties = {
  background: 'linear-gradient(180deg, rgba(255,255,255,0.16), rgba(255,255,255,0.06))',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 1px 0 rgba(0,0,0,0.35)',
};

/* ---------- Front ---------- */

function DeltaChip({ value }: { value: number | null }) {
  if (value === null) return null;
  const rounded = Math.round(value * 10) / 10;
  if (rounded === 0)
    return (
      <span className="font-bold text-slate-300" style={{ fontSize: cq(3.8) }}>
        — 0
      </span>
    );
  const up = rounded > 0;
  return (
    <span className={`font-bold ${up ? 'text-emerald-300' : 'text-rose-300'}`} style={{ fontSize: cq(3.8) }} title="Change since the end of the previous 6-epoch window">
      {up ? '▲' : '▼'} {Math.abs(rounded).toFixed(1)}
    </span>
  );
}

function AttrStat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="text-left" style={{ ...plate, padding: `${cq(1)} ${cq(2.4)}` }}>
      <div className="flex items-baseline justify-between" style={{ gap: cq(1) }}>
        <span className="font-bold uppercase tracking-wider text-slate-300" style={{ fontSize: cq(3.3) }}>
          {label}
        </span>
        <span className="truncate font-extrabold leading-tight text-white" style={{ fontSize: cq(5.4) }}>
          {value}
        </span>
      </div>
      <p className="truncate text-right leading-tight text-slate-400" style={{ fontSize: cq(3.2) }}>
        {sub}
      </p>
    </div>
  );
}

interface Headline {
  value: string;
  label: string;
  chip: ReactNode;
  trend: Array<number | null>;
  trendColor: string;
  stats: Array<{ label: string; value: string; sub: string }>;
}

function headlineFor(props: TradingCardProps): Headline {
  const c = props.card;
  const chipStyle = { fontSize: cq(3.8), padding: `${cq(0.4)} ${cq(1.8)}` };
  if (props.variant === 'draft') {
    const mult = props.lockedUnderdog ?? c.underdog;
    const drafted = props.draftedBy ?? null;
    return {
      value: num(c.projection),
      label: 'Projected pts',
      chip: (
        <span
          className={`font-bold ${mult >= 1.25 ? 'bg-amber-500/25 text-amber-200' : 'bg-white/10 text-slate-200'}`}
          style={chipStyle}
          title="Underdog multiplier: smaller DReps earn your team more per point. Fixed when you pick them."
        >
          {mult.toFixed(2)}×
        </span>
      ),
      trend: c.points_trend,
      trendColor: '#fcd34d',
      stats: [
        { label: 'Form', value: num(c.form), sub: 'avg last 3' },
        { label: 'Avg', value: num(c.avg_points), sub: 'pts / season' },
        { label: 'Best', value: `${c.best_points}`, sub: 'season high' },
        {
          label: 'Owned',
          value: drafted !== null ? `${drafted}` : c.ownership !== null ? pct(c.ownership) : '0',
          sub: drafted !== null ? `team${drafted === 1 ? '' : 's'}` : 'of teams',
        },
      ],
    };
  }
  if (props.variant === 'season') {
    return {
      value: `${c.season.points}`,
      label: c.season.rank ? `Season pts · #${c.season.rank}` : 'Season pts',
      chip:
        c.last_points !== null ? (
          <span className="text-slate-300" style={{ fontSize: cq(3.8) }} title="Points last window">
            last {c.last_points}
          </span>
        ) : null,
      trend: c.points_trend,
      trendColor: '#fcd34d',
      stats: [
        { label: 'Votes', value: `${c.season.votes}`, sub: 'this season' },
        { label: 'Explained', value: `${c.season.rationales}`, sub: 'rationales' },
        { label: 'Early', value: `${c.season.early}`, sub: 'first half' },
        { label: 'Missed', value: `${c.season.missed}`, sub: 'closed unvoted' },
      ],
    };
  }
  return {
    value: num(c.govscore, 1),
    label: 'GovScore',
    chip: <DeltaChip value={c.delta1} />,
    trend: c.govscore_trend,
    trendColor: '#ddd6fe',
    stats: [
      { label: 'Power', value: formatAda(c.ada), sub: 'ADA delegated' },
      { label: 'Stamina', value: pct(c.participation), sub: 'participation' },
      { label: 'XP', value: `${c.votes_cast}`, sub: `votes of ${c.votes_eligible}` },
      { label: 'Charisma', value: c.delegators.toLocaleString(), sub: 'delegators' },
    ],
  };
}

function isProvisional(c: CardSummary): boolean {
  return c.votes_eligible > 0 && c.votes_eligible < PROVISIONAL_BELOW_ELIGIBLE;
}

const TIER_STYLE: Record<number, { box: string; text: string }> = {
  0: { box: 'border-violet-300/40 bg-violet-400/10', text: 'text-violet-100' },
  1: { box: 'border-orange-300/50 bg-orange-400/10', text: 'text-orange-200' },
  2: { box: 'border-slate-200/50 bg-slate-100/10', text: 'text-slate-100' },
  3: { box: 'border-amber-300/60 bg-amber-300/15', text: 'text-amber-200' },
};

function abilityName(a: CardAbility): string {
  return a.label.split(' · ')[0];
}

function CardFront(props: TradingCardProps) {
  const c = props.card;
  const tier = tierFor(c.rank);
  const h = headlineFor(props);
  const ArchIcon = c.archetype ? ABILITY_ICONS[c.archetype.id] ?? Sparkles : null;
  const holo = c.rank !== null && c.rank <= 10;
  return (
    <CardShell tier={tier} selected={props.selected}>
      <div className="group flex h-full flex-col">
        {/* Name bar */}
        <div className="flex items-center" style={{ ...plate, gap: cq(1.5), padding: `${cq(1.8)} ${cq(3)}` }}>
          <p className="min-w-0 flex-1 truncate text-left font-extrabold leading-tight text-white" style={{ fontSize: cq(5.6) }} title={cardName(c)}>
            {cardName(c)}
          </p>
          {c.rookie && (
            <span className="bg-emerald-400/25 font-bold uppercase text-emerald-200" style={{ fontSize: cq(3.4), padding: `0 ${cq(1.2)}` }}>
              RC
            </span>
          )}
        </div>

        {/* Art window */}
        <div
          className="relative min-h-0 flex-1 overflow-hidden bg-slate-900"
          style={{ margin: `${cq(2)} ${cq(3)} 0`, boxShadow: '0 0 0 1px rgba(0,0,0,0.6), 0 0 0 3px rgba(255,255,255,0.28)' }}
        >
          <CardArt card={c} />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent" style={{ height: cq(14) }} />
          <span
            className={`absolute flex items-center bg-black/60 font-bold uppercase tracking-widest ${tier.accent}`}
            style={{ left: cq(2), top: cq(2), gap: cq(1), fontSize: cq(3.6), padding: `${cq(0.5)} ${cq(2)}` }}
          >
            <Sparkles style={icon(3.6)} /> {tier.label}
            {c.rank !== null && ` · #${c.rank}`}
          </span>
          {c.streak > 1 && (
            <span
              className="absolute flex items-center bg-black/60 font-bold text-orange-300"
              style={{ right: cq(2), top: cq(2), gap: cq(0.5), fontSize: cq(3.8), padding: `${cq(0.5)} ${cq(2)}` }}
              title="Epochs in a row without missing a vote"
            >
              <Flame style={icon(4)} /> {c.streak}
            </span>
          )}
          <div className="absolute flex items-center justify-between" style={{ left: cq(2), right: cq(2), bottom: cq(1.6), gap: cq(1) }}>
            {c.archetype && ArchIcon ? (
              <span
                className={`flex items-center bg-black/65 font-semibold ${TIER_STYLE[c.archetype.tier ?? 0].text}`}
                style={{ gap: cq(1), fontSize: cq(3.8), padding: `${cq(0.5)} ${cq(2)}` }}
                title={`${c.archetype.label}: ${c.archetype.detail}`}
              >
                <ArchIcon style={icon(4)} /> {abilityName(c.archetype)}
              </span>
            ) : (
              <span className="font-semibold uppercase tracking-widest text-white/80" style={{ fontSize: cq(3.4) }}>
                DRep
              </span>
            )}
            <MyDRepBadge drepId={c.drep_id} className="!rounded-none !py-0 whitespace-nowrap text-[3.6cqw]" />
          </div>
        </div>

        {/* Headline number with trend */}
        <div className="flex items-end justify-between" style={{ gap: cq(2), padding: `${cq(1.6)} ${cq(3.4)} 0` }}>
          <div className="min-w-0 text-left">
            <p className={`font-black leading-none drop-shadow ${c.rank !== null && c.rank <= 3 ? tier.accent : 'text-white'}`} style={{ fontSize: cq(12) }}>
              {h.value}
            </p>
            <p className="truncate font-bold uppercase tracking-[0.2em] text-slate-300" style={{ fontSize: cq(3.3) }}>
              {h.label}
              {props.variant === 'scoreboard' && isProvisional(c) && <span className="ml-1 text-amber-300">· Prov.</span>}
            </p>
          </div>
          <div className="flex flex-col items-end" style={{ gap: cq(0.5) }}>
            {h.chip}
            <div style={{ width: cq(34), height: cq(8) }}>
              <Sparkline values={h.trend} color={h.trendColor} width={84} height={20} fluid />
            </div>
          </div>
        </div>

        {/* Stat plates */}
        <div className="grid grid-cols-2" style={{ gap: cq(1.4), padding: `${cq(1.6)} ${cq(3)} 0` }}>
          {h.stats.map((s) => (
            <AttrStat key={s.label} {...s} />
          ))}
        </div>

        {/* Footer */}
        <div className="mt-auto flex items-center justify-between text-slate-300" style={{ fontSize: cq(3.6), padding: `${cq(1.2)} ${cq(3.4)} ${cq(1.6)}` }}>
          <span className={c.registered ? 'text-emerald-300' : 'text-red-300'}>{c.registered ? '● Active' : '● Retired'}</span>
          <span>{c.do_not_list ? 'Not seeking delegation' : 'Tap to flip'}</span>
          <span className="font-mono">{c.rank !== null ? `No. ${String(c.rank).padStart(3, '0')}` : ''}</span>
        </div>

        {holo ? (
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.08] mix-blend-color-dodge transition-opacity duration-300 group-hover:opacity-70"
            style={{
              backgroundImage:
                'radial-gradient(circle at var(--mx, 50%) var(--my, 50%), rgba(255,255,255,0.55), transparent 45%), linear-gradient(125deg, #ff008080, #ffd60080 20%, #00ff9580 40%, #00c8ff80 60%, #b400ff80 80%, #ff008080)',
              backgroundSize: '100% 100%, 300% 300%',
              backgroundPosition: 'center, var(--mx, 50%) var(--my, 50%)',
            }}
          />
        ) : (
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_35%,rgba(255,255,255,0.18)_50%,transparent_65%)] bg-[length:250%_100%] opacity-0 transition-opacity duration-300 group-hover:animate-shimmer group-hover:opacity-100" />
        )}
      </div>
    </CardShell>
  );
}

/* ---------- Back ---------- */

type Tab = 'profile' | 'stats' | 'trends' | 'traits';
const TABS: Array<[Tab, string]> = [
  ['profile', 'Profile'],
  ['stats', 'Stats'],
  ['trends', 'Trends'],
  ['traits', 'Traits'],
];

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="text-center" style={{ ...plate, padding: `${cq(1)} ${cq(0.8)}` }}>
      <p className="font-bold uppercase tracking-wider text-slate-300" style={{ fontSize: cq(2.9) }}>
        {label}
      </p>
      <p className="font-extrabold leading-tight text-white" style={{ fontSize: cq(4.6) }}>
        {value}
      </p>
      {sub && (
        <p className="truncate leading-tight text-slate-400" style={{ fontSize: cq(2.8) }}>
          {sub}
        </p>
      )}
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <p className="font-bold uppercase tracking-widest text-slate-400" style={{ fontSize: cq(3.1), margin: `${cq(3)} 0 ${cq(1.4)}` }}>
      {children}
    </p>
  );
}

function AbilityBox({ a }: { a: CardAbility }) {
  const Icon = ABILITY_ICONS[a.id] ?? Sparkles;
  const style = TIER_STYLE[a.tier ?? 0];
  return (
    <div className={`flex items-start border ${style.box}`} style={{ gap: cq(1.6), padding: `${cq(1.2)} ${cq(2)}` }}>
      <Icon className={`flex-shrink-0 ${style.text}`} style={{ ...icon(4.2), marginTop: cq(0.4) }} />
      <div className="min-w-0">
        <p className={`font-bold ${style.text}`} style={{ fontSize: cq(3.8) }}>
          {a.label}
        </p>
        <p className="text-slate-200" style={{ fontSize: cq(3.3) }}>
          {a.detail}
        </p>
      </div>
    </div>
  );
}

/** Windows from the DRep's first appearance on, so charts don't open with years of empty space. */
function activeSeasons(seasons: SeasonLine[]): SeasonLine[] {
  const first = seasons.findIndex((s) => s.played || s.govscore_end !== null);
  return first === -1 ? seasons.slice(-1) : seasons.slice(first);
}

function SeasonTable({ seasons }: { seasons: SeasonLine[] }) {
  const rows = seasons.filter((s) => s.played || s.in_progress).slice().reverse();
  if (rows.length === 0) return <p className="text-slate-400">No seasons played yet.</p>;
  return (
    <table className="w-full text-right" style={{ fontSize: cq(3.2) }}>
      <thead className="uppercase tracking-wider text-slate-400" style={{ fontSize: cq(2.7) }}>
        <tr>
          <th className="py-0.5 text-left font-semibold">Window</th>
          <th className="font-semibold">Pts</th>
          <th className="font-semibold">Votes</th>
          <th className="font-semibold">Expl.</th>
          <th className="font-semibold">Early</th>
          <th className="font-semibold">Miss</th>
          <th className="font-semibold">Score</th>
        </tr>
      </thead>
      <tbody className="text-slate-100">
        {rows.map((s) => (
          <tr key={s.window} className="border-t border-white/10">
            <td className="py-0.5 text-left">
              {s.label.replace('Epochs ', '')}
              {s.in_progress && <span className="ml-1 text-violet-200">live</span>}
            </td>
            <td className={`font-bold ${s.points < 0 ? 'text-rose-300' : 'text-white'}`}>{s.points}</td>
            <td>{s.votes}</td>
            <td>{s.rationales}</td>
            <td>{s.early}</td>
            <td className={s.missed > 0 ? 'text-rose-300' : ''}>{s.missed}</td>
            <td>{num(s.govscore_end, 1)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function CardBack({ card, onClose, onFlip }: { card: CardSummary; onClose: () => void; onFlip: () => void }) {
  const [tab, setTab] = useState<Tab>('profile');
  const { detail, error } = useCardDetail(card.drep_id, true);
  const c = detail?.summary ?? card;
  const tier = tierFor(c.rank);
  const lt = c.lifetime;
  const iconButton = 'flex items-center justify-center bg-black/40 text-slate-100 hover:bg-black/60 hover:text-white';

  return (
    <CardShell tier={tier}>
      <div className="flex h-full flex-col text-left" style={{ padding: `${cq(2.6)} ${cq(3)} 0` }}>
        {/* Header: thumbnail, name, actions */}
        <div className="flex items-start" style={{ gap: cq(2.4) }}>
          <div
            className="relative flex-shrink-0 overflow-hidden bg-slate-900"
            style={{ width: cq(17), height: cq(17), boxShadow: '0 0 0 1px rgba(0,0,0,0.6), 0 0 0 2px rgba(255,255,255,0.3)' }}
          >
            <CardArt card={c} />
          </div>
          <div className="min-w-0 flex-1">
            <p className={`font-bold uppercase tracking-widest ${tier.accent}`} style={{ fontSize: cq(3) }}>
              {c.rank !== null ? `#${c.rank} of ${c.total} · ` : ''}
              {tier.label}
              {c.rookie && ' · Rookie'}
            </p>
            <h3 className="truncate font-display font-extrabold leading-tight text-white" style={{ fontSize: cq(5.8) }} title={cardName(c)}>
              {cardName(c)}
            </h3>
            <p className="truncate font-mono text-slate-400" style={{ fontSize: cq(2.7) }} title={c.drep_id}>
              {c.drep_id}
            </p>
          </div>
          <div className="flex flex-shrink-0" style={{ gap: cq(1.2) }}>
            <button type="button" onClick={onFlip} aria-label="Show the front" title="Front" className={iconButton} style={icon(7)}>
              <RotateCcw style={icon(4)} />
            </button>
            <button type="button" onClick={onClose} aria-label="Close" className={iconButton} style={icon(7)}>
              <X style={icon(4.4)} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4" style={{ gap: cq(1.2), marginTop: cq(2.2) }}>
          <Tile label="GovScore" value={num(c.govscore, 1)} sub={c.delta1 !== null ? `${c.delta1 >= 0 ? '+' : ''}${c.delta1.toFixed(1)} last window` : undefined} />
          <Tile label="Season" value={`${c.season.points}`} sub={c.season.rank ? `#${c.season.rank} this season` : 'pts'} />
          <Tile label="Proj." value={num(c.projection)} sub="next season" />
          <Tile label="Underdog" value={`${c.underdog.toFixed(2)}×`} sub="draft value" />
        </div>

        <div role="tablist" className="flex border-b border-white/15" style={{ gap: cq(1), marginTop: cq(2.4) }}>
          {TABS.map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`-mb-px border-b-2 font-semibold ${tab === id ? 'border-brand-gold text-white' : 'border-transparent text-slate-300 hover:text-white'}`}
              style={{ fontSize: cq(3.9), padding: `${cq(1)} ${cq(2.4)}` }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* The tab body scrolls inside the fixed card, without a scrollbar, fading at the bottom edge. */}
        <div
          className="no-scrollbar min-h-0 flex-1 overflow-y-auto"
          style={{
            fontSize: cq(3.6),
            paddingBottom: cq(6),
            maskImage: `linear-gradient(to bottom, black calc(100% - ${cq(6)}), transparent)`,
            WebkitMaskImage: `linear-gradient(to bottom, black calc(100% - ${cq(6)}), transparent)`,
          }}
        >
          {!detail && !error && tab !== 'profile' && (
            <p className="flex items-center text-slate-300" style={{ gap: cq(1.5), marginTop: cq(3) }}>
              <Loader2 className="animate-spin" style={icon(4)} /> Loading history…
            </p>
          )}
          {error && (
            <p className="text-rose-300" style={{ marginTop: cq(3) }}>
              {error}
            </p>
          )}

          {tab === 'profile' && (
            <div>
              {isProvisional(c) && (
                <p className="text-amber-200" style={{ marginTop: cq(2.4), fontSize: cq(3.2) }}>
                  Provisional: fewer than {PROVISIONAL_BELOW_ELIGIBLE} votes to judge so far, so the score is held back until the record grows.
                </p>
              )}
              {c.abilities.length > 0 && (
                <>
                  <SectionTitle>Abilities</SectionTitle>
                  <div className="grid grid-cols-2" style={{ gap: cq(1.4) }}>
                    {c.abilities.map((a) => (
                      <AbilityBox key={a.id} a={a} />
                    ))}
                  </div>
                </>
              )}
              <SectionTitle>Bio</SectionTitle>
              <p className="whitespace-pre-line leading-relaxed text-slate-100">{detail ? detail.bio || 'No bio provided.' : 'Loading…'}</p>
              {detail && detail.links.length > 0 && (
                <>
                  <SectionTitle>Links</SectionTitle>
                  <div className="grid grid-cols-2" style={{ columnGap: cq(3), rowGap: cq(1) }}>
                    {detail.links.map((link) => (
                      <a
                        key={link.url}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="flex min-w-0 items-center text-slate-100 hover:text-white"
                        style={{ gap: cq(1.4) }}
                      >
                        <Globe className="flex-shrink-0 text-slate-400" style={icon(3.6)} />
                        <span className="truncate">{link.label}</span>
                      </a>
                    ))}
                  </div>
                </>
              )}
              <div style={{ marginTop: cq(3.5) }}>
                {c.do_not_list ? (
                  <p className="text-center text-slate-300">This DRep has asked not to be promoted for delegation.</p>
                ) : (
                  <a
                    href={`https://gov.tools/connected/drep_directory/${c.drep_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center bg-violet-600 font-semibold text-white transition-colors hover:bg-violet-700"
                    style={{ gap: cq(1.5), padding: `${cq(2)} 0`, fontSize: cq(3.9) }}
                  >
                    Delegate via GovTool <ExternalLink style={icon(3.6)} />
                  </a>
                )}
              </div>
            </div>
          )}

          {tab === 'stats' && detail && (
            <div>
              <SectionTitle>As a representative</SectionTitle>
              <div className="grid grid-cols-4" style={{ gap: cq(1.2) }}>
                <Tile label="Power" value={formatAda(c.ada)} sub="ADA delegated" />
                <Tile label="Stamina" value={pct(c.participation)} sub="participation" />
                <Tile label="XP" value={`${c.votes_cast}`} sub={`of ${c.votes_eligible}`} />
                <Tile label="Charisma" value={c.delegators.toLocaleString()} sub="delegators" />
                <Tile label="Explains" value={pct(lt.rationale_rate)} sub="with rationale" />
                <Tile label="Early" value={pct(lt.early_rate)} sub="first half" />
                <Tile label="Streak" value={`${c.streak}`} sub="epochs" />
                <Tile label="Tenure" value={`${lt.tenure_epochs}`} sub="epochs" />
              </div>
              <SectionTitle>As a fantasy pick</SectionTitle>
              <div className="grid grid-cols-4" style={{ gap: cq(1.2) }}>
                <Tile label="Last" value={num(c.last_points)} sub="last window" />
                <Tile label="Form" value={num(c.form)} sub="avg last 3" />
                <Tile label="Avg" value={num(c.avg_points)} sub="per window" />
                <Tile label="Best" value={`${c.best_points}`} sub="season high" />
                <Tile label="Lifetime" value={`${lt.points}`} sub="total pts" />
                <Tile label="Seasons" value={`${lt.seasons}`} sub="played" />
                <Tile label="Missed" value={`${lt.missed}`} sub="career" />
                <Tile label="Owned" value={c.ownership !== null ? pct(c.ownership) : '—'} sub="of teams" />
              </div>
              <SectionTitle>Season by season</SectionTitle>
              <SeasonTable seasons={detail.seasons} />
              <SectionTitle>How it voted (not scored)</SectionTitle>
              <div className="grid grid-cols-3" style={{ gap: cq(1.2) }}>
                {(
                  [
                    ['Yes', detail.votes.yes, 'bg-emerald-500/20 text-emerald-200'],
                    ['No', detail.votes.no, 'bg-red-500/20 text-red-200'],
                    ['Abstain', detail.votes.abstain, 'bg-slate-400/20 text-slate-100'],
                  ] as const
                ).map(([label, n, cls]) => (
                  <div key={label} className={`text-center ${cls}`} style={{ padding: cq(1.4) }}>
                    <p className="font-black" style={{ fontSize: cq(5.4) }}>
                      {n}
                    </p>
                    <p className="uppercase tracking-widest text-slate-300" style={{ fontSize: cq(2.8) }}>
                      {label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'trends' && detail && (
            <div>
              <SectionTitle>GovScore at the end of each window</SectionTitle>
              <LineChart points={activeSeasons(detail.seasons).map((s) => ({ label: s.label, value: s.govscore_end }))} />
              <SectionTitle>Fantasy points per window</SectionTitle>
              <BarChart points={activeSeasons(detail.seasons).map((s) => ({ label: s.label, value: s.played || s.in_progress ? s.points : null }))} />
              <p className="text-slate-300" style={{ marginTop: cq(1.5), fontSize: cq(3) }}>
                Points come only from voting, explaining votes and voting on time. Which way a DRep votes never counts.
              </p>
            </div>
          )}

          {tab === 'traits' && detail && (
            <div>
              <p className="flex items-center text-slate-100" style={{ gap: cq(1.5), marginTop: cq(2.6) }}>
                <Gem className="flex-shrink-0 text-amber-200" style={icon(4)} /> The traits this card would carry on-chain if minted. Not minted yet.
              </p>
              <dl className="grid grid-cols-1" style={{ marginTop: cq(1.6) }}>
                {Object.entries(detail.metadata).map(([k, v]) => (
                  <div key={k} className="flex justify-between border-b border-white/10" style={{ gap: cq(2), padding: `${cq(0.7)} 0` }}>
                    <dt className="text-slate-400">{k.replace(/_/g, ' ')}</dt>
                    <dd className="truncate text-right text-slate-100" title={String(v)}>
                      {String(v)}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </div>
    </CardShell>
  );
}

/* ---------- The card and its lifted, flippable view ---------- */

export function TradingCard(props: TradingCardProps) {
  const { card } = props;
  const [open, setOpen] = useState(false);
  const [showBack, setShowBack] = useState(true);
  const [mounted, setMounted] = useState(false);
  const reduceMotion = useReducedMotion();
  const tiltX = useSpring(useMotionValue(0), { stiffness: 200, damping: 20 });
  const tiltY = useSpring(useMotionValue(0), { stiffness: 200, damping: 20 });

  // Tilt toward the pointer and move the foil highlight with it, like turning a holo card in the light.
  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType !== 'mouse') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    e.currentTarget.style.setProperty('--mx', `${Math.round(x * 100)}%`);
    e.currentTarget.style.setProperty('--my', `${Math.round(y * 100)}%`);
    if (reduceMotion) return;
    tiltX.set((0.5 - y) * 14);
    tiltY.set((x - 0.5) * 14);
  };
  const onPointerLeave = () => {
    tiltX.set(0);
    tiltY.set(0);
  };
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const h = headlineFor(props);
  return (
    <div className="theme-dark flex flex-col gap-2">
      <motion.button
        type="button"
        onClick={() => {
          setShowBack(true);
          setOpen(true);
        }}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        className="block w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
        style={{ rotateX: tiltX, rotateY: tiltY, transformPerspective: 900 }}
        whileHover={{ y: -6 }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        aria-label={`${cardName(card)}, ${h.label} ${h.value}. Open card details`}
        aria-haspopup="dialog"
      >
        <CardFront {...props} />
      </motion.button>
      {props.action}

      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                className="theme-dark fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setOpen(false)}
              >
                {/* The same card, larger: as wide as fits 86% of the screen height at the card's 5:7 shape. */}
                <motion.div
                  role="dialog"
                  aria-modal="true"
                  aria-label={`${cardName(card)} card details`}
                  style={{ width: 'min(92vw, calc(86vh * 5 / 7), 520px)', perspective: 1600 }}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.6, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 140, damping: 18 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <motion.div
                    className="relative"
                    style={{ transformStyle: 'preserve-3d' }}
                    initial={{ rotateY: 0 }}
                    animate={{ rotateY: showBack ? 180 : 0 }}
                    transition={{ duration: reduceMotion ? 0 : 0.7, ease: [0.3, 0.7, 0.2, 1] }}
                  >
                    <div style={{ backfaceVisibility: 'hidden' }}>
                      <button type="button" className="block w-full" onClick={() => setShowBack(true)} aria-label="Flip to the back">
                        <CardFront {...props} />
                      </button>
                    </div>
                    <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                      <CardBack card={card} onClose={() => setOpen(false)} onFlip={() => setShowBack(false)} />
                    </div>
                  </motion.div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}
