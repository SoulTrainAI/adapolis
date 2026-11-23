'use client';

/** Compact Team Leaderboard for the Cardanathon dashboard. */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, Trophy } from 'lucide-react';
import type { Leaderboard } from '@/lib/season/leaderboard';
import { seasonLabel } from '@/lib/season/points';

export function TeamsPanel() {
  const [data, setData] = useState<Leaderboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch('/api/fantasy/leaderboard')
      .then(async (r) => {
        const body = (await r.json()) as Leaderboard & { error?: string };
        if (!r.ok) throw new Error(body.error ?? `HTTP ${r.status}`);
        setData(body);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);
  useEffect(() => {
    load();
    window.addEventListener('adapolis:auth', load);
    return () => window.removeEventListener('adapolis:auth', load);
  }, [load]);

  if (error) return <p className="p-4 text-sm text-rose-300">{error}</p>;
  if (!data) {
    return (
      <p className="flex items-center gap-2 p-4 text-sm text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading teams…
      </p>
    );
  }
  const live = data.season.status !== 'upcoming';
  return (
    <div className="flex h-full flex-col">
      <p className="px-3 pb-2 text-xs text-slate-400">
        {seasonLabel(data.season.season_number)} · {data.teams.length} team{data.teams.length === 1 ? '' : 's'} ·{' '}
        {data.season.status === 'upcoming' ? 'starts ' + new Date(data.season.starts_at).toLocaleDateString() : data.season.status}
      </p>
      {data.teams.length === 0 ? (
        <div className="m-3 rounded-lg border border-dashed border-slate-700 p-4 text-sm text-slate-300">
          No teams yet.{' '}
          <Link href="/draft" className="font-semibold text-amber-300 hover:text-amber-200">
            Draft yours →
          </Link>
        </div>
      ) : (
        <ol className="flex-1 space-y-1 overflow-y-auto px-2 pb-2">
          {data.teams.map((t, i) => (
            <li key={`${t.name}-${i}`} className={`rounded-lg ${t.mine ? 'bg-amber-500/10 ring-1 ring-amber-400/50' : 'bg-white/[0.04]'}`}>
              <button type="button" onClick={() => setOpen(open === t.name ? null : t.name)} className="flex w-full items-center gap-2 px-2 py-1.5 text-left">
                <span className={`w-6 text-right font-display font-black ${t.rank === 1 ? 'text-amber-300' : t.rank === 2 ? 'text-slate-200' : t.rank === 3 ? 'text-orange-300' : 'text-slate-500'}`}>
                  {t.rank}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">
                  {t.name}
                  {t.mine && <span className="ml-1.5 text-[10px] font-bold uppercase text-amber-200">You</span>}
                </span>
                {t.eligible && (
                  <span title="Competing for prizes: delegated since before the lock.">
                    <Trophy className="h-3.5 w-3.5 text-amber-300" />
                  </span>
                )}
                <span className="font-display text-sm font-black text-white">{live ? t.points : '—'}</span>
              </button>
              {open === t.name && (
                <ul className="space-y-0.5 px-3 pb-2 text-xs text-slate-300">
                  {t.picks.map((p) => (
                    <li key={p.drep_id} className="flex justify-between gap-2">
                      <Link href={`/dreps/${p.drep_id}`} className="truncate hover:text-white">
                        {p.name ?? `${p.drep_id.slice(0, 14)}…`}
                      </Link>
                      <span className="whitespace-nowrap text-slate-400">
                        {p.points} × {p.multiplier.toFixed(2)} = <span className="font-semibold text-white">{p.contribution}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      )}
      <div className="flex justify-between border-t border-slate-800 px-3 py-2 text-xs">
        <Link href="/leaderboard" className="text-violet-300 hover:text-white">
          Full Team Leaderboard →
        </Link>
        <Link href="/leagues" className="text-violet-300 hover:text-white">
          Leagues →
        </Link>
      </div>
    </div>
  );
}
