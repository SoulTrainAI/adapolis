'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Loader2, Search, ShieldCheck } from 'lucide-react';
import { openGetStarted } from '@/components/auth/GetStartedGuide';

type Json = Record<string, unknown>;

async function api(path: string, body?: Json): Promise<Json> {
  const res = await fetch(`/api/admin/panel${path}`, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : undefined);
  const data = (await res.json().catch(() => ({}))) as Json;
  if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : `HTTP ${res.status}`);
  return data;
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5">
      <h2 className="text-lg font-bold">{title}</h2>
      {children}
    </section>
  );
}

const input = 'min-h-[44px] w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500';
const btn = 'min-h-[44px] rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-40';

export function AdminPanel() {
  const [admin, setAdmin] = useState<boolean | null>(null);
  const [status, setStatus] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [teamQ, setTeamQ] = useState('');
  const [teams, setTeams] = useState<Json[]>([]);
  const [leagueQ, setLeagueQ] = useState('');
  const [leagues, setLeagues] = useState<Json[]>([]);
  const [drepId, setDrepId] = useState('');
  const [profile, setProfile] = useState<Json | null | undefined>(undefined);
  const [note, setNote] = useState('');
  const [edit, setEdit] = useState({ image: '', bio: '' });
  const [log, setLog] = useState<Json[]>([]);

  const loadMe = useCallback(() => {
    api('?view=me')
      .then((r) => setAdmin(r.admin === true))
      .catch(() => setAdmin(false));
  }, []);
  useEffect(() => {
    loadMe();
    window.addEventListener('adapolis:auth', loadMe);
    return () => window.removeEventListener('adapolis:auth', loadMe);
  }, [loadMe]);
  const loadLog = useCallback(() => api('?view=log').then((r) => setLog((r.log as Json[]) ?? [])), []);
  useEffect(() => {
    if (admin) void loadLog();
  }, [admin, loadLog]);

  async function run(fn: () => Promise<unknown>, ok: string) {
    setBusy(true);
    setStatus(null);
    try {
      await fn();
      setStatus({ kind: 'ok', text: ok });
      await loadLog();
    } catch (e) {
      setStatus({ kind: 'error', text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  }

  if (admin === null) return <p className="flex items-center gap-2 text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Checking access…</p>;
  if (!admin)
    return (
      <div className="space-y-3">
        <h1 className="text-3xl font-bold">Admin</h1>
        <p className="text-slate-300">Sign in with an admin wallet (listed in the ADMIN_STAKE_ADDRESSES variable in Railway).</p>
        <button onClick={() => openGetStarted('sign')} className={`${btn} bg-violet-600 text-white`}>Connect wallet</button>
      </div>
    );

  const reason = () => window.prompt('Reason (goes in the public audit log):') ?? '';

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <ShieldCheck className="h-8 w-8 text-emerald-400" />
        <div>
          <h1 className="text-3xl font-bold">Admin</h1>
          <p className="text-sm text-slate-400">Every action here is recorded in the public audit log below.</p>
        </div>
      </header>
      {status && <p className={`rounded-lg px-3 py-2 text-sm ${status.kind === 'ok' ? 'bg-emerald-950 text-emerald-200' : 'bg-rose-950 text-rose-200'}`}>{status.text}</p>}

      <Card title="Team names">
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void run(async () => setTeams(((await api(`?view=teams&q=${encodeURIComponent(teamQ)}`)).teams as Json[]) ?? []), `Found teams for “${teamQ}”.`); }}>
          <input className={input} value={teamQ} onChange={(e) => setTeamQ(e.target.value)} placeholder="Search team names" />
          <button className={`${btn} bg-slate-700`} disabled={busy}><Search className="h-4 w-4" /></button>
        </form>
        <ul className="divide-y divide-slate-800 text-sm">
          {teams.map((t) => (
            <li key={String(t.roster_id)} className="flex flex-wrap items-center gap-2 py-2">
              <span className="font-semibold">{String(t.team_name)}</span>
              <span className="text-xs text-slate-500">season {String(t.season_number)} · wallet …{String(t.stake_tail)}</span>
              <span className="ml-auto flex gap-2">
                <button className={`${btn} bg-slate-700`} disabled={busy} onClick={() => { const name = window.prompt('New team name (blank resets to the default):', ''); if (name === null) return; void run(() => api('', { action: 'rename_team', roster_id: String(t.roster_id), name: name.trim() || null, reason: reason() }), 'Team renamed.'); }}>Rename</button>
                <button className={`${btn} bg-rose-800`} disabled={busy} onClick={() => void run(() => api('', { action: 'rename_team', roster_id: String(t.roster_id), name: null, reason: reason() }), 'Team name reset.')}>Reset</button>
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="League names">
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void run(async () => setLeagues(((await api(`?view=leagues&q=${encodeURIComponent(leagueQ)}`)).leagues as Json[]) ?? []), `Found leagues for “${leagueQ}”.`); }}>
          <input className={input} value={leagueQ} onChange={(e) => setLeagueQ(e.target.value)} placeholder="Search league names" />
          <button className={`${btn} bg-slate-700`} disabled={busy}><Search className="h-4 w-4" /></button>
        </form>
        <ul className="divide-y divide-slate-800 text-sm">
          {leagues.map((l) => (
            <li key={String(l.league_id)} className="flex flex-wrap items-center gap-2 py-2">
              <span className="font-semibold">{String(l.name)}</span>
              <span className="text-xs text-slate-500">{String(l.visibility)}</span>
              <button className={`${btn} ml-auto bg-slate-700`} disabled={busy} onClick={() => { const name = window.prompt('New league name (3–40 characters):', 'League'); if (!name) return; void run(() => api('', { action: 'rename_league', league_id: String(l.league_id), name, reason: reason() }), 'League renamed.'); }}>Rename</button>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="DRep profiles">
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void run(async () => { const r = await api(`?view=profile&q=${encodeURIComponent(drepId.trim())}`); const p = (r.profile as Json | null) ?? null; setProfile(p); setEdit({ image: String(p?.image ?? ''), bio: String(p?.bio ?? '') }); setNote(String(p?.moderation_note ?? '')); }, 'Profile loaded.'); }}>
          <input className={input} value={drepId} onChange={(e) => setDrepId(e.target.value)} placeholder="drep1…" />
          <button className={`${btn} bg-slate-700`} disabled={busy}><Search className="h-4 w-4" /></button>
        </form>
        {profile !== undefined && (
          <div className="space-y-3 text-sm">
            <p className="text-slate-300">
              {profile === null ? 'Not claimed, never moderated.' : profile.edited_by_admin ? 'Not claimed; filled in by ADApolis.' : 'Claimed by the DRep (their own words: hide only, never edit).'}{' '}
              <a href={`/dreps/${drepId.trim()}`} target="_blank" className="text-violet-300">Open profile ↗</a>
            </p>
            <input className={input} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Public moderation note (shown on the profile)" />
            <div className="flex flex-wrap gap-2">
              {(['image', 'bio'] as const).map((f) => {
                const hidden = profile?.[`hide_${f}`] === true;
                return (
                  <button key={f} className={`${btn} ${hidden ? 'bg-emerald-800' : 'bg-rose-800'}`} disabled={busy} onClick={() => void run(async () => { await api('', { action: 'moderate_profile', drep_id: drepId.trim(), [`hide_${f}`]: !hidden, note }); setProfile({ ...(profile ?? {}), [`hide_${f}`]: !hidden }); }, `${f} ${hidden ? 'restored' : 'hidden'}.`)}>
                    {hidden ? `Restore ${f}` : `Hide ${f}`}
                  </button>
                );
              })}
            </div>
            {(profile === null || profile.edited_by_admin === true) && (
              <div className="space-y-2 rounded-xl border border-slate-800 p-3">
                <p className="font-semibold">Fill in this unclaimed profile (for testing)</p>
                <input className={input} value={edit.image} onChange={(e) => setEdit({ ...edit, image: e.target.value })} placeholder="Image URL (https:// or ipfs://)" />
                <textarea className={`${input} min-h-[90px]`} value={edit.bio} onChange={(e) => setEdit({ ...edit, bio: e.target.value })} placeholder="Bio" />
                <button className={`${btn} bg-violet-600`} disabled={busy} onClick={() => void run(() => api('', { action: 'edit_unclaimed_profile', drep_id: drepId.trim(), profile: { image: edit.image || null, bio: edit.bio || null, links: null } }), 'Profile saved.')}>Save</button>
              </div>
            )}
          </div>
        )}
      </Card>

      <Card title="Run jobs">
        <div className="flex flex-wrap gap-2">
          <button className={`${btn} bg-slate-700`} disabled={busy} onClick={() => void run(() => api('', { action: 'run_job', job: 'votes' }), 'Hourly vote sync finished.')}>Sync new votes now</button>
          <button className={`${btn} bg-slate-700`} disabled={busy} onClick={() => void run(() => api('', { action: 'run_job', job: 'full' }), 'Full sync started (runs in the background; see /api/cron).')}>Run full sync</button>
          <button className={`${btn} bg-slate-700`} disabled={busy} onClick={() => void run(() => api('', { action: 'test_notification' }), 'Test notification sent: check the bell.')}>Send me a test notification</button>
          <a href="/api/cron" target="_blank" className={`${btn} border border-slate-700`}>Last run status ↗</a>
        </div>
      </Card>

      <Card title="Audit log">
        <ul className="max-h-96 space-y-1 overflow-y-auto text-xs">
          {log.map((a) => (
            <li key={String(a.id)} className="rounded bg-slate-950 px-2 py-1">
              <span className="text-slate-500">{new Date(String(a.created_at)).toLocaleString()}</span> · <span className="font-semibold">{String(a.action)}</span> · {String(a.target).slice(0, 40)} ·{' '}
              <span className="text-slate-400">{JSON.stringify(a.details).slice(0, 160)}</span>
            </li>
          ))}
          {log.length === 0 && <li className="text-slate-500">Nothing yet (or migration 021 hasn’t been run).</li>}
        </ul>
      </Card>
    </div>
  );
}
