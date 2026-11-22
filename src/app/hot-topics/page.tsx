import type { Metadata } from 'next';
import { ExternalLink } from 'lucide-react';
import { getHotTopics, type HotTopic, type Tally, type VocalDRep } from '@/lib/hot-topics/data';
import { ArgumentsPanel, toArgument } from '@/components/governance/ArgumentsPanel';
import { MyDRepBadge } from '@/components/auth/MyDRepBadge';
import { formatAda } from '@/lib/match/score';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Hot Topics — ADApolis',
  description:
    'Cardano governance actions open for voting now: how DReps are splitting, who has explained their vote, and the arguments on each side.',
};

const ACTION_LABELS: Record<string, string> = {
  TreasuryWithdrawals: 'Treasury withdrawal',
  ParameterChange: 'Parameter change',
  HardForkInitiation: 'Hard fork',
  NewConstitution: 'Constitution',
  NewCommittee: 'Committee',
  NoConfidence: 'No confidence',
  InfoAction: 'Info action',
};

function SplitBar({ label, values, format }: { label: string; values: Tally['count']; format: (n: number) => string }) {
  const total = values.yes + values.no + values.abstain;
  const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-400 mb-1">
        <span>{label}</span>
        <span>
          <span className="text-emerald-300">Yes {format(values.yes)}</span> ·{' '}
          <span className="text-red-300">No {format(values.no)}</span> ·{' '}
          <span className="text-slate-400">Abstain {format(values.abstain)}</span>
        </span>
      </div>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-slate-800">
        <div className="bg-emerald-500" style={{ width: `${pct(values.yes)}%` }} />
        <div className="bg-red-500" style={{ width: `${pct(values.no)}%` }} />
        <div className="bg-slate-500" style={{ width: `${pct(values.abstain)}%` }} />
      </div>
    </div>
  );
}

function VocalList({ title, dreps, tone }: { title: string; dreps: VocalDRep[]; tone: string }) {
  return (
    <div>
      <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${tone}`}>{title}</p>
      {dreps.length === 0 ? (
        <p className="text-sm text-slate-500">No published rationales yet.</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {dreps.map((d) => (
            <li key={d.drep_id} className="flex flex-wrap items-center gap-x-2 text-slate-300">
              <span className="truncate max-w-[14rem]">{d.name ?? `${d.drep_id.slice(0, 14)}…`}</span>
              <MyDRepBadge drepId={d.drep_id} />
              <span className="text-xs text-slate-500">{formatAda(d.ada)}</span>
              {d.rationale_url && (
                <a
                  href={d.rationale_url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="text-xs text-violet-300 hover:text-violet-200"
                >
                  rationale ↗
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TopicCard({ t, currentEpoch }: { t: HotTopic; currentEpoch: number }) {
  const left = t.voting_ends_epoch !== null ? t.voting_ends_epoch - currentEpoch : null;
  return (
    <article className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-5">
      <div>
        <div className="flex flex-wrap items-center gap-2 text-xs mb-2">
          <span className="rounded-full bg-violet-900/50 text-violet-200 px-2 py-0.5">
            {ACTION_LABELS[t.action_type] ?? t.action_type}
          </span>
          {left !== null && (
            <span className="text-slate-400">
              {left <= 0 ? 'Voting closes this epoch' : `Voting closes in ${left} epoch${left === 1 ? '' : 's'} (~${left * 5} days)`}
            </span>
          )}
          <span className="text-slate-500">
            {t.recent_votes} votes in the last 10 days · {t.rationales} rationales
          </span>
        </div>
        <h2 className="text-2xl font-bold text-white leading-tight">{t.title}</h2>
        {t.abstract && <p className="text-sm text-slate-400 mt-2">{t.abstract}</p>}
        <a
          href={`https://gov.tools/governance_actions/${t.proposal_id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-violet-300 hover:text-violet-200 mt-2"
        >
          Read the full proposal <ExternalLink size={12} />
        </a>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-slate-200">DRep votes so far</p>
        <SplitBar label="DReps" values={t.tally.count} format={(n) => String(n)} />
        <SplitBar label="Voting power (current delegation)" values={t.tally.ada} format={(n) => formatAda(n)} />
      </div>

      {t.arguments && (
        <div className="border-t border-slate-800 pt-4">
          <ArgumentsPanel
            argsFor={t.arguments.for.map(toArgument)}
            argsAgainst={t.arguments.against.map(toArgument)}
            footnote={`AI-summarized from ${t.arguments.for_sources} Yes and ${t.arguments.against_sources} No rationales. Quotes are the DReps' exact words.`}
          />
        </div>
      )}

      <div className="border-t border-slate-800 pt-4 grid sm:grid-cols-2 gap-4">
        <VocalList title="Explained a Yes vote" dreps={t.vocal.yes} tone="text-emerald-300" />
        <VocalList title="Explained a No vote" dreps={t.vocal.no} tone="text-red-300" />
      </div>
    </article>
  );
}

export default async function HotTopicsPage() {
  let data: Awaited<ReturnType<typeof getHotTopics>> | null = null;
  try {
    data = await getHotTopics();
  } catch (error) {
    console.error(JSON.stringify({ event: 'hot_topics_failed', error: error instanceof Error ? error.message : String(error) }));
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-wider text-violet-300">Open for voting now</p>
        <h1 className="text-4xl font-bold text-white">Hot Topics</h1>
        <p className="text-slate-300">
          Governance actions DReps are voting on right now, most active first. See how DReps are splitting, who has
          published reasons for their vote, and the main arguments on each side, with links to their own words.
        </p>
        <p className="text-xs text-slate-500">
          Based only on on-chain votes and DRep-published rationales. Voting power uses each DRep&apos;s current
          delegation, which can differ from the stake counted at ratification.
        </p>
      </header>

      {!data ? (
        <p className="text-red-300">Couldn&apos;t load hot topics right now. Koios or Supabase may be unreachable; try again in a minute.</p>
      ) : data.topics.length === 0 ? (
        <p className="text-slate-300">No governance actions are open for voting right now.</p>
      ) : (
        data.topics.map((t) => <TopicCard key={t.proposal_id} t={t} currentEpoch={data.current_epoch} />)
      )}
    </div>
  );
}
