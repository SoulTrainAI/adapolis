'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { LayoutGrid, List, Loader2, Lock, Plus, Search, X } from 'lucide-react';
import { MyDRepBadge } from '@/components/auth/MyDRepBadge';
import type { DraftData, PoolDRep } from '@/lib/season/fantasy';
import type { CardSummary } from '@/lib/cards/types';
import { TradingCard } from '@/components/cards/TradingCard';
import { placeholderCard, useCards } from '@/components/cards/useCards';
import { LiveTeam } from './LiveTeam';
import { EligibilityNote } from './EligibilityNote';
import { seasonLabel } from '@/lib/season/points';

type Response = ({ enabled: true } & DraftData) | { enabled: false };
type Sort = 'points' | 'projection' | 'form' | 'underdog' | 'smallest' | 'drafted';

const ROSTER_SIZE = 5;
const PAGE = 24;
// Drag types: a card dragged from the pool onto the team, or a pick dragged off the team.
const PICK = 'application/x-adapolis-pick';
const UNPICK = 'application/x-adapolis-unpick';

function formatAda(ada: number): string {
  if (ada >= 1e9) return `₳${(ada / 1e9).toFixed(1)}B`;
  if (ada >= 1e6) return `₳${(ada / 1e6).toFixed(1)}M`;
  if (ada >= 1e3) return `₳${(ada / 1e3).toFixed(0)}K`;
  return `₳${Math.round(ada)}`;
}

function displayName(d: Pick<PoolDRep, 'name' | 'drep_id'>): string {
  return d.name ?? `${d.drep_id.slice(0, 12)}…${d.drep_id.slice(-4)}`;
}

