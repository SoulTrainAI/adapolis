'use client';

import { TIPS } from '@/lib/site/glossary';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Loader2, Trophy } from 'lucide-react';
import type { Leaderboard, LeaderboardTeam } from '@/lib/season/leaderboard';
import { seasonLabel } from '@/lib/season/points';

function Initials({ name, image }: { name: string | null; image: string | null }) {
  if (image) {
    // eslint-disable-next-line @next/next/no-img-element -- DRep images come from arbitrary self-chosen hosts
    return <img src={image} alt="" referrerPolicy="no-referrer" className="h-7 w-7 flex-shrink-0 bg-slate-800 object-cover" />;
  }
  return (
    <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center bg-violet-900/60 text-xs font-bold text-violet-100">
      {(name ?? '?').slice(0, 1).toUpperCase()}
    </span>
  );
}

function TeamRow({ team, live }: { team: LeaderboardTeam; live: boolean }) {
  const medal = team.rank === 1 ? 'text-amber-300' : team.rank === 2 ? 'text-slate-200' : team.rank === 3 ? 'text-orange-300' : 'text-slate-400';
  return (
    <details className={`border ${team.mine ? 'border-brand-gold/70 bg-amber-500/5' : 'border-slate-800 bg-slate-900/60'}`}>
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3">
        <span className={`w-8 text-right font-mono text-lg font-bold ${medal}`}>{team.rank}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-white">
            {team.name}
            {team.mine && <span className="ml-2 bg-brand-gold/20 px-1.5 py-0.5 text-xs font-bold text-amber-200">You</span>}
            {team.eligible && (
              <span className="ml-2 inline-flex align-middle" title="Competing for prizes: delegated since before the roster lock.">
                <Trophy className="h-4 w-4 text-amber-300" />
              </span>
            )}
          </p>
          <div className="mt-1 flex gap-1">
            {team.picks.map((p) => (
              <span key={p.drep_id} title={p.name ?? p.drep_id}>
                <Initials name={p.name} image={p.image} />
              </span>
            ))}
          </div>
        </div>
        <span className="text-right">
          <span className="block text-2xl font-black text-white">{live ? team.points : '—'}</span>
          <span className="text-[11px] uppercase tracking-wider text-slate-500">pts</span>
        </span>
      </summary>
      <table className="w-full border-t border-slate-800 text-sm">
        <thead className="text-xs uppercase tracking-wider text-slate-500">
          <tr>
            <th className="px-4 py-2 text-left font-semibold">DRep</th>
            <th className="px-2 text-right font-semibold" title={TIPS.seasonPoints}>Season pts</th>
            <th className="px-4 text-right font-semibold" title="This pick's points for the team, including a retired DRep's points before a swap.">Team pts</th>
          </tr>
        </thead>
        <tbody className="text-slate-200">
          {team.picks.map((p) => (
            <tr key={p.drep_id} className="border-t border-slate-800/60">
              <td className="max-w-[12rem] truncate px-4 py-1.5">
                {p.name ?? `${p.drep_id.slice(0, 14)}…`}
                {p.swapped_from && (
                  <span
                    className="block truncate text-xs text-slate-400"
                    title={`Replaced ${p.swapped_from.name ?? p.swapped_from.drep_id} (retired) at epoch ${p.swapped_from.swap_epoch}. Their ${p.swapped_from.points} points from before stay on the team.`}
                  >
                    replaced {p.swapped_from.name ?? 'a retired DRep'} (+{p.swapped_from.points})
                  </span>
                )}
              </td>
              <td className="px-2 text-right">{p.points}</td>
              <td className="px-4 text-right font-semibold text-white">{p.contribution}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

async function globalBoard(): Promise<Leaderboard> {
  const r = await fetch('/api/fantasy/leaderboard');
  const body = (await r.json()) as Leaderboard & { error?: string };
  if (!r.ok) throw new Error(body.error ?? `HTTP ${r.status}`);
  return body;
}

/**
 * A season leaderboard: the global game by default, or a league's when
 * `fetchBoard` and `title` are given (`children` adds league controls).
 */
export function LeaderboardView({
  fetchBoard = globalBoard,
  title = 'Team Leaderboard',
  children,
}: {
  fetchBoard?: () => Promise<Leaderboard>;
  title?: string;
  children?: ReactNode;
} = {}) {
  const [data, setData] = useState<Leaderboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetchBoard()
      .then(setData)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, [fetchBoard]);

  useEffect(() => {
    load();
    window.addEventListener('adapolis:auth', load);
    return () => window.removeEventListener('adapolis:auth', load);
  }, [load]);

  if (error) return <p className="text-rose-300">{error}</p>;
  if (!data) {
    return (
      <p className="flex items-center gap-2 text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading the leaderboard…
      </p>
    );
  }

  const { season, teams } = data;
  const live = season.status !== 'upcoming';
  const mine = teams.find((t) => t.mine);
  const statusText =
    season.status === 'upcoming'
      ? `Starts ${format(new Date(season.starts_at), 'PP')} · rosters lock ${format(new Date(season.draft_locks_at), 'PPp')}`
      : season.status === 'live'
        ? `Live · epochs ${season.start_epoch}–${season.end_epoch} · ends ${format(new Date(season.ends_at), 'PP')}`
        : `Final · epochs ${season.start_epoch}–${season.end_epoch}`;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-wider text-violet-300">{seasonLabel(season.season_number)}</p>
        <h1 className="flex items-center gap-3 text-4xl font-bold text-white">
          <Trophy className="h-8 w-8 text-brand-gold" /> {title}
        </h1>
        {children}
        <p className="text-slate-300">
          Team points are the sum of each drafted DRep&apos;s season points. Season points come only from
          voting, explaining votes and voting on time, never from how a DRep votes.
          {data.scope.kind === 'global' && ' Only teams in the global game appear here; the top 3 win DRep All-Star Season Trophy NFTs.'}
        </p>
        <p className="text-sm text-slate-400">
          {statusText} · {teams.length} team{teams.length === 1 ? '' : 's'}
        </p>
      </header>

      {mine && (
        <div className="flex items-center justify-between border border-brand-gold/60 bg-amber-500/10 px-4 py-3">
          <p className="text-amber-100">
            Your team <strong>{mine.name}</strong> is {live ? <>#{mine.rank} with {mine.points} pts</> : <>entered for the {seasonLabel(season.season_number)}</>}.
          </p>
          <Link href="/draft" className="text-sm text-amber-200 hover:text-white">
            {season.status === 'upcoming' ? 'Edit team →' : 'View draft →'}
          </Link>
        </div>
      )}

      {teams.length === 0 ? (
        <div className="border border-slate-700 bg-slate-900/60 p-6 text-slate-300">
          <p className="text-lg font-semibold text-white">No teams yet.</p>
          <p className="mt-1">
            Be the first:{' '}
            <Link href="/draft" className="text-violet-300 hover:text-violet-200">
              draft 5 DReps
            </Link>{' '}
            before rosters lock.
          </p>
        </div>
      ) : (
        <ol className="space-y-2">
          {teams.map((t, i) => (
            <li key={`${t.name}-${i}`}>
              <TeamRow team={t} live={live} />
            </li>
          ))}
        </ol>
      )}
      {!live && teams.length > 0 && <p className="text-sm text-slate-500">Points start counting when the season starts. Tap a team to see its picks.</p>}
    </div>
  );
}
