'use client';

/**
 * DRep trading card. The front is a collectible-style card whose foil tier
 * follows scoreboard rank; clicking it lifts the card out, enlarged and
 * flipped, so the full bio, record and links are readable.
 */

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ExternalLink, Flame, Globe, Sparkles, X } from 'lucide-react';
import { getAvatarGradient, hashDRepId } from '@/lib/utils/avatar';
import { MyDRepBadge } from '@/components/auth/MyDRepBadge';
import { PROVISIONAL_BELOW_ELIGIBLE } from '@/lib/scoring/confidence';

interface DRepCardProps {
  rank: number;
  drepId: string;
  displayName: string;
  adjustedScore: number | null;
  rawScore: number | null;
  participationRate: number | null;
  adaAmount: string;
  delegatorCount: number | null;
  isRegistered: boolean;
  votingStreak?: number;
  bio?: string | null;
  profileImage?: string | null;
  links?: Array<{ label: string; url: string }>;
  /** CIP-119 doNotList: the DRep asked tools not to campaign for delegation to it */
  doNotList?: boolean;
  votesCast?: number | null;
  votesEligible?: number | null;
  voteSummary?: { yes: number; no: number; abstain: number };
  recentVotes?: Array<{ proposal_title: string; vote: string; proposal_id: string }>;
}

interface Tier {
  label: string;
  frame: string;
  glow: string;
  art: string;
  accent: string;
}

// Foil tiers follow scoreboard rank, like rarity on a trading card.
function tierFor(rank: number): Tier {
  if (rank === 1)
    return { label: 'Legend', frame: 'from-yellow-200 via-amber-500 to-yellow-300', glow: 'shadow-amber-500/40', art: 'rgba(245,158,11,0.45)', accent: 'text-amber-300' };
  if (rank === 2)
    return { label: 'Silver', frame: 'from-slate-100 via-slate-400 to-slate-200', glow: 'shadow-slate-300/30', art: 'rgba(203,213,225,0.35)', accent: 'text-slate-200' };
  if (rank === 3)
    return { label: 'Bronze', frame: 'from-orange-300 via-orange-700 to-amber-400', glow: 'shadow-orange-600/30', art: 'rgba(234,88,12,0.4)', accent: 'text-orange-300' };
  if (rank <= 10)
    return { label: 'Holo', frame: 'from-fuchsia-400 via-violet-500 to-cyan-400', glow: 'shadow-violet-500/30', art: 'rgba(139,92,246,0.45)', accent: 'text-fuchsia-300' };
  if (rank <= 50)
    return { label: 'Rare', frame: 'from-sky-300 via-blue-600 to-sky-400', glow: 'shadow-sky-500/20', art: 'rgba(14,165,233,0.35)', accent: 'text-sky-300' };
  return { label: 'Common', frame: 'from-slate-500 via-slate-700 to-slate-500', glow: '', art: 'rgba(100,116,139,0.3)', accent: 'text-slate-300' };
}

// Any letter or digit in any script (constructor form: the TS target predates the u flag).
const LETTER = new RegExp('[\\p{L}\\p{N}]', 'u');

// Deterministic art for DReps without a photo, so every card is one of a kind.
function GeneratedArt({ drepId, name }: { drepId: string; name: string }) {
  const h = hashDRepId(drepId);
  const { from, to } = getAvatarGradient(drepId);
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

/** Card artwork: the DRep's photo filling the frame (blurred copy behind for odd shapes), else generated art. */
function CardArt({ props }: { props: DRepCardProps }) {
  const [imageFailed, setImageFailed] = useState(false);
  if (!props.profileImage || imageFailed) return <GeneratedArt drepId={props.drepId} name={props.displayName} />;
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- DRep images come from arbitrary self-chosen hosts */}
      <img
        src={props.profileImage}
        alt=""
        aria-hidden
        referrerPolicy="no-referrer"
        className="absolute inset-0 h-full w-full scale-125 object-cover opacity-60 blur-xl"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={props.profileImage}
        alt={`${props.displayName} profile image`}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setImageFailed(true)}
        className="absolute inset-0 h-full w-full object-contain drop-shadow-2xl"
      />
    </>
  );
}

function isProvisional(props: DRepCardProps): boolean {
  return props.votesEligible !== null && props.votesEligible !== undefined && props.votesEligible > 0 && props.votesEligible < PROVISIONAL_BELOW_ELIGIBLE;
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg bg-white/5 px-1.5 py-1.5 text-center">
      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="text-sm font-extrabold text-white leading-tight">{value}</p>
      {sub && <p className="text-[9px] text-slate-500 leading-tight">{sub}</p>}
    </div>
  );
}

