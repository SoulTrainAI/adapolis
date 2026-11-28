'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { Gem, Lock, Sparkles, Trophy, Wallet } from 'lucide-react';
import type { Claim } from '@/lib/season/champions';
import { seasonLabel } from '@/lib/season/points';
import { windowFromClose } from '@/lib/season/mint-window';
import { openGetStarted } from '@/components/auth/GetStartedGuide';

const EDITION: Record<string, { label: string; frame: string }> = {
  gold: { label: 'Gold', frame: 'from-amber-200 via-yellow-400 to-amber-600' },
  silver: { label: 'Silver', frame: 'from-slate-100 via-slate-300 to-slate-500' },
  bronze: { label: 'Bronze', frame: 'from-orange-200 via-orange-400 to-amber-800' },
  holo: { label: 'Holographic', frame: 'from-fuchsia-400 via-violet-500 to-cyan-400' },
  // Basic Season Card: a plain frame, no edition, no foil.
  season: { label: 'Season Card', frame: 'from-slate-500 via-slate-600 to-slate-700' },
};

const WHY: Record<Claim['claimant_type'], string> = {
  drep: 'Your own card',
  team: 'You drafted them',
  delegator: 'Earlier season reward',
  house: 'ADApolis full set',
};

type State = 'test' | 'upcoming' | 'open' | 'closed' | 'claimed';

function stateOf(c: Claim, now: number): State {
  if (c.season_number === 0) return 'test';
  if (c.claimed_at) return 'claimed';
  if (!c.claim_closes_at) return 'upcoming';
  const { opens, closes } = windowFromClose(new Date(c.claim_closes_at));
  if (now < opens.getTime()) return 'upcoming';
  return now < closes.getTime() ? 'open' : 'closed';
}

