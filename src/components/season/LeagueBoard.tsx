'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { Globe2, Lock, Users } from 'lucide-react';
import type { Leaderboard } from '@/lib/season/leaderboard';
import type { LeagueSummary } from '@/lib/season/leagues';
import { LeaderboardView } from './LeaderboardView';
import { inviteUrl } from './LeaguesView';

export function LeagueBoard({ leagueId, code }: { leagueId: string; code: string | null }) {
  const [league, setLeague] = useState<LeagueSummary | null>(null);
  const fetchBoard = useCallback(async (): Promise<Leaderboard> => {
    const r = await fetch(`/api/leagues/${leagueId}${code ? `?code=${encodeURIComponent(code)}` : ''}`);
    const body = (await r.json()) as { league?: LeagueSummary; board?: Leaderboard | null; error?: string };
    if (!r.ok || !body.league) throw new Error(body.error ?? `HTTP ${r.status}`);
    setLeague(body.league);
    if (!body.board) throw new Error('No season to show yet.');
    return body.board;
  }, [leagueId, code]);

  return (
    <LeaderboardView fetchBoard={fetchBoard} title={league?.name ?? 'League'}>
      {league && (
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
          <span className="flex items-center gap-1">
            {league.visibility === 'public' ? <Globe2 className="h-4 w-4 text-sky-300" /> : <Lock className="h-4 w-4 text-amber-300" />}
            {league.visibility === 'public' ? 'Public league' : 'Private league'}
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-4 w-4" /> {league.members} member{league.members === 1 ? '' : 's'}
          </span>
          {league.invite_code && <span className="truncate text-xs text-slate-400">Invite: {inviteUrl(league.invite_code)}</span>}
          {!league.is_member && (
            <Link href={code ? `/leagues/join/${code}` : '/leagues'} className="font-semibold text-violet-300 hover:text-white">
              Join this league →
            </Link>
          )}
        </div>
      )}
    </LeaderboardView>
  );
}