function CardFront({ props }: { props: DRepCardProps }) {
  const tier = tierFor(props.rank);
  const streak = props.votingStreak ?? 0;
  const provisional = isProvisional(props);
  return (
    <div className={`group relative w-full aspect-[5/7] rounded-2xl bg-gradient-to-br ${tier.frame} p-[3px] shadow-xl ${tier.glow}`}>
      <div className="relative flex h-full flex-col overflow-hidden rounded-[14px] bg-gradient-to-b from-slate-900 via-slate-950 to-black">
        <div className="flex items-center gap-2 px-3 pt-2.5">
          <span
            className={`flex h-8 min-w-8 items-center justify-center rounded-full bg-gradient-to-br ${tier.frame} px-1.5 text-sm font-black text-slate-950 shadow`}
          >
            {props.rank}
          </span>
          <p className="min-w-0 flex-1 truncate text-left text-base font-extrabold text-white">{props.displayName}</p>
          <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[11px] font-bold text-slate-100">{props.adaAmount}</span>
        </div>

        <div className="relative mx-2.5 mt-2 flex-1 overflow-hidden rounded-xl border border-white/15 bg-slate-900">
          <CardArt props={props} />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/70 to-transparent" />
          <span className={`absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${tier.accent}`}>
            <Sparkles size={10} /> {tier.label}
          </span>
          {streak > 1 && (
            <span className="absolute right-2 top-2 flex items-center gap-0.5 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-orange-300">
              <Flame size={11} /> {streak}
            </span>
          )}
          <div className="absolute inset-x-2 bottom-1.5 flex items-center justify-between gap-1">
            <span className="text-[9px] font-semibold uppercase tracking-widest text-white/80">Delegated Representative</span>
            <MyDRepBadge drepId={props.drepId} className="!py-0 text-[10px]" />
          </div>
        </div>

        <div className="px-3 pt-1 text-center">
          <p className={`text-4xl font-black leading-none drop-shadow ${props.rank <= 3 ? tier.accent : 'text-white'}`}>
            {props.adjustedScore !== null ? props.adjustedScore.toFixed(1) : '—'}
          </p>
          <p
            className="text-[9px] font-bold uppercase tracking-[0.25em] text-slate-500"
            title="Participation, adjusted for how long the record is, then dampened for large ADA holdings"
          >
            GovScore{provisional && <span className="ml-1 text-amber-400">· Provisional</span>}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-1.5 px-3 pt-1.5">
          <Stat label="Part." value={props.participationRate !== null ? `${Math.round(props.participationRate * 100)}%` : '—'} />
          <Stat label="Votes" value={`${props.votesCast ?? 0}`} sub={props.votesEligible ? `of ${props.votesEligible}` : undefined} />
          <Stat label="Fans" value={props.delegatorCount ? props.delegatorCount.toLocaleString() : '—'} sub="delegators" />
        </div>

        <div className="mt-auto flex items-center justify-between px-3 pb-2 pt-1.5 text-[10px] text-slate-500">
          <span className={props.isRegistered ? 'text-emerald-400' : 'text-red-400'}>{props.isRegistered ? '● Active' : '● Retired'}</span>
          {props.doNotList ? <span>Not seeking delegation</span> : <span>Tap to flip</span>}
          <span className="font-mono">No. {String(props.rank).padStart(3, '0')}</span>
        </div>

        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_35%,rgba(255,255,255,0.18)_50%,transparent_65%)] bg-[length:250%_100%] opacity-0 transition-opacity duration-300 group-hover:animate-shimmer group-hover:opacity-100" />
      </div>
    </div>
  );
}

