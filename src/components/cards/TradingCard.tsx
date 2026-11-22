'use client';

/**
 * The ADApolis DRep trading card, used everywhere a DRep appears. The front
 * changes with the page (scoreboard, draft, season); the back opens as a
 * lifted, flipped card with profile, stats, trends and collectible data.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion';
import {
  BookOpen,
  Dog,
  ExternalLink,
  Flame,
  Gem,
  Globe,
  Hammer,
  Loader2,
  Medal,
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
import { tierFor, type CardAbility, type CardSummary, type SeasonLine } from '@/lib/cards/types';
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
};

// Any letter or digit in any script (constructor form: the TS target predates the u flag).
const LETTER = new RegExp('[\\p{L}\\p{N}]', 'u');

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

function DeltaChip({ value, suffix = '' }: { value: number | null; suffix?: string }) {
  if (value === null) return null;
  const rounded = Math.round(value * 10) / 10;
  if (rounded === 0) return <span className="text-[10px] font-bold text-slate-400">— 0{suffix}</span>;
  const up = rounded > 0;
  return (
    <span className={`text-[10px] font-bold ${up ? 'text-emerald-300' : 'text-rose-300'}`} title="Change since the end of the previous 6-epoch window">
      {up ? '▲' : '▼'} {Math.abs(rounded).toFixed(1)}
      {suffix}
    </span>
  );
}

function AttrStat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-md bg-white/5 px-2 py-1 text-left">
      <div className="flex items-baseline justify-between gap-1">
        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
        <span className="truncate text-sm font-extrabold leading-tight text-white">{value}</span>
      </div>
      <p className="truncate text-right text-[9px] leading-tight text-slate-500">{sub}</p>
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
  if (props.variant === 'draft') {
    const mult = props.lockedUnderdog ?? c.underdog;
    const drafted = props.draftedBy ?? null;
    return {
      value: num(c.projection),
      label: 'Projected pts',
      chip: (
        <span
          className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${mult >= 1.25 ? 'bg-amber-500/20 text-amber-300' : 'bg-white/10 text-slate-300'}`}
          title="Underdog multiplier: smaller DReps earn your team more per point. Fixed when you pick them."
        >
          {mult.toFixed(2)}×
        </span>
      ),
      trend: c.points_trend,
      trendColor: '#f5b301',
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
      chip: c.last_points !== null ? <span className="text-[10px] text-slate-400" title="Points last window">last {c.last_points}</span> : null,
      trend: c.points_trend,
      trendColor: '#f5b301',
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
    trendColor: '#c4b5fd',
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

function CardFront(props: TradingCardProps) {
  const c = props.card;
  const tier = tierFor(c.rank);
  const h = headlineFor(props);
  const ArchIcon = c.archetype ? ABILITY_ICONS[c.archetype.id] ?? Sparkles : null;
  const holo = c.rank !== null && c.rank <= 10;
  return (
    <div
      className={`group relative aspect-[5/7] w-full rounded-2xl bg-gradient-to-br ${tier.frame} p-[3px] shadow-xl ${tier.glow} ${
        props.selected ? 'ring-2 ring-brand-gold ring-offset-2 ring-offset-brand-navy' : ''
      }`}
    >
      <div className="relative flex h-full flex-col overflow-hidden rounded-[14px] bg-gradient-to-b from-slate-900 via-slate-950 to-black">
        <div className="flex items-center gap-1 px-3 pt-2">
          <p className="min-w-0 flex-1 truncate text-left text-sm font-extrabold leading-tight text-white" title={cardName(c)}>
            {cardName(c)}
          </p>
          {c.rookie && <span className="rounded bg-emerald-500/20 px-1 text-[9px] font-bold uppercase text-emerald-300">RC</span>}
        </div>

        <div className="relative mx-2.5 mt-1.5 min-h-0 flex-1 overflow-hidden rounded-xl border border-white/15 bg-slate-900">
          <CardArt card={c} />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/80 to-transparent" />
          <span className={`absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${tier.accent}`}>
            <Sparkles size={10} /> {tier.label}
            {c.rank !== null && ` · #${c.rank}`}
          </span>
          {c.streak > 1 && (
            <span className="absolute right-2 top-2 flex items-center gap-0.5 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-orange-300" title="Epochs in a row without missing a vote">
              <Flame size={11} /> {c.streak}
            </span>
          )}
          <div className="absolute inset-x-2 bottom-1.5 flex items-center justify-between gap-1">
            {c.archetype && ArchIcon ? (
              <span className="flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-brand-gold-light" title={c.archetype.detail}>
                <ArchIcon size={11} /> {c.archetype.label}
              </span>
            ) : (
              <span className="text-[9px] font-semibold uppercase tracking-widest text-white/80">DRep</span>
            )}
            <MyDRepBadge drepId={c.drep_id} className="!py-0 text-[10px]" />
          </div>
        </div>

        <div className="flex items-end justify-between gap-2 px-3 pt-1.5">
          <div className="min-w-0 text-left">
            <p className={`text-3xl font-black leading-none drop-shadow ${c.rank !== null && c.rank <= 3 ? tier.accent : 'text-white'}`}>{h.value}</p>
            <p className="truncate text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">
              {h.label}
              {props.variant === 'scoreboard' && isProvisional(c) && <span className="ml-1 text-amber-400">· Prov.</span>}
            </p>
          </div>
          <div className="flex flex-col items-end gap-0.5">
            {h.chip}
            <Sparkline values={h.trend} color={h.trendColor} width={84} height={20} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1 px-2.5 pt-1">
          {h.stats.map((s) => (
            <AttrStat key={s.label} {...s} />
          ))}
        </div>

        <div className="mt-auto flex items-center justify-between px-3 pb-1.5 pt-1 text-[10px] text-slate-500">
          <span className={c.registered ? 'text-emerald-400' : 'text-red-400'}>{c.registered ? '● Active' : '● Retired'}</span>
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
    </div>
  );
}

/* ---------- Back of card ---------- */

