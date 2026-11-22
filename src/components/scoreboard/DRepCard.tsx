'use client';

/**
 * DRep trading card. The front is a collectible-style card whose foil tier
 * follows scoreboard rank; clicking it lifts the card out, enlarged and
 * flipped, so the full bio, record and links are readable.
 */

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { ExternalLink, Flame, Globe, Sparkles, X } from 'lucide-react';
import { getAvatarDataUri } from '@/lib/utils/avatar';
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

function Avatar({ props, size, ring }: { props: DRepCardProps; size: number; ring: string }) {
  const [imageFailed, setImageFailed] = useState(false);
  const className = `rounded-full flex-shrink-0 object-cover ring-4 ${ring} shadow-xl`;
  if (props.profileImage && !imageFailed) {
    return (
      // next/image needs every host allow-listed; DRep images come from arbitrary self-chosen hosts.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={props.profileImage}
        alt={`${props.displayName} profile photo`}
        width={size}
        height={size}
        style={{ width: size, height: size }}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setImageFailed(true)}
        className={className}
      />
    );
  }
  return (
    <Image
      src={getAvatarDataUri(props.drepId)}
      alt={`${props.displayName} avatar`}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className={className}
    />
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
  const ring = props.rank <= 3 ? 'ring-white/80' : 'ring-white/30';
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

        <div
          className="relative mx-3 mt-2 flex flex-1 items-center justify-center overflow-hidden rounded-xl border border-white/10"
          style={{
            backgroundImage: `radial-gradient(circle at 50% 45%, ${tier.art}, transparent 65%), repeating-linear-gradient(45deg, rgba(255,255,255,0.03) 0 2px, transparent 2px 12px)`,
          }}
        >
          <span className={`absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${tier.accent}`}>
            <Sparkles size={10} /> {tier.label}
          </span>
          {streak > 1 && (
            <span className="absolute right-2 top-2 flex items-center gap-0.5 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-bold text-orange-300">
              <Flame size={11} /> {streak}
            </span>
          )}
          <Avatar props={props} size={96} ring={ring} />
        </div>

        <div className="flex flex-wrap items-center justify-center gap-1 px-3 pt-1.5 text-[10px] uppercase tracking-widest text-slate-400">
          <span>Delegated Representative</span>
          <MyDRepBadge drepId={props.drepId} className="normal-case tracking-normal" />
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
        <div className="flex items-start gap-4">
          <Avatar props={props} size={72} ring="ring-white/30" />
          <div className="min-w-0 flex-1">
            <p className={`text-[11px] font-bold uppercase tracking-widest ${tier.accent}`}>
              #{props.rank} · {tier.label}
            </p>
            <h3 className="text-xl font-extrabold text-white break-words">{props.displayName}</h3>
            <p className="font-mono text-[11px] text-slate-500 break-all">{props.drepId}</p>
            <MyDRepBadge drepId={props.drepId} className="mt-1" />
            {isProvisional(props) && (
              <p className="mt-1 text-xs text-amber-300">
                Provisional: fewer than {PROVISIONAL_BELOW_ELIGIBLE} votes to judge so far, so the score is held back until
                the record grows.
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-white">
            <X className="h-5 w-5" />
          </button>
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
