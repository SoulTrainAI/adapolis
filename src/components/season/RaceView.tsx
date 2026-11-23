'use client';

/**
 * The season as a race: the top 20 DReps run toward the season's finish line,
 * overtaking each other as they vote, explain and keep streaks. Replay the
 * season day by day, scrub to any moment, and follow the commentary.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Crown, Flag, Flame, Pause, Play, Radio, Rewind, TrendingDown, TrendingUp, Zap } from 'lucide-react';
import type { Race } from '@/lib/season/race';
import { buildCommentary, DAY_S, displayName, orderAt, SHOWN, type CommentaryLine } from '@/lib/season/commentary';

const EPOCH_S = 432_000;
const REPLAY_MS = 18_000;

const TONE: Record<CommentaryLine['tone'], { color: string; Icon: typeof Zap }> = {
  lead: { color: 'text-amber-300', Icon: Crown },
  move: { color: 'text-sky-300', Icon: TrendingUp },
  hot: { color: 'text-fuchsia-300', Icon: Zap },
  streak: { color: 'text-orange-300', Icon: Flame },
  slip: { color: 'text-rose-300', Icon: TrendingDown },
  info: { color: 'text-slate-300', Icon: Radio },
};

const LANE_COLORS = ['#fbbf24', '#e2e8f0', '#fb923c', '#a78bfa', '#38bdf8', '#34d399', '#f472b6', '#60a5fa', '#facc15', '#2dd4bf'];

function Avatar({ name, image, size = 30 }: { name: string; image: string | null; size?: number }) {
  if (image) {
    // eslint-disable-next-line @next/next/no-img-element -- DRep images come from arbitrary self-chosen hosts
    return <img src={image} alt="" referrerPolicy="no-referrer" className="rounded-full bg-slate-800 object-cover ring-2 ring-black/40" style={{ width: size, height: size }} />;
  }
  return (
    <span className="flex items-center justify-center rounded-full bg-violet-800 font-bold text-white ring-2 ring-black/40" style={{ width: size, height: size, fontSize: size * 0.42 }}>
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

function dayOf(race: Race, t: number): number {
  return Math.min(Math.floor((race.ends_at - race.starts_at) / DAY_S), Math.max(1, Math.ceil((t - race.starts_at) / DAY_S)));
}

export function RaceView({ race }: { race: Race }) {
  const reduce = useReducedMotion();
  const until = Math.min(race.now, race.ends_at);
  const total = race.ends_at - race.starts_at;
  const totalDays = Math.round(total / DAY_S);
  const [t, setT] = useState(until);
  const [playing, setPlaying] = useState(false);
  const [highlight, setHighlight] = useState<string[]>([]);
  const raf = useRef<number | null>(null);
  const last = useRef<number>(0);

  const byId = useMemo(() => new Map(race.racers.map((r) => [r.drep_id, r])), [race]);
  const commentary = useMemo(
    () => buildCommentary(race.racers, { starts_at: race.starts_at, until, start_epoch: race.start_epoch }),
    [race, until]
  );

  // Replay the season once on arrival, unless the visitor prefers less motion.
  useEffect(() => {
    if (reduce || until <= race.starts_at + DAY_S) return;
    setT(race.starts_at);
    setPlaying(true);
  }, [reduce, race.starts_at, until]);

  const step = useCallback(
    (now: number) => {
      const dt = last.current ? now - last.current : 0;
      last.current = now;
      setT((prev) => {
        const next = prev + ((until - race.starts_at) * dt) / REPLAY_MS;
        if (next >= until) {
          setPlaying(false);
          return until;
        }
        return next;
      });
      raf.current = requestAnimationFrame(step);
    },
    [until, race.starts_at]
  );

  useEffect(() => {
    if (!playing) return;
    last.current = 0;
    raf.current = requestAnimationFrame(step);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [playing, step]);

  const order = useMemo(() => orderAt(race.racers, t), [race, t]);
  const shown = order.slice(0, SHOWN);
  const recent = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of race.racers) {
      const pts = r.events.filter((e) => e.t > t - DAY_S && e.t <= t).reduce((s, e) => s + e.pts, 0);
      if (pts !== 0) m.set(r.drep_id, pts);
    }
    return m;
  }, [race, t]);

  // The finish line is the season's end: scale so today's leader sits as far along as the season is.
  const leaderNow = orderAt(race.racers, until)[0]?.points ?? 0;
  const progress = Math.max(0.3, (until - race.starts_at) / total);
  const scale = Math.max(1, leaderNow / progress) * 1.04;

  const day = dayOf(race, t);
  const epoch = Math.min(race.end_epoch, race.start_epoch + Math.floor((t - race.starts_at) / EPOCH_S));
  const leader = shown[0];
  const leaderR = leader ? byId.get(leader.drep_id) : undefined;
  const feed = commentary.filter((c) => c.t <= t).slice(-40).reverse();
  const live = race.now < race.ends_at;
  const atLive = t >= until - 60;

  if (race.racers.length === 0) {
    return <p className="text-slate-400">No DRep has scored yet this season. The race starts with the first vote.</p>;
  }

  return (
    <div className="space-y-5">
      {/* Scoreboard strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3" title="Each season runs 6 epochs, about 30 days.">
          <p className="text-[11px] uppercase tracking-wider text-slate-400">Day</p>
          <p className="font-display text-2xl font-bold text-white">
            {day} <span className="text-base font-normal text-slate-400">/ {totalDays}</span>
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3" title="A Cardano epoch lasts 5 days.">
          <p className="text-[11px] uppercase tracking-wider text-slate-400">Epoch</p>
          <p className="font-display text-2xl font-bold text-white">
            {epoch} <span className="text-base font-normal text-slate-400">({epoch - race.start_epoch + 1} of 6)</span>
          </p>
        </div>
        <div className="col-span-2 flex items-center gap-3 rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 to-transparent p-3">
          {leaderR && <Avatar name={displayName(leaderR)} image={leaderR.image} size={40} />}
          <div className="min-w-0">
            <p className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-amber-300">
              <Crown className="h-3.5 w-3.5" /> Leading
            </p>
            <p className="truncate font-display text-xl font-bold text-white">
              {leaderR ? displayName(leaderR) : '—'} <span className="text-amber-200">{leader?.points ?? 0}</span>
            </p>
          </div>
          <p className="ml-auto text-right text-xs text-slate-400">
            {race.field} DReps
            <br />
            in the race
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2">
        <button
          type="button"
          onClick={() => {
            if (t >= until) setT(race.starts_at);
            setPlaying((p) => !p);
          }}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-600 text-white hover:bg-violet-500"
          aria-label={playing ? 'Pause' : 'Play the season'}
          title={playing ? 'Pause' : 'Replay the season'}
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={() => {
            setPlaying(false);
            setT(race.starts_at);
          }}
          className="text-slate-400 hover:text-white"
          aria-label="Back to day 1"
          title="Back to day 1"
        >
          <Rewind className="h-4 w-4" />
        </button>
        <div className="relative min-w-[12rem] flex-1">
          <input
            type="range"
            min={race.starts_at}
            max={race.ends_at}
            step={3600}
            value={Math.round(t)}
            onChange={(e) => {
              setPlaying(false);
              setT(Math.min(until, Number(e.target.value)));
            }}
            className="w-full accent-amber-400"
            aria-label="Scrub through the season"
          />
          <div className="pointer-events-none absolute inset-x-0 -bottom-3 flex justify-between text-[10px] text-slate-500">
            {Array.from({ length: 7 }, (_, i) => (
              <span key={i}>{i < 6 ? `E${race.start_epoch + i}` : '🏁'}</span>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setPlaying(false);
            setT(until);
          }}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${atLive && live ? 'bg-rose-600 text-white' : 'border border-slate-600 text-slate-300 hover:text-white'}`}
          title={live ? 'Jump to right now' : 'Jump to the final standings'}
        >
          {live && <span className={`h-2 w-2 rounded-full ${atLive ? 'animate-pulse bg-white' : 'bg-rose-500'}`} />}
          {live ? 'Live' : 'Final'}
        </button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        {/* The track */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-[linear-gradient(180deg,#0b1024,#121a3a)] p-3 sm:p-4">
          <div
            className="pointer-events-none absolute inset-y-0 right-3 w-3 opacity-60 sm:right-4"
            style={{ backgroundImage: 'repeating-conic-gradient(#fff 0 25%, #111 0 50%)', backgroundSize: '6px 6px' }}
            title="Season end"
          />
          <ol className="relative space-y-1.5">
            <AnimatePresence initial={false} mode="popLayout">
              {shown.map((o, i) => {
                const r = byId.get(o.drep_id)!;
                const name = displayName(r);
                const pct = Math.max(0, Math.min(100, (o.points / scale) * 100));
                const gain = recent.get(o.drep_id);
                const lit = highlight.includes(o.drep_id);
                const color = LANE_COLORS[i % LANE_COLORS.length];
                return (
                  <motion.li
                    key={o.drep_id}
                    layout={!reduce}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                    className={`relative flex h-10 items-center rounded-lg ${lit ? 'bg-amber-400/15 ring-1 ring-amber-300/60' : i % 2 ? 'bg-white/[0.03]' : 'bg-white/[0.06]'}`}
                  >
                    <span
                      className={`z-10 w-8 flex-shrink-0 text-center font-display text-sm font-black ${i === 0 ? 'text-amber-300' : i === 1 ? 'text-slate-200' : i === 2 ? 'text-orange-300' : 'text-slate-500'}`}
                    >
                      {i + 1}
                    </span>
                    <Link href={`/dreps/${o.drep_id}`} className="relative mr-6 h-full flex-1" title={`${name}: ${o.points} season points. Open their card.`}>
                      <motion.div
                        className="absolute inset-y-[9px] left-0 rounded-full"
                        style={{ background: `linear-gradient(90deg, ${color}10, ${color}aa)` }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: reduce ? 0 : 0.25, ease: 'linear' }}
                      />
                      <motion.div
                        className="absolute top-1/2 flex -translate-y-1/2 items-center gap-2"
                        animate={{ left: `calc(${pct}% - 15px)` }}
                        transition={{ duration: reduce ? 0 : 0.25, ease: 'linear' }}
                      >
                        <Avatar name={name} image={r.image} />
                        <span className="whitespace-nowrap rounded bg-black/50 px-1.5 py-0.5 text-xs font-semibold text-white">
                          {name.length > 22 ? `${name.slice(0, 21)}…` : name} <span style={{ color }}>{o.points}</span>
                        </span>
                        <AnimatePresence>
                          {gain !== undefined && (
                            <motion.span
                              key={`${o.drep_id}-${Math.floor(t / DAY_S)}`}
                              initial={{ opacity: 0, y: 6, scale: 0.8 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0 }}
                              className={`rounded-full px-1.5 text-[11px] font-black ${gain > 0 ? 'bg-emerald-500/90 text-emerald-950' : 'bg-rose-500/90 text-rose-950'}`}
                            >
                              {gain > 0 ? `+${gain}` : gain}
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    </Link>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ol>
          <p className="relative mt-3 flex items-center justify-end gap-1 text-[11px] text-slate-500">
            <Flag className="h-3 w-3" /> Finish: end of epoch {race.end_epoch}
          </p>
        </div>

        {/* Commentary */}
        <aside className="flex max-h-[44rem] flex-col rounded-2xl border border-slate-800 bg-slate-900/70">
          <p className="flex items-center gap-2 border-b border-slate-800 px-4 py-3 font-display font-bold text-white">
            <Radio className="h-4 w-4 text-rose-400" /> Commentary
          </p>
          <ol className="flex-1 space-y-1 overflow-y-auto p-2">
            <AnimatePresence initial={false}>
              {feed.map((c) => {
                const { color, Icon } = TONE[c.tone];
                return (
                  <motion.li
                    key={`${c.day}-${c.text}`}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="cursor-pointer rounded-lg px-2 py-1.5 hover:bg-white/5"
                    onMouseEnter={() => setHighlight(c.drep_ids)}
                    onMouseLeave={() => setHighlight([])}
                    onClick={() => setHighlight(c.drep_ids)}
                  >
                    <p className="text-[10px] uppercase tracking-wider text-slate-500">
                      Day {c.day} · Epoch {c.epoch}
                    </p>
                    <p className={`flex gap-1.5 text-sm leading-snug ${color}`}>
                      <Icon className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                      <span className="text-slate-100">{c.text}</span>
                    </p>
                  </motion.li>
                );
              })}
            </AnimatePresence>
            {feed.length === 0 && <li className="px-2 py-3 text-sm text-slate-500">The gates are open. Waiting for the first vote…</li>}
          </ol>
        </aside>
      </div>
    </div>
  );
}
