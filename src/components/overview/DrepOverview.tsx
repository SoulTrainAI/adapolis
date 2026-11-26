'use client';

import { useCallback, useEffect, useState } from 'react';
import { Flag, MessageSquareReply, ScrollText } from 'lucide-react';
import type { OverviewRecord, OverviewQuoteItem } from '@/lib/overview/types';
import { rationaleHref } from '@/lib/rationale/href';
import { openGetStarted } from '@/components/auth/GetStartedGuide';

function Fact({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2" title={hint}>
      <p className="text-[11px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className="font-display text-lg font-bold text-white">{value}</p>
    </div>
  );
}

export function DrepOverview({ drepId }: { drepId: string }) {
  const [data, setData] = useState<{ overview: OverviewRecord | null; is_this_drep: boolean } | null>(null);
  const [mode, setMode] = useState<'none' | 'report' | 'reply'>('none');
  const [text, setText] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(() => {
    fetch(`/api/dreps/${drepId}/overview`)
      .then((r) => r.json() as Promise<{ overview: OverviewRecord | null; is_this_drep: boolean }>)
      .then(setData)
      .catch(() => setData({ overview: null, is_this_drep: false }));
  }, [drepId]);
  useEffect(load, [load]);

  async function submit() {
    setMsg(null);
    const res = await fetch(`/api/dreps/${drepId}/overview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mode === 'reply' ? { reply: text } : { report: text }),
    });
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    if (res.status === 401) return openGetStarted();
    if (!res.ok) return setMsg({ ok: false, text: body.error ?? `HTTP ${res.status}` });
    setMsg({ ok: true, text: mode === 'reply' ? 'Your response is published.' : 'Thanks. We review every report; valid ones trigger a rewrite.' });
    setMode('none');
    setText('');
    load();
  }

  if (!data) return null;
  const rec = data.overview;
  const o = rec?.overview;
  const sourceHref = (i: OverviewQuoteItem) => {
    const s = rec?.sources.find((x) => x.index === i.source_index);
    if (!s) return null;
    return s.kind === 'rationale' && s.proposal_id ? rationaleHref(drepId, s.proposal_id) : null;
  };
  const quoteList = (title: string, items: OverviewQuoteItem[]) =>
    items.length > 0 && (
      <div className="space-y-2">
        <h3 className="font-semibold text-white">{title}</h3>
        <ul className="space-y-3">
          {items.map((i) => (
            <li key={i.label}>
              <p className="text-sm font-semibold text-slate-100">{i.label}</p>
              <blockquote className="mt-0.5 border-l-2 border-slate-600 pl-3 text-sm text-slate-300">
                “{i.quote}”{' '}
                {sourceHref(i) ? (
                  <a href={sourceHref(i)!} className="whitespace-nowrap text-xs text-violet-300 hover:text-violet-200">
                    source →
                  </a>
                ) : (
                  <span className="text-xs text-slate-500">(their DRep profile)</span>
                )}
              </blockquote>
            </li>
          ))}
        </ul>
      </div>
    );

  const split = o?.facts.split;
  const total = split ? split.yes + split.no + split.abstain : 0;

  return (
    <section className="mt-10 space-y-5 rounded-2xl border border-slate-800 bg-slate-950/40 p-4 sm:p-6" aria-labelledby="drep-overview">
      <header className="flex flex-wrap items-center gap-2">
        <h2 id="drep-overview" className="flex items-center gap-2 text-2xl font-bold text-white">
          <ScrollText className="h-6 w-6 text-brand-gold" aria-hidden /> DRep Overview
        </h2>
        {rec && (
          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
            AI-assisted · {new Date(rec.generated_at).toLocaleDateString()} · refreshed each season
          </span>
        )}
      </header>

      {!o ? (
        <p className="text-slate-400">No overview yet. Overviews are written for DReps with at least 3 votes, a few each day.</p>
      ) : (
        <>
          {o.headline && <p className="text-lg text-slate-100">{o.headline}</p>}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            <Fact label="Votes cast" value={`${o.facts.votes_cast}`} hint={`Out of ${o.facts.votes_eligible} actions they could vote on`} />
            <Fact label="Participation" value={o.facts.participation_pct !== null ? `${o.facts.participation_pct}%` : '—'} />
            <Fact label="Explains votes" value={o.facts.explained_pct !== null ? `${o.facts.explained_pct}%` : '—'} hint="Share of votes with a published rationale" />
            <Fact label="Votes early" value={o.facts.early_pct !== null ? `${o.facts.early_pct}%` : '—'} hint="Votes in the first half of the voting window" />
            <Fact label="Missed" value={`${o.facts.missed}`} hint="Actions that closed while they were registered and hadn't voted" />
            <Fact label="Time as DRep" value={`~${Math.round((o.facts.tenure_epochs * 5) / 30)} mo`} hint={`${o.facts.tenure_epochs} epochs`} />
          </div>
          {split && total > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-slate-400">
                How they vote: Yes {Math.round((split.yes / total) * 100)}% · No {Math.round((split.no / total) * 100)}% · Abstain {Math.round((split.abstain / total) * 100)}%
              </p>
              <div className="flex h-2 overflow-hidden rounded-full bg-slate-800" aria-hidden>
                <div className="bg-emerald-500" style={{ width: `${(split.yes / total) * 100}%` }} />
                <div className="bg-rose-500" style={{ width: `${(split.no / total) * 100}%` }} />
                <div className="bg-slate-400" style={{ width: `${(split.abstain / total) * 100}%` }} />
              </div>
            </div>
          )}
          <div className="grid gap-6 md:grid-cols-2 [&>*]:min-w-0">
            {quoteList('Core values, in their words', o.values)}
            {quoteList('Stated affiliations', o.affiliations)}
          </div>
          {o.values.length === 0 && <p className="text-sm text-slate-400">This DRep hasn&apos;t published enough of their own words for a values summary yet.</p>}
        </>
      )}

      {rec?.reply && (
        <div className="rounded-xl border border-sky-800/60 bg-sky-950/30 p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-sky-300">
            <MessageSquareReply className="h-4 w-4" aria-hidden /> The DRep responds
          </p>
          <p className="mt-1 whitespace-pre-line text-sm text-slate-200">{rec.reply.response}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setMode(mode === 'report' ? 'none' : 'report')} className="flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-700 px-3 text-sm text-slate-300 hover:bg-slate-800">
          <Flag className="h-4 w-4" aria-hidden /> Report an error
        </button>
        {data.is_this_drep && (
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'reply' ? 'none' : 'reply');
              setText(rec?.reply?.response ?? '');
            }}
            className="flex min-h-[44px] items-center gap-2 rounded-lg bg-sky-700 px-3 text-sm font-semibold text-white hover:bg-sky-600"
          >
            <MessageSquareReply className="h-4 w-4" aria-hidden /> {rec?.reply ? 'Edit your response' : 'Respond to this overview'}
          </button>
        )}
      </div>
      {mode !== 'none' && (
        <div className="space-y-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 1500))}
            rows={4}
            placeholder={mode === 'reply' ? 'Your response, shown under the overview (leave empty to remove it).' : 'What’s wrong? Point to the quote or fact and what it should say.'}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm text-white placeholder:text-slate-500"
          />
          <button type="button" onClick={() => void submit()} className="min-h-[44px] rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white hover:bg-violet-500">
            {mode === 'reply' ? 'Publish response' : 'Send report'}
          </button>
        </div>
      )}
      {msg && <p className={`text-sm ${msg.ok ? 'text-emerald-300' : 'text-rose-300'}`}>{msg.text}</p>}
      <p className="text-xs text-slate-500">
        Facts come straight from the chain. Values and affiliations are picked by AI from the DRep&apos;s own published words, and every quote is checked
        word for word against its source. The overview never affects scores or the game.
      </p>
    </section>
  );
}
