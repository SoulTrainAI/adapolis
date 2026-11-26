import type { Metadata } from 'next';
import Link from 'next/link';
import { format } from 'date-fns';
import { ExternalLink } from 'lucide-react';
import { loadRationale, type Rationale } from '@/lib/rationale/load';
import { MyDRepBadge } from '@/components/auth/MyDRepBadge';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Vote rationale — ADApolis',
  description: "A DRep's published reasons for a governance vote, in their own words.",
};

const ID = /^(drep1|gov_action1)[02-9ac-hj-np-z]{20,100}$/;

const VOTE_STYLE: Record<Rationale['vote'], string> = {
  Yes: 'bg-emerald-900/50 text-emerald-200 border-emerald-700',
  No: 'bg-red-900/50 text-red-200 border-red-700',
  Abstain: 'bg-slate-800 text-slate-200 border-slate-600',
};

export default async function RationalePage({ searchParams }: { searchParams: { drep?: string; proposal?: string } }) {
  const drep = searchParams.drep ?? '';
  const proposal = searchParams.proposal ?? '';
  const valid = ID.test(drep) && drep.startsWith('drep1') && ID.test(proposal) && proposal.startsWith('gov_action1');

  let r: Rationale | null = null;
  let failed = false;
  if (valid) {
    try {
      r = await loadRationale(drep, proposal);
    } catch (error) {
      failed = true;
      console.error(JSON.stringify({ event: 'rationale_load_failed', drep, proposal, error: error instanceof Error ? error.message : String(error) }));
    }
  }

  return (
    <div className="min-h-screen bg-brand-navy text-white py-12 px-4 sm:px-6 lg:px-8">
      <article className="max-w-2xl mx-auto space-y-6">
        {!valid ? (
          <p className="text-slate-300">This link is missing a DRep or proposal ID.</p>
        ) : failed ? (
          <p className="text-red-300">Couldn&apos;t load this rationale right now; Koios may be busy. Try again in a minute.</p>
        ) : !r ? (
          <p className="text-slate-300">This DRep didn&apos;t publish a rationale for this vote.</p>
        ) : (
          <>
            <header className="space-y-3">
              <p className="text-xs uppercase tracking-wider text-violet-300">Vote rationale · in their own words</p>
              <h1 className="text-3xl font-bold leading-tight">{r.drep_name ?? `${r.drep_id.slice(0, 16)}…`}</h1>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className={`rounded-full border px-3 py-0.5 font-semibold ${VOTE_STYLE[r.vote]}`}>Voted {r.vote}</span>
                <MyDRepBadge drepId={r.drep_id} />
                <span className="text-slate-400">{format(new Date(r.voted_at), 'PP')}</span>
              </div>
              <p className="text-slate-300">
                on{' '}
                <a
                  href={`https://gov.tools/governance_actions/${r.proposal_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-violet-300 hover:text-violet-200"
                >
                  {r.proposal_title ?? 'this governance action'} ↗
                </a>
              </p>
            </header>

            {r.hash_matches === false && (
              <p role="note" className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
                This document doesn&apos;t match the fingerprint recorded with the vote on-chain, so it may have been
                changed after the vote. Compare with the original below.
              </p>
            )}

            {!r.readable ? (
              <p className="text-slate-300">
                This DRep attached a rationale to this vote, but the document couldn&apos;t be loaded right now (it may be
                on a slow IPFS host). Try again in a few minutes, or open the original document below.
              </p>
            ) : r.sections.length === 0 ? (
              <p className="text-slate-400">The rationale document has no readable text.</p>
            ) : (
              r.sections.map((s) => (
                <section key={s.heading} className="space-y-2">
                  <h2 className="text-lg font-semibold text-slate-100">{s.heading}</h2>
                  <p className="whitespace-pre-line leading-relaxed text-slate-300">{s.text}</p>
                </section>
              ))
            )}

            {r.references.length > 0 && (
              <section className="space-y-2">
                <h2 className="text-lg font-semibold text-slate-100">References</h2>
                <ul className="grid gap-1 sm:grid-cols-2">
                  {r.references.map((ref) => (
                    <li key={ref.url} className="min-w-0">
                      <a href={ref.url} target="_blank" rel="noopener noreferrer nofollow" className="block truncate text-sm text-violet-300 hover:text-violet-200">
                        {ref.label} ↗
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <footer className="border-t border-slate-800 pt-4 text-xs text-slate-500 space-y-1">
              <p>
                Read from the document anchored to this vote on-chain (via Koios). The text is the DRep&apos;s own; ADApolis
                only formats it.
              </p>
              {r.source_url && (
                <a href={r.source_url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-200">
                  Original document <ExternalLink size={12} />
                </a>
              )}
              <p>
                <Link href="/hot-topics" className="text-violet-300 hover:text-violet-200">
                  ← Hot Topics
                </Link>
              </p>
            </footer>
          </>
        )}
      </article>
    </div>
  );
}
