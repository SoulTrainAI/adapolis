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
import { TIPS } from '@/lib/site/glossary';
import { PROVISIONAL_BELOW_ELIGIBLE } from '@/lib/scoring/confidence';
import { tierFor, type CardAbility, type CardSummary, type SeasonLine, type Tier } from '@/lib/cards/types';
import { Sparkline } from './Charts';
import { useCardDetail, useJourney } from './useCards';
import type { JourneyPoint } from '@/lib/cards/journey';

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

/** Name size that fits the bar: long names step down instead of being cut off. */
function nameSize(name: string, base: number): string {
  const n = name.length;
  return cq(n <= 18 ? base : n <= 24 ? base * 0.86 : n <= 32 ? base * 0.74 : base * 0.64);
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
    <span className={`font-bold ${up ? 'text-emerald-300' : 'text-rose-300'}`} style={{ fontSize: cq(3.8) }} title={TIPS.govscoreDelta}>
      {up ? '▲' : '▼'} {Math.abs(rounded).toFixed(1)}
    </span>
  );
}

function AttrStat({ label, value, sub, tip }: { label: string; value: string; sub: string; tip: string }) {
  return (
    <div className="text-left" style={{ ...plate, padding: `${cq(1)} ${cq(2.4)}` }} title={tip}>
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

/** The four representative stats on every card front. */
function REP_STATS(c: CardSummary): Array<{ label: string; value: string; sub: string; tip: string }> {
  return [
    { label: 'Power', value: formatAda(c.ada), sub: 'ADA delegated', tip: TIPS.power },
    { label: 'Stamina', value: pct(c.participation), sub: 'participation', tip: TIPS.stamina },
    { label: 'XP', value: `${c.votes_cast}`, sub: `votes of ${c.votes_eligible}`, tip: TIPS.xp },
    { label: 'Charisma', value: c.delegators.toLocaleString(), sub: 'delegators', tip: TIPS.charisma },
  ];
}

/** Draft-page facts shown under the card (they're about the pick, not part of the card). */
function DraftStrip({ card, mult, drafted }: { card: CardSummary; mult: number; drafted: number | null }) {
  return (
    <div className="grid grid-cols-4 gap-1 text-center text-xs">
      {[
        ['Proj.', num(card.projection), TIPS.projection],
        ['Form', num(card.form), TIPS.form],
        ['Bonus', `${mult.toFixed(2)}×`, TIPS.underdog],
        ['Teams', drafted !== null ? String(drafted) : card.ownership !== null ? pct(card.ownership) : '0', TIPS.teams],
      ].map(([k, v, tip]) => (
        <div key={k} title={tip} className={`border border-slate-700 bg-slate-900/70 py-1 ${k === 'Bonus' && mult >= 1.25 ? 'text-amber-200' : 'text-slate-100'}`}>
          <p className="text-[10px] uppercase tracking-wider text-slate-400">{k}</p>
          <p className="font-bold">{v}</p>
        </div>
      ))}
    </div>
  );
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
  const ArchIcon = c.archetype ? ABILITY_ICONS[c.archetype.id] ?? Sparkles : null;
  const holo = c.rank !== null && c.rank <= 10;
  return (
    <CardShell tier={tier} selected={props.selected}>
      <div className="group flex h-full flex-col">
        {/* Name bar */}
        <div className="flex items-center" style={{ ...plate, gap: cq(1.5), padding: `${cq(1.8)} ${cq(3)}` }}>
          <p className="min-w-0 flex-1 truncate text-left font-extrabold leading-tight text-white" style={{ fontSize: nameSize(cardName(c), 5.6) }} title={cardName(c)}>
            {cardName(c)}
          </p>
          {c.rookie && (
            <span className="bg-emerald-400/25 font-bold uppercase text-emerald-200" style={{ fontSize: cq(3.4), padding: `0 ${cq(1.2)}` }} title={TIPS.rookie}>
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
            title={TIPS.tier}
          >
            <Sparkles style={icon(3.6)} /> {tier.label}
            {c.rank !== null && ` · #${c.rank}`}
          </span>
          {c.streak > 1 && (
            <span
              className="absolute flex items-center bg-black/60 font-bold text-orange-300"
              style={{ right: cq(2), top: cq(2), gap: cq(0.5), fontSize: cq(3.8), padding: `${cq(0.5)} ${cq(2)}` }}
              title={TIPS.streak}
            >
              <Flame style={icon(4)} /> {c.streak}
            </span>
          )}
          <div className="absolute flex items-center justify-between" style={{ left: cq(2), right: cq(2), bottom: cq(1.6), gap: cq(1) }}>
            {c.archetype && ArchIcon ? (
              <span
                className={`flex items-center bg-black/65 font-semibold ${TIER_STYLE[c.archetype.tier ?? 0].text}`}
                style={{ gap: cq(1), fontSize: cq(3.8), padding: `${cq(0.5)} ${cq(2)}` }}
                title={`${c.archetype.label}: ${c.archetype.detail}\n\n${TIPS.archetype}`}
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

        {/* Scores: career GovScore and this season's fantasy points, side by side */}
        <div className="grid grid-cols-[1.3fr_1fr]" style={{ gap: cq(1.4), padding: `${cq(1.8)} ${cq(3)} 0` }}>
          <div className="flex items-end justify-between" style={{ ...plate, padding: `${cq(1)} ${cq(2)}` }} title={isProvisional(c) ? `${TIPS.govscore}\n\n${TIPS.provisional}` : TIPS.govscore}>
            <div className="min-w-0 text-left">
              <p className={`font-black leading-none drop-shadow ${c.rank !== null && c.rank <= 3 ? tier.accent : 'text-white'}`} style={{ fontSize: cq(9.6) }}>
                {num(c.govscore, 1)}
              </p>
              <p className="truncate font-bold uppercase tracking-[0.14em] text-slate-300" style={{ fontSize: cq(2.8), marginTop: cq(0.6) }}>
                GovScore{isProvisional(c) && <span className="text-amber-300"> · Prov.</span>}
              </p>
            </div>
            <div className="flex flex-col items-end" style={{ gap: cq(0.4) }}>
              <DeltaChip value={c.delta1} />
              <div style={{ width: cq(15), height: cq(6) }} title={TIPS.govscoreTrend}>
                <Sparkline values={c.govscore_trend} color="#ddd6fe" width={60} height={24} fluid />
              </div>
            </div>
          </div>
          <div className="flex items-end justify-between" style={{ ...plate, padding: `${cq(1)} ${cq(2)}` }} title={TIPS.seasonPoints}>
            <div className="min-w-0 text-left">
              <p className="font-black leading-none text-amber-200 drop-shadow" style={{ fontSize: cq(7.6) }}>
                {c.season.points}
              </p>
              <p className="truncate font-bold uppercase tracking-[0.14em] text-slate-300" style={{ fontSize: cq(2.8), marginTop: cq(0.6) }}>
                Season pts
              </p>
            </div>
            <div className="flex flex-col items-end" style={{ gap: cq(0.4) }}>
              <span className="font-bold text-slate-200" style={{ fontSize: cq(3.4) }} title={TIPS.seasonRank}>
                {c.season.rank ? `#${c.season.rank}` : '—'}
              </span>
              <div style={{ width: cq(11), height: cq(6) }} title={TIPS.seasonTrend}>
                <Sparkline values={c.points_trend} color="#fcd34d" width={44} height={24} fluid />
              </div>
            </div>
          </div>
        </div>

        {/* Stat plates */}
        <div className="grid grid-cols-2" style={{ gap: cq(1.4), padding: `${cq(1.4)} ${cq(3)} 0` }}>
          {REP_STATS(c).map((s) => (
            <AttrStat key={s.label} {...s} />
          ))}
        </div>

        {/* Footer */}
        <div className="mt-auto flex items-center justify-between text-slate-300" style={{ fontSize: cq(3.6), padding: `${cq(1.2)} ${cq(3.4)} ${cq(1.6)}` }}>
          <span className={c.registered ? 'text-emerald-300' : 'text-red-300'} title={c.registered ? TIPS.active : TIPS.retired}>{c.registered ? '● Active' : '● Retired'}</span>
          {c.do_not_list ? (
            <span title={TIPS.notSeeking}>Not seeking delegation</span>
          ) : (
            <span className="flex items-center font-semibold tracking-wide text-slate-200" style={{ gap: cq(1) }} title="Tap or click the card to flip it and see the full record">
              {/* eslint-disable-next-line @next/next/no-img-element -- static brand mark */}
              <img src="/brand/adapolis-mark-small.svg" alt="" style={icon(4.6)} />
              ADApolis
            </span>
          )}
          <span className="font-mono" title={TIPS.cardNumber}>{c.rank !== null ? `No. ${String(c.rank).padStart(3, '0')}` : ''}</span>
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

/** Score square on the back: label, value, short caption. */
function Tile({ label, value, sub, subClass = 'text-slate-400', tip }: { label: string; value: string; sub?: string; subClass?: string; tip: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center" style={{ ...plate, padding: `${cq(0.9)} ${cq(0.5)}` }} title={tip}>
      <p className="font-bold uppercase leading-none tracking-wide text-slate-300" style={{ fontSize: cq(2.3) }}>
        {label}
      </p>
      <p className="font-extrabold leading-tight text-white" style={{ fontSize: cq(4.3), marginTop: cq(0.4) }}>
        {value}
      </p>
      {sub && (
        <p className={`whitespace-nowrap leading-none ${subClass}`} style={{ fontSize: cq(2.25), marginTop: cq(0.3) }}>
          {sub}
        </p>
      )}
    </div>
  );
}

function BackTitle({ children }: { children: ReactNode }) {
  return (
    <p className="font-bold uppercase tracking-[0.16em] text-amber-200/90" style={{ fontSize: cq(2.5), marginBottom: cq(0.8) }}>
      {children}
    </p>
  );
}

/** Label … value line, like the stat lines on the back of a sports card. */
function StatLine({ label, value, tone, tip }: { label: string; value: string; tone?: string; tip: string }) {
  return (
    <div title={tip} className="flex items-baseline justify-between border-b border-white/10" style={{ fontSize: cq(2.7), padding: `${cq(0.32)} 0`, gap: cq(1) }}>
      <span className="truncate text-slate-300">{label}</span>
      <span className={`font-bold ${tone ?? 'text-white'}`}>{value}</span>
    </div>
  );
}

function AbilityChip({ a, size = 2.55 }: { a: CardAbility; size?: number }) {
  const Icon = ABILITY_ICONS[a.id] ?? Sparkles;
  const style = TIER_STYLE[a.tier ?? 0];
  return (
    <span className={`inline-flex items-center border ${style.box} ${style.text} font-semibold`} style={{ gap: cq(0.7), fontSize: cq(size), padding: `${cq(0.35)} ${cq(size < 2.5 ? 1 : 1.2)}` }} title={`${a.label}: ${a.detail}`}>
      <Icon style={icon(2.9)} />
      {a.label}
    </span>
  );
}

/** Windows from the DRep's first appearance on, so charts don't open with years of empty space. */
export function activeSeasons(seasons: SeasonLine[]): SeasonLine[] {
  const first = seasons.findIndex((s) => s.played || s.govscore_end !== null);
  return first === -1 ? seasons.slice(-1) : seasons.slice(first);
}

type JourneyKey = 'power' | 'stamina' | 'xp' | 'charisma';

const JOURNEY_LINES: Array<{ key: JourneyKey; label: string; color: string; tip: string; format: (v: number) => string }> = [
  { key: 'power', label: 'Power', color: '#a78bfa', tip: TIPS.power, format: (v) => formatAda(v) },
  { key: 'stamina', label: 'Stamina', color: '#34d399', tip: TIPS.stamina, format: (v) => `${Math.round(v * 100)}%` },
  { key: 'xp', label: 'XP', color: '#fbbf24', tip: TIPS.xp, format: (v) => `${Math.round(v)}` },
  { key: 'charisma', label: 'Charisma', color: '#38bdf8', tip: `${TIPS.charisma} History is estimated from when today's delegators joined; delegators who later left aren't counted.`, format: (v) => Math.round(v).toLocaleString() },
];

/**
 * The four card stats over the last 12 seasons. Each line is drawn on its own
 * scale from zero (Stamina on 0–100%), so the shape shows growth honestly;
 * the legend gives the current value and the change over the period.
 */
function JourneyChart({ points }: { points: JourneyPoint[] }) {
  const W = 100;
  const H = 30;
  const n = points.length;
  const x = (i: number) => (n <= 1 ? W / 2 : (i / (n - 1)) * W);
  return (
    <div>
      <div className="grid grid-cols-4" style={{ gap: cq(0.8), marginBottom: cq(0.6) }}>
        {JOURNEY_LINES.map((l) => {
          const vals = points.map((p) => p[l.key]).filter((v): v is number => v !== null);
          const last = vals[vals.length - 1];
          const first = vals[0];
          const change = vals.length > 1 ? last - first : 0;
          const up = change > 0;
          const steady = Math.abs(change) < (l.key === 'stamina' ? 0.005 : 0.5);
          return (
            <div key={l.key} className="min-w-0 leading-tight" title={l.tip} style={{ fontSize: cq(2.3) }}>
              <p className="flex items-center font-bold uppercase tracking-wide text-slate-300" style={{ gap: cq(0.6) }}>
                <span className="inline-block flex-shrink-0 rounded-full" style={{ width: cq(1.6), height: cq(1.6), background: l.color }} />
                {l.label}
              </p>
              <p className="truncate font-bold text-white">
                {last === undefined ? '—' : l.format(last)}{' '}
                {last !== undefined && !steady && (
                  <span className={up ? 'text-emerald-300' : 'text-rose-300'}>{up ? '▲' : '▼'}</span>
                )}
              </p>
            </div>
          );
        })}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="block w-full" style={{ height: cq(12) }} aria-label="Power, Stamina, XP and Charisma over the last 12 seasons">
        {[0.25, 0.5, 0.75].map((g) => (
          <line key={g} x1="0" x2={W} y1={H * g} y2={H * g} stroke="rgba(255,255,255,0.08)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        ))}
        {JOURNEY_LINES.map((l) => {
          const vals = points.map((p) => p[l.key]);
          const max = l.key === 'stamina' ? 1 : Math.max(0, ...vals.filter((v): v is number => v !== null)) || 1;
          const pts = vals
            .map((v, i) => (v === null ? null : `${x(i).toFixed(2)},${(H - 1 - (v / max) * (H - 2)).toFixed(2)}`))
            .filter((p): p is string => p !== null);
          if (pts.length < 2) return null;
          return <polyline key={l.key} points={pts.join(' ')} fill="none" stroke={l.color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />;
        })}
      </svg>
      <div className="flex justify-between text-slate-400" style={{ fontSize: cq(2.1) }}>
        <span>{points[0]?.label ?? ''}</span>
        <span>now</span>
      </div>
    </div>
  );
}


/**
 * The back of the card: one fixed face with everything that matters, no tabs
 * and no scrolling, so it works as the back of a printed or minted card.
 * The DRep's full profile page holds the long-form detail.
 */
function CardBack({ card, onClose, onFlip }: { card: CardSummary; onClose?: () => void; onFlip?: () => void }) {
  const { detail } = useCardDetail(card.drep_id, true);
  const journey = useJourney(card.drep_id, true);
  const c = detail?.summary ?? card;
  const tier = tierFor(c.rank);
  const lt = c.lifetime;
  const profileHref = `/dreps/${c.drep_id}`;
  const iconButton = 'flex items-center justify-center bg-black/40 text-slate-100 hover:bg-black/60 hover:text-white';
  const chips = c.abilities;
  const chipSize = chips.length > 6 ? 2.3 : 2.55;
  const links = detail?.links ?? [];
  const votes = detail?.votes;

  return (
    <CardShell tier={tier}>
      <div className="flex h-full flex-col overflow-hidden text-left [&>*]:flex-shrink-0" style={{ padding: `${cq(2.4)} ${cq(2.8)} ${cq(1.8)}`, gap: cq(1.3) }}>
        {/* Header */}
        <div className="flex items-start" style={{ gap: cq(2.2) }}>
          <div className="relative flex-shrink-0 overflow-hidden bg-slate-900" style={{ width: cq(13), height: cq(13), boxShadow: '0 0 0 1px rgba(0,0,0,0.6), 0 0 0 2px rgba(255,255,255,0.3)' }}>
            <CardArt card={c} />
          </div>
          <div className="min-w-0 flex-1">
            <p className={`font-bold uppercase tracking-widest ${tier.accent}`} style={{ fontSize: cq(2.6) }} title={`${TIPS.rank}\n\n${TIPS.tier}`}>
              {c.rank !== null ? `#${c.rank} of ${c.total} · ` : ''}
              {tier.label}
              {c.rookie && ' · Rookie'}
            </p>
            <h3 className="truncate font-display font-extrabold leading-tight text-white" style={{ fontSize: nameSize(cardName(c), 5.2) }} title={cardName(c)}>
              {cardName(c)}
            </h3>
            <p className="truncate font-mono text-slate-400" style={{ fontSize: cq(2.3) }} title={c.drep_id}>
              {c.drep_id}
            </p>
          </div>
          {(onFlip || onClose) && (
            <div className="flex flex-shrink-0" style={{ gap: cq(1) }}>
              {onFlip && (
                <button type="button" onClick={onFlip} aria-label="Show the front" title="Flip back to the front" className={iconButton} style={icon(6.4)}>
                  <RotateCcw style={icon(3.6)} />
                </button>
              )}
              {onClose && (
                <button type="button" onClick={onClose} aria-label="Close" title="Close" className={iconButton} style={icon(6.4)}>
                  <X style={icon(4)} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Headline scores */}
        <div className="grid grid-cols-4" style={{ gap: cq(1), gridAutoRows: '1fr' }}>
          <Tile
            label="GovScore"
            value={num(c.govscore, 1)}
            sub={c.delta1 === null ? 'career' : Math.abs(c.delta1) < 0.05 ? 'steady' : `${c.delta1 > 0 ? '▲' : '▼'} ${Math.abs(c.delta1).toFixed(1)}`}
            subClass={c.delta1 === null || Math.abs(c.delta1) < 0.05 ? 'text-slate-400' : c.delta1 > 0 ? 'text-emerald-300' : 'text-rose-300'}
            tip={`${TIPS.govscore}\n\n${TIPS.govscoreDelta}`}
          />
          <Tile label="Season" value={`${c.season.points}`} sub={c.season.rank ? `rank #${c.season.rank}` : 'points'} tip={TIPS.seasonPoints} />
          <Tile label="Projected" value={num(c.projection)} sub="next season" tip={TIPS.projection} />
          <Tile label="Underdog" value={`${c.underdog.toFixed(2)}×`} sub="draft bonus" tip={TIPS.underdog} />
        </div>

        {/* Career and fantasy lines */}
        <div className="grid grid-cols-2" style={{ columnGap: cq(3) }}>
          <div>
            <BackTitle>Career</BackTitle>
            <StatLine label="ADA delegated" tip={TIPS.ada} value={formatAda(c.ada)} />
            <StatLine label="Delegators" tip={TIPS.delegators} value={c.delegators.toLocaleString()} />
            <StatLine label="Votes" tip={TIPS.votes} value={`${c.votes_cast} of ${c.votes_eligible}`} />
            <StatLine label="Participation" tip={TIPS.participation} value={pct(c.participation)} />
            <StatLine label="Explains votes" tip={TIPS.explains} value={pct(lt.rationale_rate)} />
            <StatLine label="Votes early" tip={TIPS.early} value={pct(lt.early_rate)} />
            <StatLine label="Streak" tip={TIPS.streak} value={`${c.streak} ep.`} />
          </div>
          <div>
            <BackTitle>Fantasy</BackTitle>
            <StatLine label="Last window" tip={TIPS.lastWindow} value={num(c.last_points)} />
            <StatLine label="Form (last 3)" tip={TIPS.form} value={num(c.form)} />
            <StatLine label="Avg / window" tip={TIPS.avgWindow} value={num(c.avg_points)} />
            <StatLine label="Best window" tip={TIPS.bestWindow} value={`${c.best_points}`} />
            <StatLine label="Lifetime pts" tip={TIPS.lifetimePoints} value={lt.points.toLocaleString()} />
            <StatLine label="Windows played" tip={TIPS.windowsPlayed} value={`${lt.seasons}`} />
            <StatLine label="Missed votes" tip={TIPS.missedVotes} value={`${lt.missed}`} tone={lt.missed > 0 ? 'text-rose-200' : undefined} />
          </div>
        </div>

        {/* Journey: the four stats over the last 12 seasons */}
        <div>
          <BackTitle>Journey · last 12 seasons</BackTitle>
          {journey && journey !== 'error' && journey.length > 1 ? (
            <JourneyChart points={journey} />
          ) : (
            <p className="flex items-center text-slate-300" style={{ gap: cq(1), fontSize: cq(2.7), height: cq(18.5) }}>
              {journey === 'error' ? (
                'Journey unavailable right now.'
              ) : journey ? (
                'Not enough seasons yet.'
              ) : (
                <>
                  <Loader2 className="animate-spin" style={icon(3)} /> Loading journey…
                </>
              )}
            </p>
          )}
        </div>

        {/* Abilities */}
        {chips.length > 0 && (
          <div className="flex flex-wrap" style={{ gap: cq(0.9) }}>
            {chips.map((a) => (
              <AbilityChip key={a.id} a={a} size={chipSize} />
            ))}
          </div>
        )}

        {/* Quote: always complete (picked to fit two lines), never cut off */}
        {detail?.quote && (
          detail.quote_by === 'drep' ? (
            <p className="italic text-slate-200" style={{ fontSize: cq(2.7), lineHeight: 1.3 }} title="In the DRep's own words, from its on-chain profile or its claimed card.">
              “{detail.quote}”
            </p>
          ) : (
            <p className="italic text-slate-400" style={{ fontSize: cq(2.6), lineHeight: 1.3 }} title="Flavor text by ADApolis, based only on this card's record. The DRep can replace it with its own words by claiming the card.">
              {detail.quote}
            </p>
          )
        )}

        {/* Links and record, pinned to the bottom */}
        <div className="mt-auto space-y-[0.8cqw]">
          <div className="flex items-center overflow-hidden whitespace-nowrap" style={{ gap: cq(2), fontSize: cq(2.7) }}>
            <a href={profileHref} className="font-semibold text-amber-200 hover:text-white" title="Every season, vote history, trends and the DRep's own bio and links">
              Full profile →
            </a>
            {!c.do_not_list && (
              <a href={`https://gov.tools/connected/drep_directory/${c.drep_id}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-violet-200 hover:text-white" style={{ gap: cq(0.6) }} title="Delegate your ADA's voting power to this DRep on GovTool (opens in a new tab). Your ADA never leaves your wallet.">
                Delegate <ExternalLink style={icon(2.6)} />
              </a>
            )}
            {links.slice(0, 2).map((l) => (
              <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex min-w-0 max-w-[24cqw] items-center text-slate-200 hover:text-white" style={{ gap: cq(0.6) }}>
                <Globe className="flex-shrink-0 text-slate-400" style={icon(2.6)} />
                <span className="truncate">{l.label}</span>
              </a>
            ))}
          </div>
          <div className="flex items-center justify-between text-slate-400" style={{ fontSize: cq(2.35) }}>
            <span title="How this DRep has voted. Shown for information only: vote direction never affects any score.">{votes ? `Record: ${votes.yes} Yes · ${votes.no} No · ${votes.abstain} Abstain (not scored)` : ' '}</span>
            <span className="flex items-center font-semibold text-slate-300" style={{ gap: cq(0.7) }} title={TIPS.cardNumber}>
              {/* eslint-disable-next-line @next/next/no-img-element -- static brand mark */}
              <img src="/brand/adapolis-mark-small.svg" alt="" style={icon(3.4)} />
              {c.rank !== null ? `No. ${String(c.rank).padStart(3, '0')}` : 'ADApolis'}
            </span>
          </div>
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
        aria-label={`${cardName(card)}, GovScore ${num(card.govscore, 1)}, ${card.season.points} season points. Open card details`}
        aria-haspopup="dialog"
      >
        <CardFront {...props} />
      </motion.button>
      {props.variant === 'draft' && <DraftStrip card={card} mult={props.lockedUnderdog ?? card.underdog} drafted={props.draftedBy ?? null} />}
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
