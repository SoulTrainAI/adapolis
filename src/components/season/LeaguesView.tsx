'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, Copy, Globe2, Loader2, Lock, Plus, Users } from 'lucide-react';
import type { LeagueSummary } from '@/lib/season/leagues';
import { SITE_URL } from '@/lib/site/social';
import { ConnectPrompt } from '@/components/auth/ConnectPrompt';

type Lists = { mine: LeagueSummary[]; public: LeagueSummary[] };

export function inviteUrl(code: string): string {
  return `${SITE_URL}/leagues/join/${code}`;
}

function CopyInvite({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(inviteUrl(code));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="inline-flex items-center gap-1 text-xs text-violet-300 hover:text-white"
      title="Copy the invite link. Anyone with it can join this league."
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />} {copied ? 'Copied' : 'Copy invite link'}
    </button>
  );
}

async function post(url: string, body?: unknown): Promise<Record<string, unknown>> {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body ?? {}) });
  const json = (await res.json()) as Record<string, unknown> & { error?: string };
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json;
}

function LeagueRow({ l, action }: { l: LeagueSummary; action?: React.ReactNode }) {
  return (
    <li className="flex flex-wrap items-center gap-3 border border-slate-800 bg-slate-900/60 px-4 py-3">
      {l.visibility === 'public' ? (
        <Globe2 className="h-4 w-4 text-sky-300" aria-label="Public league" />
      ) : (
        <Lock className="h-4 w-4 text-amber-300" aria-label="Private league" />
      )}
      <Link href={`/leagues/${l.league_id}`} className="min-w-0 flex-1 truncate font-semibold text-white hover:text-violet-200">
        {l.name}
      </Link>
      <span className="flex items-center gap-1 text-sm text-slate-400" title="Members">
        <Users className="h-3.5 w-3.5" /> {l.members}
      </span>
      {l.invite_code && <CopyInvite code={l.invite_code} />}
      {action}
    </li>
  );
}

export function LeaguesView() {
  const [lists, setLists] = useState<Lists | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [visibility, setVisibility] = useState<'private' | 'public'>('private');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const load = useCallback(() => {
    fetch('/api/leagues')
      .then(async (r) => {
        const body = (await r.json()) as Lists & { error?: string };
        if (!r.ok) throw new Error(body.error ?? `HTTP ${r.status}`);
        setLists(body);
        setError(null);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  useEffect(() => {
    load();
    window.addEventListener('adapolis:auth', load);
    return () => window.removeEventListener('adapolis:auth', load);
  }, [load]);

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    setMessage(null);
    try {
      await fn();
      setMessage({ kind: 'ok', text: ok });
      load();
    } catch (e) {
      setMessage({ kind: 'error', text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-4xl font-bold text-white">Leagues</h1>
        <p className="text-slate-300">
          Play your team against friends, a community or a DRep&apos;s delegators. Your one team for the season plays in the
          global game and in every league you join, each with its own leaderboard. Leagues are for bragging rights: no fees
          and no prize pools.
        </p>
      </header>

      {error && <p className="text-rose-300">{error}</p>}

      <section className="space-y-3 border border-slate-700 bg-slate-900/70 p-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
          <Plus className="h-5 w-5" /> Start a league
        </h2>
        <div className="flex flex-wrap gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 40))}
            placeholder="League name"
            className="min-w-[12rem] flex-1 border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500"
          />
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as 'private' | 'public')}
            className="border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-white"
            title="Private: join by invite link only. Public: listed here for anyone to join."
          >
            <option value="private">Private (invite link)</option>
            <option value="public">Public (anyone can join)</option>
          </select>
          <button
            type="button"
            disabled={busy || name.trim().length < 3}
            onClick={() => act(() => post('/api/leagues', { name: name.trim(), visibility }).then(() => setName('')), 'League created. Copy its invite link below.')}
            className="flex items-center gap-2 bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-40"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Create
          </button>
        </div>
        <ConnectPrompt reason="Connect a wallet to create or join a league." />
        {message && <p className={`text-sm ${message.kind === 'ok' ? 'text-emerald-300' : 'text-red-300'}`}>{message.text}</p>}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">Your leagues</h2>
        {!lists ? (
          <p className="flex items-center gap-2 text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </p>
        ) : lists.mine.length === 0 ? (
          <p className="text-slate-400">None yet. Start one above, join a public league below, or open an invite link from a friend.</p>
        ) : (
          <ul className="space-y-2">
            {lists.mine.map((l) => (
              <LeagueRow
                key={l.league_id}
                l={l}
                action={
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => act(() => post(`/api/leagues/${l.league_id}/leave`), `You left ${l.name}.`)}
                    className="text-xs text-slate-400 hover:text-rose-300"
                  >
                    Leave
                  </button>
                }
              />
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">Public leagues</h2>
        {lists && lists.public.length === 0 ? (
          <p className="text-slate-400">No public leagues yet. Start the first one.</p>
        ) : (
          <ul className="space-y-2">
            {(lists?.public ?? []).map((l) => (
              <LeagueRow
                key={l.league_id}
                l={l}
                action={
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => act(() => post('/api/leagues/join', { league_id: l.league_id }), `You joined ${l.name}.`)}
                    className="bg-sky-700 px-3 py-1 text-xs font-semibold text-white hover:bg-sky-600 disabled:opacity-40"
                  >
                    Join
                  </button>
                }
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