type Tab = 'profile' | 'stats' | 'trends' | 'collectible';
const TABS: Array<[Tab, string]> = [
  ['profile', 'Profile'],
  ['stats', 'Stats'],
  ['trends', 'Trends'],
  ['collectible', 'Collectible'],
];

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg bg-white/5 px-1.5 py-1.5 text-center">
      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="text-sm font-extrabold leading-tight text-white">{value}</p>
      {sub && <p className="text-[9px] leading-tight text-slate-500">{sub}</p>}
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <p className="mb-2 mt-5 text-[11px] font-bold uppercase tracking-widest text-slate-500">{children}</p>;
}

function AbilityBox({ a }: { a: CardAbility }) {
  const Icon = ABILITY_ICONS[a.id] ?? Sparkles;
  return (
    <div className="flex items-start gap-2 rounded-lg border border-brand-gold/25 bg-brand-gold/5 px-3 py-2">
      <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-gold-light" />
      <div>
        <p className="text-sm font-bold text-brand-gold-light">{a.label}</p>
        <p className="text-xs text-slate-300">{a.detail}</p>
      </div>
    </div>
  );
}

function SeasonTable({ seasons }: { seasons: SeasonLine[] }) {
  const rows = seasons.filter((s) => s.played || s.in_progress).slice().reverse();
  if (rows.length === 0) return <p className="text-sm text-slate-500">No seasons played yet.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[30rem] text-right text-xs">
        <thead className="text-[10px] uppercase tracking-wider text-slate-500">
          <tr>
            <th className="py-1 text-left font-semibold">Window</th>
            <th className="font-semibold">Pts</th>
            <th className="font-semibold">Votes</th>
            <th className="font-semibold">Explained</th>
            <th className="font-semibold">Early</th>
            <th className="font-semibold">Missed</th>
            <th className="font-semibold">GovScore</th>
          </tr>
        </thead>
        <tbody className="text-slate-200">
          {rows.map((s) => (
            <tr key={s.window} className="border-t border-white/5">
              <td className="py-1 text-left">
                {s.label}
                {s.in_progress && <span className="ml-1 text-[10px] text-violet-300">live</span>}
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
    </div>
  );
}

/** Windows from the DRep's first appearance on, so charts don't open with years of empty space. */
function activeSeasons(seasons: SeasonLine[]): SeasonLine[] {
  const first = seasons.findIndex((s) => s.played || s.govscore_end !== null);
  return first === -1 ? seasons.slice(-1) : seasons.slice(first);
}

function CardBack({ card, onClose }: { card: CardSummary; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('profile');
  const { detail, error } = useCardDetail(card.drep_id, true);
  const c = detail?.summary ?? card;
  const tier = tierFor(c.rank);
  const lt = c.lifetime;

  return (
    <div className={`rounded-2xl bg-gradient-to-br ${tier.frame} p-[3px] shadow-2xl ${tier.glow}`}>
      <div className="max-h-[88vh] overflow-y-auto rounded-[14px] bg-gradient-to-b from-slate-900 to-slate-950 p-5 text-left">
        <div className="relative -mx-5 -mt-5 mb-3 h-44 overflow-hidden rounded-t-[14px] sm:h-52">
          <CardArt card={c} />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
          <button type="button" onClick={onClose} aria-label="Close" className="absolute right-3 top-3 rounded-full bg-black/60 p-1.5 text-slate-200 hover:bg-black/80 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className={`text-[11px] font-bold uppercase tracking-widest ${tier.accent}`}>
          {c.rank !== null ? `#${c.rank} of ${c.total} · ` : ''}
          {tier.label}
          {c.rookie && ' · Rookie'}
        </p>
        <h3 className="break-words font-display text-2xl font-extrabold text-white">{cardName(c)}</h3>
        <p className="break-all font-mono text-[11px] text-slate-500">{c.drep_id}</p>
        <MyDRepBadge drepId={c.drep_id} className="mt-1" />

        <div className="mt-3 grid grid-cols-4 gap-2">
          <Tile label="GovScore" value={num(c.govscore, 1)} sub={c.delta1 !== null ? `${c.delta1 >= 0 ? '+' : ''}${c.delta1.toFixed(1)} last window` : undefined} />
          <Tile label="Season" value={`${c.season.points}`} sub={c.season.rank ? `#${c.season.rank} this season` : 'pts'} />
          <Tile label="Proj." value={num(c.projection)} sub="next season" />
          <Tile label="Underdog" value={`${c.underdog.toFixed(2)}×`} sub="draft value" />
        </div>

        <div role="tablist" className="mt-4 flex gap-1 border-b border-white/10">
          {TABS.map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`-mb-px border-b-2 px-3 py-1.5 text-sm font-semibold ${tab === id ? 'border-brand-gold text-white' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {!detail && !error && tab !== 'profile' && (
          <p className="mt-4 flex items-center gap-2 text-sm text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading history…
          </p>
        )}
        {error && <p className="mt-4 text-sm text-rose-300">{error}</p>}

        {tab === 'profile' && (
          <div>
            {isProvisional(c) && (
              <p className="mt-3 text-xs text-amber-300">
                Provisional: fewer than {PROVISIONAL_BELOW_ELIGIBLE} votes to judge so far, so the score is held back until the record grows.
              </p>
            )}
            {c.abilities.length > 0 && (
              <>
                <SectionTitle>Abilities</SectionTitle>
                <div className="grid gap-2 sm:grid-cols-2">
                  {c.abilities.map((a) => (
                    <AbilityBox key={a.id} a={a} />
                  ))}
                </div>
              </>
            )}
            <SectionTitle>Bio</SectionTitle>
            <p className="whitespace-pre-line text-sm leading-relaxed text-slate-300">{detail ? detail.bio || 'No bio provided.' : 'Loading…'}</p>
            {detail && detail.links.length > 0 && (
              <>
                <SectionTitle>Links</SectionTitle>
                <div className="grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
                  {detail.links.map((link) => (
                    <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer nofollow" className="flex min-w-0 items-center gap-2 text-sm text-slate-300 hover:text-white">
                      <Globe size={14} className="flex-shrink-0 text-slate-500" />
                      <span className="truncate">{link.label}</span>
                    </a>
                  ))}
                </div>
              </>
            )}
            <div className="mt-5">
              {c.do_not_list ? (
                <p className="text-center text-sm text-slate-400">This DRep has asked not to be promoted for delegation.</p>
              ) : (
                <a
                  href={`https://gov.tools/connected/drep_directory/${c.drep_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-3 py-2.5 font-semibold text-white transition-colors hover:bg-violet-700"
                >
                  Delegate via GovTool <ExternalLink size={14} />
                </a>
              )}
            </div>
          </div>
        )}

        {tab === 'stats' && detail && (
          <div>
            <SectionTitle>As a representative</SectionTitle>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Tile label="Power" value={formatAda(c.ada)} sub="ADA delegated" />
              <Tile label="Stamina" value={pct(c.participation)} sub="participation" />
              <Tile label="XP" value={`${c.votes_cast}`} sub={`votes of ${c.votes_eligible}`} />
              <Tile label="Charisma" value={c.delegators.toLocaleString()} sub="delegators" />
              <Tile label="Explains" value={pct(lt.rationale_rate)} sub="votes with rationale" />
              <Tile label="Early" value={pct(lt.early_rate)} sub="votes in first half" />
              <Tile label="Streak" value={`${c.streak}`} sub="epochs" />
              <Tile label="Tenure" value={`${lt.tenure_epochs}`} sub={lt.first_epoch !== null ? `epochs since ${lt.first_epoch}` : 'epochs'} />
            </div>
            <SectionTitle>As a fantasy pick</SectionTitle>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Tile label="Last" value={num(c.last_points)} sub="pts last window" />
              <Tile label="Form" value={num(c.form)} sub="avg last 3" />
              <Tile label="Season avg" value={num(c.avg_points)} sub="pts per window" />
              <Tile label="Best" value={`${c.best_points}`} sub="season high" />
              <Tile label="Lifetime" value={`${lt.points}`} sub="total pts" />
              <Tile label="Seasons" value={`${lt.seasons}`} sub="played" />
              <Tile label="Missed" value={`${lt.missed}`} sub="career" />
              <Tile label="Owned" value={c.ownership !== null ? pct(c.ownership) : '—'} sub="of teams" />
            </div>
            <SectionTitle>Season by season</SectionTitle>
            <SeasonTable seasons={detail.seasons} />
            <SectionTitle>How it voted (not scored)</SectionTitle>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-emerald-900/30 p-2 text-center">
                <p className="text-xl font-black text-emerald-300">{detail.votes.yes}</p>
                <p className="text-[10px] uppercase tracking-widest text-slate-400">Yes</p>
              </div>
              <div className="rounded-lg bg-red-900/30 p-2 text-center">
                <p className="text-xl font-black text-red-300">{detail.votes.no}</p>
                <p className="text-[10px] uppercase tracking-widest text-slate-400">No</p>
              </div>
              <div className="rounded-lg bg-slate-700/40 p-2 text-center">
                <p className="text-xl font-black text-slate-200">{detail.votes.abstain}</p>
                <p className="text-[10px] uppercase tracking-widest text-slate-400">Abstain</p>
              </div>
            </div>
          </div>
        )}

        {tab === 'trends' && detail && (
          <div>
            <SectionTitle>GovScore at the end of each window</SectionTitle>
            <LineChart points={activeSeasons(detail.seasons).map((s) => ({ label: s.label, value: s.govscore_end }))} />
            <SectionTitle>Fantasy points per window</SectionTitle>
            <BarChart points={activeSeasons(detail.seasons).map((s) => ({ label: s.label, value: s.played || s.in_progress ? s.points : null }))} />
            <p className="mt-2 text-xs text-slate-500">
              Points come only from voting, explaining votes and voting on time. Which way a DRep votes never counts.
            </p>
          </div>
        )}

        {tab === 'collectible' && detail && (
          <div>
            <p className="mt-3 flex items-center gap-2 text-sm text-slate-300">
              <Gem className="h-4 w-4 text-brand-gold-light" /> What this card would carry on-chain if minted. Not minted yet.
            </p>
            <dl className="mt-3 grid grid-cols-1 gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
              {Object.entries(detail.metadata).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 border-b border-white/5 py-1">
                  <dt className="text-slate-500">{k}</dt>
                  <dd className="truncate text-right text-slate-200" title={String(v)}>
                    {String(v)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>
    </div>
  );
}

export function TradingCard(props: TradingCardProps) {
  const { card } = props;
  const [open, setOpen] = useState(false);
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
    <div className="flex flex-col gap-2">
      <motion.button
        type="button"
        onClick={() => setOpen(true)}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        className="block w-full rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
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
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setOpen(false)}
              >
                <motion.div
                  role="dialog"
                  aria-modal="true"
                  aria-label={`${cardName(card)} card details`}
                  className="w-full max-w-2xl"
                  style={{ perspective: 1400 }}
                  initial={{ scale: 0.5, rotateY: -180, opacity: 0 }}
                  animate={{ scale: 1, rotateY: 0, opacity: 1 }}
                  exit={{ scale: 0.6, rotateY: 90, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 120, damping: 16 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <CardBack card={card} onClose={() => setOpen(false)} />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}