function UnderdogChip({ value }: { value: number }) {
  const strong = value >= 1.25;
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        strong ? 'bg-amber-900/50 text-amber-300 border border-amber-800/60' : 'bg-slate-800 text-slate-300'
      }`}
      title="Underdog multiplier: smaller DReps (by ADA and delegators) multiply the points they gain for your team (losses count at 1×). Fixed when you pick them."
    >
      {value.toFixed(2)}×
    </span>
  );
}

export function DraftBoard() {
  const [data, setData] = useState<Response | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [teamName, setTeamName] = useState('');
  const [inGlobal, setInGlobal] = useState(true);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>('points');
  const [activeOnly, setActiveOnly] = useState(true);
  const [shown, setShown] = useState(PAGE);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [view, setView] = useState<'cards' | 'list'>('cards');
  const [dropTarget, setDropTarget] = useState<'team' | 'pool' | null>(null);
  const { cards } = useCards();

  const load = useCallback(() => {
    fetch('/api/fantasy/draft')
      .then(async (r) => {
        const body = (await r.json()) as Response & { signed_in?: boolean; error?: string };
        if (!r.ok) throw new Error(body.error ?? `HTTP ${r.status}`);
        setData(body);
        setSignedIn(body.signed_in ?? false);
        if (body.enabled && body.roster) {
          setPicked(body.roster.picks.map((p) => p.drep_id));
          setTeamName(body.roster.team_name ?? '');
          setInGlobal(body.roster.in_global !== false);
        }
      })
      .catch((e: unknown) => setLoadError(e instanceof Error ? e.message : String(e)));
  }, []);

  useEffect(() => {
    load();
    window.addEventListener('adapolis:auth', load);
    return () => window.removeEventListener('adapolis:auth', load);
  }, [load]);

  const pool = useMemo(() => (data?.enabled ? data.pool : []), [data]);
  const byId = useMemo(() => new Map(pool.map((d) => [d.drep_id, d])), [pool]);
  const snapshot = useMemo(
    () => new Map((data?.enabled ? data.roster?.picks ?? [] : []).map((p) => [p.drep_id, p.underdog_multiplier])),
    [data]
  );

  const cardFor = useCallback(
    (d: PoolDRep): CardSummary => ({
      ...(cards.get(d.drep_id) ??
        placeholderCard({ drep_id: d.drep_id, name: d.name, image: d.image, ada: d.ada, delegators: d.delegators, do_not_list: d.do_not_list })),
      underdog: d.underdog,
    }),
    [cards]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = pool.filter(
      (d) =>
        (!activeOnly || d.last_votes > 0) &&
        (q === '' || d.drep_id.toLowerCase().includes(q) || (d.name ?? '').toLowerCase().includes(q))
    );
    const cmp: Record<Sort, (a: PoolDRep, b: PoolDRep) => number> = {
      points: (a, b) => (b.last_points ?? -1e9) - (a.last_points ?? -1e9),
      projection: (a, b) => (cards.get(b.drep_id)?.projection ?? -1e9) - (cards.get(a.drep_id)?.projection ?? -1e9),
      form: (a, b) => (cards.get(b.drep_id)?.form ?? -1e9) - (cards.get(a.drep_id)?.form ?? -1e9),
      underdog: (a, b) => b.underdog - a.underdog || (b.last_points ?? -1e9) - (a.last_points ?? -1e9),
      smallest: (a, b) => a.ada - b.ada,
      drafted: (a, b) => b.drafted_by - a.drafted_by,
    };
    return list.sort(cmp[sort]);
  }, [pool, query, sort, activeOnly, cards]);

  if (loadError) return <p className="text-red-300">{loadError}</p>;
  if (!data) {
    return (
      <p className="flex items-center gap-2 text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading the draft pool…
      </p>
    );
  }
  if (!data.enabled) {
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-6 text-slate-300">
        <p className="text-lg font-semibold text-white">Drafting opens when Season 1 is scheduled.</p>
        <p className="mt-2 text-sm">
          Until then, follow the <Link href="/season" className="text-violet-300 hover:text-violet-200">preview standings</Link> to
          scout DReps: points come only from voting, explaining votes and voting on time.
        </p>
      </div>
    );
  }

  const { season } = data;
  const now = Date.now();
  const locked = now >= new Date(season.draft_locks_at).getTime();
  const started = now >= new Date(season.starts_at).getTime();
  const full = picked.length >= ROSTER_SIZE;
  const savedIds = (data.roster?.picks ?? []).map((p) => p.drep_id).sort().join();
  const dirty =
    picked.slice().sort().join() !== savedIds ||
    (teamName.trim() || null) !== (data.roster?.team_name ?? null) ||
    (data.roster !== null && inGlobal !== (data.roster.in_global !== false));

  const toggle = (id: string) => {
    setMessage(null);
    setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < ROSTER_SIZE ? [...prev, id] : prev));
  };

  const addPick = (id: string) => {
    setMessage(null);
    setPicked((prev) => (prev.includes(id) || prev.length >= ROSTER_SIZE ? prev : [...prev, id]));
  };
  const removePick = (id: string) => {
    setMessage(null);
    setPicked((prev) => prev.filter((x) => x !== id));
  };
  const dropOnTeam = {
    onDragOver: (e: React.DragEvent) => {
      if (locked || !e.dataTransfer.types.includes(PICK)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = full ? 'none' : 'move';
      setDropTarget('team');
    },
    onDragLeave: () => setDropTarget(null),
    onDrop: (e: React.DragEvent) => {
      const id = e.dataTransfer.getData(PICK);
      setDropTarget(null);
      if (!id) return;
      e.preventDefault();
      if (full && !picked.includes(id)) setMessage({ kind: 'error', text: `Your team is full. Drag a DRep out first.` });
      else addPick(id);
    },
  };
  const dropOnPool = {
    onDragOver: (e: React.DragEvent) => {
      if (locked || !e.dataTransfer.types.includes(UNPICK)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setDropTarget('pool');
    },
    onDragLeave: () => setDropTarget(null),
    onDrop: (e: React.DragEvent) => {
      const id = e.dataTransfer.getData(UNPICK);
      setDropTarget(null);
      if (id) {
        e.preventDefault();
        removePick(id);
      }
    },
  };
  const dragFrom = (type: string, id: string) => ({
    draggable: !locked,
    onDragStart: (e: React.DragEvent) => {
      e.dataTransfer.setData(type, id);
      e.dataTransfer.effectAllowed = 'move';
    },
    onDragEnd: () => setDropTarget(null),
  });

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/fantasy/roster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team_name: teamName, drep_ids: picked, in_global: inGlobal }),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      setMessage({ kind: 'ok', text: 'Team saved. You can change it until rosters lock.' });
      load();
    } catch (e) {
      setMessage({ kind: 'error', text: e instanceof Error ? e.message : String(e) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-wider text-violet-300">
          {seasonLabel(season.season_number)} · epochs {season.start_epoch}–{season.end_epoch}
        </p>
        <h1 className="text-4xl font-bold text-white">Draft your team</h1>
        <LiveTeam />
        {signedIn && <EligibilityNote />}
        <p className="text-slate-300">
          Pick {ROSTER_SIZE} DReps. Your team scores their season points: voting, explaining votes and voting on time,
          never which way they vote. Smaller DReps carry an underdog multiplier on the points they gain, fixed when you pick them; losses are never multiplied.
        </p>
        <p className="text-sm text-slate-400">
          {started ? 'Season started' : `Season starts ${format(new Date(season.starts_at), 'PPp')}`} · Rosters lock{' '}
          {format(new Date(season.draft_locks_at), 'PPp')}
          {!locked && ` (in ${formatDistanceToNowStrict(new Date(season.draft_locks_at))})`}
        </p>
      </header>

      {(data.saved_teams ?? []).map((team) => (
        <div
          key={team.season_number}
          className="flex flex-wrap items-center gap-3 rounded-xl border border-sky-700/50 bg-sky-950/30 px-4 py-3 text-sm text-slate-200"
        >
          <p className="min-w-0 flex-1">
            Your <strong>{seasonLabel(team.season_number)}</strong> team{team.team_name ? ` “${team.team_name}”` : ''} is saved:{' '}
            {team.drep_ids.map((id) => (byId.get(id) ? displayName(byId.get(id)!) : id.slice(0, 12))).join(', ')}. This draft is
            for the <strong>{seasonLabel(season.season_number)}</strong>, a separate season, so it needs its own team.
          </p>
          {!locked && (
            <button
              type="button"
              onClick={() => {
                setPicked(team.drep_ids.slice(0, ROSTER_SIZE));
                if (!teamName && team.team_name) setTeamName(team.team_name);
                setMessage({ kind: 'ok', text: 'Picks copied. Multipliers are recalculated for this season when you save.' });
              }}
              className="rounded-lg bg-sky-700 px-3 py-1.5 font-semibold text-white hover:bg-sky-600"
            >
              Use the same picks here
            </button>
          )}
        </div>
      ))}

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <section
          className={`order-2 lg:order-1 space-y-3 rounded-xl transition-colors ${dropTarget === 'pool' ? 'bg-rose-500/10 outline outline-2 outline-dashed outline-rose-400/60' : ''}`}
          {...dropOnPool}
        >
          <div className="flex flex-wrap items-center gap-2">
            <label className="relative flex-1 min-w-[12rem]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setShown(PAGE);
                }}
                placeholder="Search DRep name or ID"
                className="w-full rounded-lg border border-slate-700 bg-slate-900 py-2 pl-9 pr-3 text-sm text-white placeholder:text-slate-500"
              />
            </label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200"
              aria-label="Sort DReps"
            >
              <option value="points">Most points last season</option>
              <option value="projection">Highest projection</option>
              <option value="form">Best form (last 3)</option>
              <option value="underdog">Biggest underdog multiplier</option>
              <option value="smallest">Smallest by ADA</option>
              <option value="drafted">Most drafted</option>
            </select>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" checked={activeOnly} onChange={(e) => setActiveOnly(e.target.checked)} />
              Voted last season
            </label>
            <div className="flex overflow-hidden rounded-lg border border-slate-700" role="group" aria-label="View">
              {(
                [
                  ['cards', LayoutGrid],
                  ['list', List],
                ] as const
              ).map(([v, Icon]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  aria-pressed={view === v}
                  aria-label={v === 'cards' ? 'Card view' : 'List view'}
                  className={`px-2.5 py-2 ${view === v ? 'bg-violet-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'}`}
                >
                  <Icon className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-slate-500">
            &quot;Last season&quot; is epochs {data.reference_window.start_epoch}–{data.reference_window.end_epoch}; multipliers
            are scaled against the DReps active then. {filtered.length.toLocaleString()} DReps shown.
          </p>

          {view === 'cards' && (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 2xl:grid-cols-4">
              {filtered.slice(0, shown).map((d) => {
                const isPicked = picked.includes(d.drep_id);
                return (
                  <div
                    key={d.drep_id}
                    {...(isPicked ? {} : dragFrom(PICK, d.drep_id))}
                    className={!locked && !isPicked ? 'cursor-grab active:cursor-grabbing' : undefined}
                    title={!locked && !isPicked ? 'Drag onto your team to pick' : undefined}
                  >
                  <TradingCard
                    variant="draft"
                    card={cardFor(d)}
                    lockedUnderdog={snapshot.get(d.drep_id)}
                    draftedBy={d.drafted_by}
                    selected={isPicked}
                    action={
                      <button
                        type="button"
                        disabled={locked || (!isPicked && full)}
                        onClick={() => toggle(d.drep_id)}
                        className={`w-full py-1.5 text-sm font-semibold disabled:opacity-40 ${
                          isPicked ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-violet-600 text-white hover:bg-violet-500'
                        }`}
                      >
                        {isPicked ? 'Remove' : 'Pick'}
                      </button>
                    }
                  />
                  </div>
                );
              })}
            </div>
          )}

          <ul className={view === 'list' ? 'space-y-2' : 'hidden'}>
            {(view === 'list' ? filtered.slice(0, shown) : []).map((d) => {
              const isPicked = picked.includes(d.drep_id);
              return (
                <li
                  key={d.drep_id}
                  {...(isPicked ? {} : dragFrom(PICK, d.drep_id))}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${!locked && !isPicked ? 'cursor-grab ' : ''}${
                    isPicked ? 'border-violet-600 bg-violet-950/40' : 'border-slate-800 bg-slate-900/60'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">
                      {displayName(d)} <MyDRepBadge drepId={d.drep_id} className="ml-1 align-middle" />
                    </p>
                    <p className="text-xs text-slate-400">
                      {d.last_points === null ? 'No votes last season' : `${d.last_points} pts last season`}
                      {cards.get(d.drep_id)?.projection != null && ` · proj ${cards.get(d.drep_id)?.projection}`} · {formatAda(d.ada)} ·{' '}
                      {d.delegators.toLocaleString()} delegators
                      {d.drafted_by > 0 && ` · drafted by ${d.drafted_by} team${d.drafted_by === 1 ? '' : 's'}`}
                    </p>
                  </div>
                  <UnderdogChip value={snapshot.get(d.drep_id) ?? d.underdog} />
                  <button
                    type="button"
                    disabled={locked || (!isPicked && full)}
                    onClick={() => toggle(d.drep_id)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-40 ${
                      isPicked ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-violet-600 text-white hover:bg-violet-500'
                    }`}
                  >
                    {isPicked ? 'Remove' : 'Pick'}
                  </button>
                </li>
              );
            })}
          </ul>
          {filtered.length > shown && (
            <button type="button" onClick={() => setShown((n) => n + PAGE)} className="text-sm text-violet-300 hover:text-violet-200">
              Show {Math.min(PAGE, filtered.length - shown)} more
            </button>
          )}
        </section>

        <aside className="order-1 lg:order-2" {...dropOnTeam}>
          <div
            className={`sticky top-20 space-y-3 rounded-2xl border bg-slate-900/80 p-4 transition-colors ${
              dropTarget === 'team' ? 'border-violet-400 bg-violet-950/60 shadow-lg shadow-violet-900/40' : 'border-slate-700'
            }`}
          >
            <p className="flex items-center gap-2 font-semibold text-white">
              {locked && <Lock className="h-4 w-4 text-amber-300" />} Your team ({picked.length}/{ROSTER_SIZE})
            </p>
            <input
              value={teamName}
              onChange={(e) => setTeamName(e.target.value.slice(0, 40))}
              disabled={locked}
              placeholder="Team name (optional)"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500"
            />
            <ol className="space-y-2">
              {Array.from({ length: ROSTER_SIZE }, (_, i) => {
                const id = picked[i];
                const d = id ? byId.get(id) : undefined;
                return (
                  <li
                    key={i}
                    {...(id ? dragFrom(UNPICK, id) : {})}
                    className={`flex items-center gap-2 rounded-lg bg-slate-800/60 px-2 py-1.5 text-sm ${id && !locked ? 'cursor-grab' : ''}`}
                    title={id && !locked ? 'Drag back to the pool to remove' : undefined}
                  >
                    <span className="w-4 text-slate-500">{i + 1}</span>
                    {id ? (
                      <>
                        <span className="min-w-0 flex-1 truncate text-slate-100">{d ? displayName(d) : id.slice(0, 14)}</span>
                        <UnderdogChip value={snapshot.get(id) ?? d?.underdog ?? 1} />
                        {!locked && (
                          <button type="button" onClick={() => toggle(id)} aria-label="Remove" className="text-slate-400 hover:text-white">
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </>
                    ) : (
                      <span className="flex items-center gap-1 text-slate-500">
                        <Plus className="h-3.5 w-3.5" /> Drag a card here, or tap Pick
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
            <label
              className="flex items-start gap-2 text-sm text-slate-200"
              title="The global game is the main leaderboard and the only one that wins Season Trophy NFTs. Your team still plays in any leagues you join either way."
            >
              <input
                type="checkbox"
                checked={inGlobal}
                onChange={(e) => setInGlobal(e.target.checked)}
                disabled={locked}
                className="mt-0.5 h-4 w-4 accent-violet-500"
              />
              <span>
                Compete in the global game
                <span className="block text-xs text-slate-400">Top 3 win Season Trophy NFTs. Leagues are separate.</span>
              </span>
            </label>
            {locked ? (
              <p className="text-sm text-amber-300">Rosters are locked for this season.</p>
            ) : !signedIn ? (
              <p className="text-sm text-slate-300">Connect your wallet (top right) to save your team. It only asks you to sign a message.</p>
            ) : (
              <button
                type="button"
                onClick={save}
                disabled={!full || saving || !dirty}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 py-2 font-semibold text-white hover:bg-violet-500 disabled:opacity-40"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {data.roster ? (dirty ? 'Save changes' : 'Saved') : 'Save team'}
              </button>
            )}
            {message && <p className={`text-sm ${message.kind === 'ok' ? 'text-emerald-300' : 'text-red-300'}`}>{message.text}</p>}
            <p className="text-[11px] text-slate-500">
              Free to play. Multipliers shown are what you&apos;d lock in now; DReps already on your saved team keep the
              multiplier they had when you picked them.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
