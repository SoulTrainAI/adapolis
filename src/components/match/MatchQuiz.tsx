'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AlertTriangle, ExternalLink, MessageSquareQuote, RotateCcw, ShieldCheck, Sparkles } from 'lucide-react';
import { TOPICS, IMPORTANCE_LEVELS, MATCH_RULES, type Topic } from '@/lib/match/topics';
import { scoreMatches, formatAda, type Answers, type MatchResult, type RankMode } from '@/lib/match/score';
import type { MatchData, RealVoteQuestion } from '@/lib/match/profiles';
import { getAvatarDataUri } from '@/lib/utils/avatar';

type Step =
  | { kind: 'intro' }
  | { kind: 'topic'; topic: Topic }
  | { kind: 'real'; question: RealVoteQuestion; index: number }
  | { kind: 'deeper-offer' }
  | { kind: 'results' };

const CORE_TOPICS = TOPICS.filter((t) => t.group !== 'deeper');
const DEEPER_TOPICS = TOPICS.filter((t) => t.group === 'deeper');

// Literal class strings so Tailwind keeps them: red = disagree, green = agree.
const SCALE_IDLE = [
  'bg-red-800/80', 'bg-red-800/60', 'bg-red-800/45', 'bg-red-800/30', 'bg-red-900/20',
  'bg-emerald-900/20', 'bg-emerald-800/30', 'bg-emerald-800/45', 'bg-emerald-800/60', 'bg-emerald-800/80',
];
const SCALE_SELECTED = [
  'bg-red-600 text-white', 'bg-red-600 text-white', 'bg-red-500 text-white', 'bg-red-500 text-white', 'bg-rose-300 text-slate-900',
  'bg-emerald-300 text-slate-900', 'bg-emerald-500 text-white', 'bg-emerald-500 text-white', 'bg-emerald-600 text-white', 'bg-emerald-600 text-white',
];

