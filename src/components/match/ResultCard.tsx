'use client';

import { useState } from 'react';
import Image from 'next/image';
import { AlertTriangle, ExternalLink, MessageSquareQuote } from 'lucide-react';
import { formatAda, type MatchResult } from '@/lib/match/score';
import type { MatchDRep } from '@/lib/match/profiles';
import { getAvatarDataUri } from '@/lib/utils/avatar';
import { publicUrl } from '@/lib/utils/links';
import { rationaleHref } from '@/lib/rationale/href';
import { MyDRepBadge } from '@/components/auth/MyDRepBadge';

export function DRepAvatar({ drep }: { drep: MatchDRep }) {
  const [failed, setFailed] = useState(false);
  const label = drep.name ?? 'DRep';
  if (drep.image && !failed) {
    return (
      // DRep images come from arbitrary self-chosen hosts, which next/image would need allow-listed.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={drep.image}
        alt={`${label} profile photo`}
        width={56}
        height={56}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="w-14 h-14 rounded-full object-cover border-2 border-slate-600"
      />
    );
  }
  return <Image src={getAvatarDataUri(drep.drep_id)} alt={`${label} avatar`} width={56} height={56} className="rounded-full border-2 border-slate-600" />;
}

export function ResultCard({ result, rank, bonus }: { result: MatchResult; rank: number; /** Bonus from the visitor's weights (0.25 = +25%). */ bonus?: number }) {
  const [copied, setCopied] = useState(false);
  const name = result.drep.name ?? `${result.drep.drep_id.slice(0, 18)}…`;
  return (
    <div className="bg-slate-900/70 border border-slate-700 rounded-xl p-5">
      <div className="flex items-start gap-4">
        <DRepAvatar drep={result.drep} />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-lg font-semibold text-white truncate">
              #{rank} {name}
            </p>
            <p className="text-2xl font-bold text-violet-300 flex-shrink-0">{Math.round(result.matchPercent)}%</p>
          </div>
          <MyDRepBadge drepId={result.drep.drep_id} className="mt-1" />
          <p className="text-xs text-slate-500 font-mono truncate">{result.drep.drep_id}</p>
          <div className="flex flex-wrap gap-2 mt-2 text-xs">
            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
              {Math.round(result.drep.participation * 100)}% participation
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">{formatAda(result.drep.ada)} delegated</span>
            {result.earlyProfile && (
              <span className="px-2 py-0.5 rounded bg-amber-900/40 text-amber-300" title="Few votes so far; this match will firm up as they vote more.">
                Early profile · {result.drep.votes_cast} votes
              </span>
            )}
            {bonus !== undefined && bonus >= 0.005 && (
              <span className="px-2 py-0.5 rounded bg-emerald-900/40 text-emerald-300" title="From your Power, Charisma and Decentralization settings.">
                +{Math.round(bonus * 100)}% bonus from your settings
              </span>
            )}
          </div>
        </div>
      </div>

      <ul className="mt-4 space-y-1 text-sm">
        {result.reasons.map((r) => (
          <li key={r.text} className={r.kind === 'agree' ? 'text-slate-200' : 'text-slate-400'}>
            {r.kind === 'agree' ? '✓ ' : '≠ '}
            {r.text}
          </li>
        ))}
        {result.realVoteAgreement.compared > 0 && (
          <li className="text-slate-200">
            ✓ Voted with you on {result.realVoteAgreement.agreed} of {result.realVoteAgreement.compared} real proposals you rated.
          </li>
        )}
      </ul>

      {(result.statedHighlights.length > 0 || result.saysVsDoes.length > 0) && (
        <div className="mt-4 border-t border-slate-800 pt-3 space-y-2">
          <p className="text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1">
            <MessageSquareQuote size={12} /> In their own words · AI-summarized from their published statements
          </p>
          {result.statedPercent !== null && (
            <p className="text-sm text-slate-300">
              {Math.round(result.statedPercent)}% agreement with what they&apos;ve said, across {result.statedTopics} topics.
            </p>
          )}
          {result.statedHighlights.map(({ topicId, statement, stated }) => (
            <div key={topicId} className="text-sm">
              <p className="text-slate-400">
                “{statement.replace(/\.$/, '')}”: says <span className="text-slate-200 font-semibold">{stated.stance}/10</span>
                {stated.origin === 'pledge' ? ' (signed by the DRep)' : ''}
              </p>
              <blockquote className="border-l-2 border-slate-700 pl-3 text-slate-300 italic">
                “{stated.quote}”
                {stated.source_kind === 'rationale' && stated.proposal_id ? (
                  <a
                    href={rationaleHref(result.drep.drep_id, stated.proposal_id)}
                    className="not-italic text-xs text-violet-300 hover:text-violet-200 ml-2"
                  >
                    read vote rationale →
                  </a>
                ) : (
                  publicUrl(stated.source_url) && (
                    <a
                      href={publicUrl(stated.source_url) ?? undefined}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="not-italic text-xs text-violet-300 hover:text-violet-200 ml-2"
                    >
                      profile ↗
                    </a>
                  )
                )}
              </blockquote>
            </div>
          ))}
          {result.saysVsDoes.map((d) => (
            <p key={d.statement} className="text-sm text-amber-300 flex gap-2">
              <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
              <span>
                Says vs. does: says {d.says}/10 on “{d.statement.replace(/\.$/, '')}”, but {d.does}.
              </span>
            </p>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2 mt-4">
        <a
          href={`https://gov.tools/connected/drep_directory/${result.drep.drep_id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold py-2 px-3 rounded-lg"
        >
          Delegate via GovTool <ExternalLink size={14} />
        </a>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(result.drep.drep_id).then(() => setCopied(true)).catch(() => setCopied(false));
          }}
          className="text-sm py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200"
        >
          {copied ? 'Copied' : 'Copy DRep ID'}
        </button>
      </div>
    </div>
  );
}

