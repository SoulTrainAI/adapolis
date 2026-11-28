'use client';

/**
 * Shown on the draft page while a season is being played: the player's
 * locked team, and the one free replacement if a drafted DRep has retired.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import type { SwapState } from '@/lib/season/fantasy';
import { cardName } from '@/components/cards/TradingCard';
import { useCards } from '@/components/cards/useCards';
import { seasonLabel } from '@/lib/season/points';

export function LiveTeam() {
  const [state, setState] = useState<SwapState | null>(null);
  const [slot, setSlot] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [choice, setChoice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const { cards } = useCards();

  const load = useCallback(() => {
    fetch('/api/fantasy/swap')
      .then((r) => r.json() as Promise<{ state?: SwapState | null }>)
      .then((b) => setState(b.state ?? null))
      .catch(() => setState(null));
  }, []);
  useEffect(load, [load]);

  const byId = cards;
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || !state) return [];
    const taken = new Set(state.roster.picks.map((p) => p.drep_id));
    return Array.from(cards.values())
      .filter((c) => c.registered && !taken.has(c.drep_id) && (cardName(c).toLowerCase().includes(q) || c.drep_id.includes(q)))
      .slice(0, 8);
  }, [cards, query, state]);

  if (!state) return null;
  const canSwap = !state.roster.swap_used && state.retired_slots.length > 0;

  const swap = async () => {
    if (slot === null || !choice) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch('/api/fantasy/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slot, drep_id: choice }),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      setMessage({ kind: 'ok', text: 'Replacement saved. They score from this epoch on.' });
      setSlot(null);
      setChoice(null);
      setQuery('');
      load();
    } catch (e) {
      setMessage({ kind: 'error', text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3 rounded-xl border border-emerald-700/50 bg-emerald-950/20 p-4 text-sm text-slate-200">
      <p className="font-semibold text-white">
        {seasonLabel(state.season.season_number)} is live. Your team is locked:
      </p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {state.roster.picks.map((p) => {
          const retired = state.retired_slots.includes(p.slot);
          const c = byId.get(p.drep_id);
          return (
            <li
              key={p.slot}
              className={`rounded-full border px-3 py-1 ${retired ? 'border-rose-600 text-rose-200' : 'border-slate-700'}`}
              title={retired ? 'Retired (deregistered): no longer earning points.' : p.swapped_from ? 'Replacement for a retired DRep.' : undefined}
            >
              {c ? cardName(c) : p.drep_id.slice(0, 14)}
              {retired && ' · retired'}
              {p.swapped_from && ' · replacement'}
            </li>
          );
        })}
      </ul>
      {canSwap && (
        <div className="mt-3 space-y-2">
          <p>
            A DRep on your team has retired. You have <strong>one free replacement</strong> this season. Points they already
            earned stay on your team; the replacement scores from now on.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={slot ?? ''}
              onChange={(e) => setSlot(e.target.value ? Number(e.target.value) : null)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5"
            >
              <option value="">Replace…</option>
              {state.retired_slots.map((s) => {
                const p = state.roster.picks.find((x) => x.slot === s)!;
                const c = byId.get(p.drep_id);
                return (
                  <option key={s} value={s}>
                    {c ? cardName(c) : p.drep_id.slice(0, 14)}
                  </option>
                );
              })}
            </select>
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setChoice(null);
              }}
              placeholder="Search a replacement"
              className="min-w-[12rem] flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5"
            />
            <button
              type="button"
              onClick={swap}
              disabled={busy || slot === null || !choice}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 font-semibold text-white hover:bg-emerald-500 disabled:opacity-40"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Replace
            </button>
          </div>
          {matches.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {matches.map((c) => (
                <li key={c.drep_id}>
                  <button
                    type="button"
                    onClick={() => setChoice(c.drep_id)}
                    className={`rounded-full border px-3 py-1 ${choice === c.drep_id ? 'border-emerald-400 bg-emerald-900/40 text-white' : 'border-slate-700 hover:border-slate-500'}`}
                  >
                    {cardName(c)}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {state.roster.swap_used && <p className="mt-2 text-xs text-slate-400">Replacement used this season.</p>}
      {message && <p className={`mt-2 ${message.kind === 'ok' ? 'text-emerald-300' : 'text-red-300'}`}>{message.text}</p>}
    </div>
  );
}