function Confetti() {
  const bits = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => ({
        x: (Math.random() - 0.5) * 520,
        y: -Math.random() * 360 - 60,
        r: Math.random() * 540,
        c: ['#fbbf24', '#a78bfa', '#22d3ee', '#f472b6', '#34d399'][i % 5],
      })),
    []
  );
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
      {bits.map((b, i) => (
        <motion.span
          key={i}
          className="absolute h-2.5 w-1.5 rounded-sm"
          style={{ backgroundColor: b.c }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
          animate={{ x: b.x, y: [0, b.y, b.y + 420], opacity: [1, 1, 0], rotate: b.r }}
          transition={{ duration: 1.8, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}

/** The card-flip reveal. Plays for real mints later; plays as a preview for Preseason test cards now. */
function Reveal({ claim, onDone }: { claim: Claim; onDone: () => void }) {
  const [flipped, setFlipped] = useState(false);
  const edition = EDITION[claim.edition ?? 'season'];
  useEffect(() => {
    const t = setTimeout(() => setFlipped(true), 900);
    if ('vibrate' in navigator) navigator.vibrate?.([30, 60, 30]);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-6 backdrop-blur" onClick={onDone} role="dialog" aria-modal="true" aria-label="Card reveal">
      {flipped && <Confetti />}
      <div style={{ perspective: 1200 }}>
        <motion.div
          className="relative h-[22rem] w-60"
          style={{ transformStyle: 'preserve-3d' }}
          initial={{ scale: 0.4, rotateY: 0, y: 80 }}
          animate={{ scale: 1, rotateY: flipped ? 180 : 0, y: 0 }}
          transition={{ type: 'spring', stiffness: 120, damping: 14 }}
        >
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl border-4 border-violet-400 bg-gradient-to-br from-violet-900 to-slate-950" style={{ backfaceVisibility: 'hidden' }}>
            <Gem className="h-20 w-20 animate-pulse text-violet-300" />
          </div>
          <div
            className={`absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl bg-gradient-to-br p-1 ${edition.frame}`}
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-xl bg-slate-950/90 p-4 text-center">
              <Sparkles className="h-8 w-8 text-amber-300" />
              <p className="text-xs uppercase tracking-[0.2em] text-slate-300">{seasonLabel(claim.season_number)} DRep All-Star</p>
              <p className="text-2xl font-bold text-white">{claim.name ?? `${claim.drep_id.slice(0, 12)}…`}</p>
              <p className="text-sm font-semibold text-amber-200">{claim.edition ? `${edition.label} edition` : edition.label}</p>
              {claim.season_number === 0 && <p className="mt-2 text-xs text-slate-400">Preseason preview. Test cards are never minted.</p>}
            </div>
          </div>
        </motion.div>
      </div>
      <p className="absolute bottom-8 text-sm text-slate-300">Tap anywhere to close</p>
    </div>
  );
}

export function MintView() {
  const [claims, setClaims] = useState<Claim[] | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [revealing, setRevealing] = useState<Claim | null>(null);
  const now = Date.now();

  useEffect(() => {
    const load = () => {
      fetch('/api/auth/me')
        .then((r) => r.json() as Promise<{ stakeAddress: string | null }>)
        .then((me) => setSignedIn(Boolean(me.stakeAddress)))
        .catch(() => setSignedIn(false));
      fetch('/api/me/claims')
        .then((r) => r.json() as Promise<{ claims?: Claim[] }>)
        .then((b) => setClaims(b.claims ?? []))
        .catch(() => setClaims([]));
    };
    load();
    window.addEventListener('adapolis:auth', load);
    return () => window.removeEventListener('adapolis:auth', load);
  }, []);

  const open = (claims ?? []).filter((c) => stateOf(c, now) === 'open');
  const lit = open.length > 0;

  return (
    <div className="space-y-6">
      <motion.section
        className={`relative overflow-hidden rounded-3xl border p-6 sm:p-8 ${lit ? 'border-amber-400/70' : 'border-slate-700'}`}
        animate={lit ? { boxShadow: ['0 0 0px rgba(251,191,36,0)', '0 0 48px rgba(251,191,36,0.45)', '0 0 0px rgba(251,191,36,0)'] } : {}}
        transition={{ duration: 2.4, repeat: Infinity }}
      >
        <div className="flex flex-wrap items-center gap-4">
          <motion.div
            animate={lit ? { rotate: [0, -8, 8, 0], scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 1 }}
            className={`flex h-16 w-16 items-center justify-center rounded-2xl ${lit ? 'bg-amber-400 text-amber-950' : 'bg-slate-800 text-slate-400'}`}
          >
            {lit ? <Gem className="h-8 w-8" /> : <Lock className="h-8 w-8" />}
          </motion.div>
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-bold text-white">{lit ? `${open.length} mint${open.length === 1 ? '' : 's'} ready!` : 'No mints open right now'}</h2>
            <p className="text-sm text-slate-300">
              {signedIn === false
                ? 'Connect your wallet to see what you’ve won.'
                : lit
                  ? `Window closes ${formatDistanceToNowStrict(windowFromClose(new Date(open[0].claim_closes_at as string)).closes, { addSuffix: true })}. Unclaimed copies are never minted.`
                  : 'When a season ends, your prizes appear here and this panel lights up.'}
            </p>
          </div>
          {signedIn === false && (
            <button onClick={() => openGetStarted()} className="flex min-h-[44px] items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 font-semibold text-white hover:bg-violet-500">
              <Wallet className="h-4 w-4" /> Connect wallet
            </button>
          )}
        </div>
      </motion.section>

      {claims && claims.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {claims.map((c, i) => {
              const st = stateOf(c, now);
              const ed = EDITION[c.edition ?? 'season'];
              return (
                <motion.li
                  key={`${c.season_number}-${c.drep_id}-${c.claimant_type}`}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`rounded-2xl bg-gradient-to-br p-[2px] ${st === 'open' ? ed.frame : 'from-slate-700 to-slate-800'}`}
                >
                  <div className="flex h-full flex-col gap-2 rounded-2xl bg-slate-950 p-4">
                    <p className="text-xs uppercase tracking-wider text-slate-400">
                      {seasonLabel(c.season_number)} · {ed.label}
                    </p>
                    <p className="text-lg font-bold text-white">{c.name ?? `${c.drep_id.slice(0, 14)}…`}</p>
                    <p className="text-sm text-slate-400">
                      {WHY[c.claimant_type]} · {c.copies} cop{c.copies === 1 ? 'y' : 'ies'}
                    </p>
                    <div className="mt-auto pt-2">
                      {st === 'test' ? (
                        <button onClick={() => setRevealing(c)} className="min-h-[44px] w-full rounded-lg border border-violet-500 px-3 py-2 text-sm font-semibold text-violet-200 hover:bg-violet-500/10">
                          Preview the reveal
                        </button>
                      ) : st === 'open' ? (
                        <button disabled className="min-h-[44px] w-full rounded-lg bg-amber-400 px-3 py-2 text-sm font-bold text-amber-950 opacity-60" title="Minting is being built and tested">
                          Mint (opening soon)
                        </button>
                      ) : (
                        <p className="text-xs text-slate-500">
                          {st === 'claimed'
                            ? 'Minted'
                            : st === 'closed'
                              ? 'Window closed'
                              : c.claim_closes_at
                                ? `Opens ${format(windowFromClose(new Date(c.claim_closes_at)).opens, 'PP')}`
                                : 'Opens after the season ends'}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}

      <p className="flex items-center gap-2 text-xs text-slate-500">
        <Trophy className="h-4 w-4" aria-hidden /> Trophy winners will see their DRep All-Star Season Trophy here when minting opens.
      </p>

      {revealing && <Reveal claim={revealing} onDone={() => setRevealing(null)} />}
    </div>
  );
}