function AgreeScale({ value, onChange, left, right }: { value: number; onChange: (v: number) => void; left: string; right: string }) {
  return (
    <div>
      <div className="grid grid-cols-10 gap-1">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            aria-pressed={value === n}
            aria-label={`${n} of 10`}
            className={`py-3 rounded-md text-sm font-semibold transition-all ${
              value === n
                ? `${SCALE_SELECTED[n - 1]} ring-2 ring-white scale-105`
                : `${SCALE_IDLE[n - 1]} text-slate-100 hover:brightness-150`
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-xs font-medium mt-2">
        <span className="text-red-300">← {left}</span>
        <span className="text-emerald-300">{right} →</span>
      </div>
    </div>
  );
}

interface Argument {
  text: string;
  url?: string | null;
}

function ArgumentsPanel({ argsFor, argsAgainst, footnote }: { argsFor: Argument[]; argsAgainst: Argument[]; footnote?: string }) {
  const column = (title: string, items: Argument[], tone: string, empty: string) => (
    <div>
      <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${tone}`}>{title}</p>
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">{empty}</p>
      ) : (
        <ul className="list-disc pl-4 space-y-1.5 text-sm text-slate-300">
          {items.map((a) => (
            <li key={a.text}>
              {a.text}
              {a.url && (
                <a href={a.url} target="_blank" rel="noopener noreferrer nofollow" className="ml-1 text-xs text-violet-300 hover:text-violet-200">
                  source ↗
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
  return (
    <div>
      <div className="grid sm:grid-cols-2 gap-4">
        {column('Arguments for', argsFor, 'text-emerald-300', 'No published arguments yet.')}
        {column('Arguments against', argsAgainst, 'text-red-300', 'No published arguments yet.')}
      </div>
      {footnote && <p className="text-[11px] text-slate-500 mt-3">{footnote}</p>}
    </div>
  );
}

function DRepAvatar({ result }: { result: MatchResult }) {
  const [failed, setFailed] = useState(false);
  const label = result.drep.name ?? 'DRep';
  if (result.drep.image && !failed) {
    return (
      // DRep images come from arbitrary self-chosen hosts, which next/image would need allow-listed.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={result.drep.image}
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
  return <Image src={getAvatarDataUri(result.drep.drep_id)} alt={`${label} avatar`} width={56} height={56} className="rounded-full border-2 border-slate-600" />;
}

function ResultCard({ result, rank }: { result: MatchResult; rank: number }) {
  const [copied, setCopied] = useState(false);
  const name = result.drep.name ?? `${result.drep.drep_id.slice(0, 18)}…`;
  return (
    <div className="bg-slate-900/70 border border-slate-700 rounded-xl p-5">
      <div className="flex items-start gap-4">
        <DRepAvatar result={result} />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-lg font-semibold text-white truncate">
              #{rank} {name}
            </p>
            <p className="text-2xl font-bold text-violet-300 flex-shrink-0">{Math.round(result.matchPercent)}%</p>
          </div>
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
            {result.boost >= 0.5 && (
              <span className="px-2 py-0.5 rounded bg-emerald-900/40 text-emerald-300" title="Smaller DReps get a ranking boost to spread voting power.">
                +{result.boost.toFixed(1)} decentralization boost
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
                {stated.source_url && (
                  <a
                    href={stated.source_url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="not-italic text-xs text-violet-300 hover:text-violet-200 ml-2"
                  >
                    {stated.source_kind === 'rationale' ? 'vote rationale' : 'profile'} ↗
                  </a>
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

export function MatchQuiz() {
  const [data, setData] = useState<MatchData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Answers>({ topics: {}, realVotes: {} });
  const [includeDeeper, setIncludeDeeper] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const [rankMode, setRankMode] = useState<RankMode>('votes');

  useEffect(() => {
    fetch('/api/match')
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? 'Failed to load');
        setData(body as MatchData);
      })
      .catch((e: unknown) => setLoadError(e instanceof Error ? e.message : 'Failed to load matching data.'));
  }, []);

  const steps: Step[] = useMemo(() => {
    const list: Step[] = [{ kind: 'intro' }];
    for (const topic of CORE_TOPICS) list.push({ kind: 'topic', topic });
    (data?.real_votes ?? []).forEach((question, index) => list.push({ kind: 'real', question, index }));
    list.push({ kind: 'deeper-offer' });
    if (includeDeeper) for (const topic of DEEPER_TOPICS) list.push({ kind: 'topic', topic });
    list.push({ kind: 'results' });
    return list;
  }, [data, includeDeeper]);

  const step = steps[Math.min(stepIndex, steps.length - 1)];
  const questionSteps = steps.filter((s) => s.kind === 'topic' || s.kind === 'real');
  const answeredPosition = steps.slice(0, stepIndex + 1).filter((s) => s.kind === 'topic' || s.kind === 'real').length;
  const next = () => setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  const back = () => setStepIndex((i) => Math.max(i - 1, 0));

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [stepIndex]);

  const results = useMemo(
    () => (data && step.kind === 'results' ? scoreMatches(data.dreps, data.real_votes, answers, rankMode) : []),
    [data, answers, step.kind, rankMode]
  );
  const drepsWithStatements = data ? data.dreps.filter((d) => Object.keys(d.stated).length > 0).length : 0;
  const statedAnswered = TOPICS.filter((t) => t.source === 'stated' && (answers.topics[t.id]?.importance ?? 0) > 0);

  if (loadError) {
    return <p className="text-red-300 text-center py-12">{loadError}</p>;
  }

  return (
    <div className="max-w-2xl mx-auto">
      {step.kind !== 'intro' && step.kind !== 'results' && step.kind !== 'deeper-offer' && (
        <div className="mb-6">
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-violet-500 transition-all"
              style={{ width: `${(answeredPosition / Math.max(1, questionSteps.length)) * 100}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Question {answeredPosition} of {questionSteps.length}
          </p>
        </div>
      )}

      {step.kind === 'intro' && (
        <div className="text-center space-y-5">
          <h1 className="text-4xl sm:text-5xl font-bold text-white">Find My DRep</h1>
          <p className="text-lg text-slate-300">
            Answer a few questions about the Cardano you want. We compare your answers with how DReps have actually voted
            on-chain, and show you who matches best and why.
          </p>
          <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-4 text-left text-sm text-slate-300 space-y-2">
            <p className="flex gap-2">
              <ShieldCheck size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
              Your answers stay in your browser. Nothing is sent or stored.
            </p>
            <p className="flex gap-2">
              <Sparkles size={16} className="text-violet-300 flex-shrink-0 mt-0.5" />
              No right answers. For each statement, say how much you agree and how much it matters to you.
            </p>
          </div>
          <button
            type="button"
            disabled={!data}
            onClick={next}
            className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-semibold py-3 px-8 rounded-lg"
          >
            {data ? 'Start (about 2 minutes)' : 'Loading DRep voting records…'}
          </button>
          {data && (
            <p className="text-xs text-slate-500">
              Matching against {data.eligible_count} active DReps as of epoch {data.epoch}.
            </p>
          )}
        </div>
      )}

      {step.kind === 'topic' && (
        <TopicQuestion
          topic={step.topic}
          answer={answers.topics[step.topic.id] ?? { agree: 5, importance: 2 }}
          onChange={(a) => setAnswers((prev) => ({ ...prev, topics: { ...prev.topics, [step.topic.id]: a } }))}
        />
      )}

      {step.kind === 'real' && (
        <div className="space-y-5">
          <p className="text-xs uppercase tracking-wider text-violet-300">Real proposal · DReps split on this one</p>
          <h2 className="text-3xl font-bold text-white leading-tight">{step.question.title}</h2>
          <div>
            <p className="text-slate-200 font-medium mb-3">Do you agree or disagree that this should pass?</p>
            <AgreeScale
              value={answers.realVotes[step.question.proposal_id] ?? 0}
              onChange={(v) =>
                setAnswers((prev) => ({ ...prev, realVotes: { ...prev.realVotes, [step.question.proposal_id]: v } }))
              }
              left="Should fail"
              right="Should pass"
            />
          </div>
          <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-4 space-y-4">
            <div>
              <p className="text-xs text-slate-500 mb-1">Proposer&apos;s summary</p>
              <p className="text-sm text-slate-300">{step.question.summary}</p>
              <a
                href={`https://gov.tools/governance_actions/${step.question.proposal_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-violet-300 hover:text-violet-200 mt-2"
              >
                Read the full proposal <ExternalLink size={12} />
              </a>
            </div>
            {step.question.arguments && (
              <div className="border-t border-slate-800 pt-4">
                <ArgumentsPanel
                  argsFor={step.question.arguments.for}
                  argsAgainst={step.question.arguments.against}
                  footnote={`AI-summarized from the published rationales of DReps who voted Yes (${step.question.arguments.for_sources}) and No (${step.question.arguments.against_sources}). Each point links to a rationale it came from.`}
                />
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setAnswers((prev) => {
                const realVotes = { ...prev.realVotes };
                delete realVotes[step.question.proposal_id];
                return { ...prev, realVotes };
              });
              next();
            }}
            className="text-sm text-slate-400 hover:text-slate-200 underline underline-offset-2"
          >
            Skip, I&apos;m not sure
          </button>
        </div>
      )}

      {step.kind === 'deeper-offer' && (
        <div className="text-center space-y-5">
          <h2 className="text-3xl font-bold text-white">Go deeper?</h2>
          <p className="text-slate-300">
            {DEEPER_TOPICS.length} more topics: the constitution, staking rewards, fees, treasury investing, project
            accountability, DRep pay and institutions. Some aren&apos;t measurable from votes yet, but they&apos;ll count
            once DReps publish their positions.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={() => {
                setIncludeDeeper(true);
                next();
              }}
              className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-semibold py-3 px-6 rounded-lg"
            >
              Yes, add {DEEPER_TOPICS.length} questions
            </button>
            <button
              type="button"
              onClick={() => {
                setIncludeDeeper(false);
                setStepIndex(steps.length - 1);
              }}
              className="bg-violet-600 hover:bg-violet-700 text-white font-semibold py-3 px-6 rounded-lg"
            >
              Show my matches
            </button>
          </div>
        </div>
      )}

      {step.kind === 'results' && data && (
        <div className="space-y-5">
          <h2 className="text-3xl font-bold text-white">Your best-matched DReps</h2>
          <p className="text-sm text-slate-400">
            Match % compares your answers with each DRep&apos;s on-chain voting record, weighted by how much each topic
            matters to you. Smaller DReps get up to +{MATCH_RULES.maxDecentralizationBoost} points in the ranking to help
            spread voting power. <Link href="/methodology#find-my-drep" className="text-violet-300 hover:text-violet-200">How matching works</Link>
          </p>
          {drepsWithStatements > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-slate-400">Rank by:</span>
              {(
                [
                  ['votes', 'How they vote'],
                  ['statements', 'What they say'],
                ] as const
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    setRankMode(mode);
                    setShowAll(false);
                  }}
                  aria-pressed={rankMode === mode}
                  className={`px-3 py-1.5 rounded-md ${rankMode === mode ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                >
                  {label}
                </button>
              ))}
              {rankMode === 'statements' && (
                <span className="text-xs text-slate-500 w-full">
                  Ranked by agreement with AI summaries of DReps&apos; own published words ({drepsWithStatements} DReps have
                  statements on file). Match % still shows their voting record.
                </span>
              )}
            </div>
          )}
          {results.length === 0 ? (
            <p className="text-slate-300">
              {rankMode === 'statements'
                ? 'No DRep has published statements on at least two of the topics you marked as important. Try "How they vote".'
                : 'We couldn\'t compute matches. Try marking at least one topic as mattering to you.'}
            </p>
          ) : (
            (showAll ? results.slice(0, 10) : results.slice(0, 3)).map((r, i) => (
              <ResultCard key={r.drep.drep_id} result={r} rank={i + 1} />
            ))
          )}
          {!showAll && results.length > 3 && (
            <button type="button" onClick={() => setShowAll(true)} className="text-sm text-violet-300 hover:text-violet-200">
              Show 7 more matches
            </button>
          )}
          {statedAnswered.length > 0 && rankMode === 'votes' && (
            <p className="text-xs text-slate-500 border-t border-slate-800 pt-4">
              {statedAnswered.length} of your answers (
              {statedAnswered.map((t) => t.statement.replace(/\.$/, '').toLowerCase()).join('; ')}) are on topics DReps
              haven&apos;t voted on, so they don&apos;t affect this ranking.{' '}
              {drepsWithStatements > 0
                ? 'Switch to "What they say" to match on them using DReps\' published statements.'
                : 'They will count once DRep statements are summarized.'}
            </p>
          )}
          <button
            type="button"
            onClick={() => {
              setAnswers({ topics: {}, realVotes: {} });
              setIncludeDeeper(false);
              setShowAll(false);
              setRankMode('votes');
              setStepIndex(0);
            }}
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200"
          >
            <RotateCcw size={14} /> Start over
          </button>
        </div>
      )}

      {step.kind !== 'intro' && step.kind !== 'results' && step.kind !== 'deeper-offer' && (
        <div className="flex justify-between mt-8">
          <button type="button" onClick={back} className="text-slate-400 hover:text-slate-200 py-2 px-4">
            Back
          </button>
          <button
            type="button"
            onClick={next}
            disabled={step.kind === 'real' && answers.realVotes[step.question.proposal_id] === undefined}
            className="bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white font-semibold py-2 px-6 rounded-lg"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function TopicQuestion({
  topic,
  answer,
  onChange,
}: {
  topic: Topic;
  answer: { agree: number; importance: number };
  onChange: (a: { agree: number; importance: number }) => void;
}) {
  // Record the default immediately so "Next" without touching anything counts as answered.
  useEffect(() => {
    onChange(answer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per topic
  }, [topic.id]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wider text-violet-300 mb-2">
          {topic.group === 'decentralization' ? 'Decentralization' : topic.group === 'deeper' ? 'Going deeper' : 'Your values'}
          {topic.source === 'stated' && ' · not yet measurable from votes'}
        </p>
        <h2 className="text-3xl font-bold text-white leading-tight">{topic.statement}</h2>
      </div>
      <div>
        <p className="text-slate-200 font-medium mb-3">Do you agree or disagree?</p>
        <AgreeScale value={answer.agree} onChange={(agree) => onChange({ ...answer, agree })} left="Strongly disagree" right="Strongly agree" />
      </div>
      <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-4 space-y-4">
        <p className="text-sm text-slate-400">{topic.context}</p>
        <ArgumentsPanel
          argsFor={topic.argsFor.map((text) => ({ text }))}
          argsAgainst={topic.argsAgainst.map((text) => ({ text }))}
        />
      </div>
      <div>
        <p className="text-slate-200 font-medium mb-3">How important is this to you?</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {IMPORTANCE_LEVELS.map((level) => (
            <button
              key={level.value}
              type="button"
              onClick={() => onChange({ ...answer, importance: level.value })}
              aria-pressed={answer.importance === level.value}
              className={`py-2 rounded-md text-sm transition-colors ${
                answer.importance === level.value ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {level.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
