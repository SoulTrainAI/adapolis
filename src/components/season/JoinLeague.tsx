'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Users } from 'lucide-react';
import { ConnectPrompt } from '@/components/auth/ConnectPrompt';

type League = { league_id: string; name: string; members: number };

export function JoinLeague({ code }: { code: string }) {
  const router = useRouter();
  const [league, setLeague] = useState<League | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/leagues/code/${encodeURIComponent(code)}`)
      .then(async (r) => {
        const body = (await r.json()) as { league?: League; error?: string };
        if (!r.ok || !body.league) throw new Error(body.error ?? `HTTP ${r.status}`);
        setLeague(body.league);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, [code]);

  const join = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/leagues/join', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) });
      const body = (await res.json()) as { league_id?: string; error?: string };
      if (!res.ok || !body.league_id) throw new Error(body.error ?? `HTTP ${res.status}`);
      router.push(`/leagues/${body.league_id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 border border-slate-700 bg-slate-900/70 p-6 text-center">
      <p className="text-sm uppercase tracking-wider text-violet-300">You&apos;re invited</p>
      {league ? (
        <>
          <h1 className="text-3xl font-bold text-white">{league.name}</h1>
          <p className="flex items-center justify-center gap-1 text-slate-400">
            <Users className="h-4 w-4" /> {league.members} member{league.members === 1 ? '' : 's'}
          </p>
          <p className="text-slate-300">
            A league in the ADApolis DRep game. Draft 5 DReps each season and see whose team scores most. Free, no fees, no
            prize pool: bragging rights only.
          </p>
          <button
            type="button"
            onClick={join}
            disabled={busy}
            className="inline-flex items-center gap-2 bg-violet-600 px-6 py-2.5 font-semibold text-white hover:bg-violet-500 disabled:opacity-40"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Join league
          </button>
          <ConnectPrompt reason="Connect a wallet to join." />
        </>
      ) : !error ? (
        <p className="flex items-center justify-center gap-2 text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading the invite…
        </p>
      ) : null}
      {error && <p className="text-rose-300">{error}</p>}
    </div>
  );
}