function CardBack({ props, onClose }: { props: DRepCardProps; onClose: () => void }) {
  const tier = tierFor(props.rank);
  const votes = props.voteSummary || { yes: 0, no: 0, abstain: 0 };
  const links = props.links || [];
  return (
    <div className={`rounded-2xl bg-gradient-to-br ${tier.frame} p-[3px] shadow-2xl ${tier.glow}`}>
      <div className="max-h-[85vh] overflow-y-auto rounded-[14px] bg-gradient-to-b from-slate-900 to-slate-950 p-5 text-left">
        <div className="relative -mx-5 -mt-5 mb-4 h-56 overflow-hidden rounded-t-[14px] sm:h-64">
          <CardArt props={props} />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 rounded-full bg-black/60 p-1.5 text-slate-200 hover:bg-black/80 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-w-0">
          <p className={`text-[11px] font-bold uppercase tracking-widest ${tier.accent}`}>
            #{props.rank} · {tier.label}
          </p>
          <h3 className="text-2xl font-extrabold text-white break-words">{props.displayName}</h3>
          <p className="font-mono text-[11px] text-slate-500 break-all">{props.drepId}</p>
          <MyDRepBadge drepId={props.drepId} className="mt-1" />
          {isProvisional(props) && (
            <p className="mt-1 text-xs text-amber-300">
              Provisional: fewer than {PROVISIONAL_BELOW_ELIGIBLE} votes to judge so far, so the score is held back until the
              record grows.
            </p>
          )}
        </div>

        <div className="mt-4">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-slate-500">Bio</p>
          <p className="whitespace-pre-line text-sm leading-relaxed text-slate-300">{props.bio || 'No bio provided.'}</p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="GovScore" value={props.adjustedScore !== null ? props.adjustedScore.toFixed(1) : '—'} />
          <Stat label="Raw" value={props.rawScore !== null ? props.rawScore.toFixed(1) : '—'} sub="before ADA dampening" />
          <Stat
            label="Participation"
            value={props.participationRate !== null ? `${Math.round(props.participationRate * 100)}%` : '—'}
            sub={props.votesEligible ? `${props.votesCast ?? 0} of ${props.votesEligible}` : undefined}
          />
          <Stat label="Streak" value={`${props.votingStreak ?? 0}`} sub="epochs" />
          <Stat label="Delegated" value={props.adaAmount} />
          <Stat label="Delegators" value={props.delegatorCount ? props.delegatorCount.toLocaleString() : '—'} />
          <Stat label="Status" value={props.isRegistered ? 'Active' : 'Retired'} />
          <Stat label="Card" value={`No. ${String(props.rank).padStart(3, '0')}`} />
        </div>

        <div className="mt-4">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-slate-500">Voting record</p>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-emerald-900/30 p-2 text-center">
              <p className="text-xl font-black text-emerald-300">{votes.yes}</p>
              <p className="text-[10px] uppercase tracking-widest text-slate-400">Yes</p>
            </div>
            <div className="rounded-lg bg-red-900/30 p-2 text-center">
              <p className="text-xl font-black text-red-300">{votes.no}</p>
              <p className="text-[10px] uppercase tracking-widest text-slate-400">No</p>
            </div>
            <div className="rounded-lg bg-slate-700/40 p-2 text-center">
              <p className="text-xl font-black text-slate-200">{votes.abstain}</p>
              <p className="text-[10px] uppercase tracking-widest text-slate-400">Abstain</p>
            </div>
          </div>
        </div>

        {links.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-slate-500">Links</p>
            <div className="grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
              {links.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="flex min-w-0 items-center gap-2 text-sm text-slate-300 hover:text-white"
                >
                  <Globe size={14} className="flex-shrink-0 text-slate-500" />
                  <span className="truncate">{link.label}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5">
          {props.doNotList ? (
            <p className="text-center text-sm text-slate-400">This DRep has asked not to be promoted for delegation.</p>
          ) : (
            <a
              href={`https://gov.tools/connected/drep_directory/${props.drepId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-3 py-2.5 font-semibold text-white transition-colors hover:bg-violet-700"
            >
              Delegate via GovTool <ExternalLink size={14} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export function DRepCard({ props }: { props: DRepCardProps }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
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
    <>
      <motion.button
        type="button"
        onClick={() => setOpen(true)}
        className="block w-full rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
        whileHover={{ y: -6, rotate: -0.6 }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        aria-label={`${props.displayName}, rank ${props.rank}, GovScore ${props.adjustedScore?.toFixed(1) ?? 'none'}. Open card details`}
        aria-haspopup="dialog"
      >
        <CardFront props={props} />
      </motion.button>

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
                  aria-label={`${props.displayName} card details`}
                  className="w-full max-w-xl"
                  style={{ perspective: 1400 }}
                  initial={{ scale: 0.5, rotateY: -180, opacity: 0 }}
                  animate={{ scale: 1, rotateY: 0, opacity: 1 }}
                  exit={{ scale: 0.6, rotateY: 90, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 120, damping: 16 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <CardBack props={props} onClose={() => setOpen(false)} />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
