'use client';

import { SAVED_QUIZ_KEY, type SavedQuiz } from '@/lib/match/personal';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Cloud, CloudOff, ExternalLink, Loader2, RotateCcw, ShieldCheck, Sparkles } from 'lucide-react';
import { TOPICS, IMPORTANCE_LEVELS, type Topic } from '@/lib/match/topics';
import { scoreMatches, type Answers, type RankMode } from '@/lib/match/score';
import type { MatchData, RealVoteQuestion } from '@/lib/match/profiles';
import { ArgumentsPanel, toArgument } from '@/components/governance/ArgumentsPanel';
import { ExploreDReps } from './ExploreDReps';

type Step =
  | { kind: 'intro' }
  | { kind: 'topic'; topic: Topic }
  | { kind: 'real'; question: RealVoteQuestion; index: number }
  | { kind: 'deeper-offer' }
  | { kind: 'results' };

const SAVED_KEY = SAVED_QUIZ_KEY;

const CORE_TOPICS = TOPICS.filter((t) => t.group !== 'deeper');
const DEEPER_TOPICS = TOPICS.filter((t) => t.group === 'deeper');

// Literal class strings so Tailwind keeps them: red = disagree, green = agree.
const SCALE_IDLE = [
  'bg-red-700/80', 'bg-red-700/60', 'bg-red-700/45', 'bg-red-700/30', 'bg-red-700/15',
  'bg-emerald-600/15', 'bg-emerald-600/30', 'bg-emerald-600/45', 'bg-emerald-600/60', 'bg-emerald-600/80',
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

export function MatchQuiz() {
  const [data, setData] = useState<MatchData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Answers>({ topics: {}, realVotes: {} });
  const [includeDeeper, setIncludeDeeper] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [rankMode, setRankMode] = useState<RankMode>('votes');
  const [quickPick, setQuickPick] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  // Answers live only in this browser (localStorage) until the user retakes or clears them.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVED_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as SavedQuiz;
      if (saved.v !== 1 || !saved.answers) return;
      setAnswers(saved.answers);
      setIncludeDeeper(saved.includeDeeper);
      setSavedAt(saved.savedAt);
    } catch {
      // Unreadable or blocked storage: start fresh.
    }
  }, []);

  const hasAnswers = Object.values(answers.topics).some((a) => a.agree > 0 && a.importance > 0) || Object.keys(answers.realVotes).length > 0;

  useEffect(() => {
    if (!hasAnswers) return;
    try {
      const previous = JSON.parse(localStorage.getItem(SAVED_KEY) ?? 'null') as SavedQuiz | null;
      if (previous && JSON.stringify(previous.answers) === JSON.stringify(answers) && previous.includeDeeper === includeDeeper) return;
      const savedAtNow = new Date().toISOString();
      localStorage.setItem(SAVED_KEY, JSON.stringify({ v: 1, answers, includeDeeper, savedAt: savedAtNow } satisfies SavedQuiz));
      setSavedAt(savedAtNow);
    } catch {
      // Storage unavailable (private mode): answers still work for this visit.
    }
  }, [answers, includeDeeper, hasAnswers]);

  const clearSaved = () => {
    try {
      localStorage.removeItem(SAVED_KEY);
    } catch {
      // Nothing stored.
    }
    setAnswers({ topics: {}, realVotes: {} });
    setIncludeDeeper(false);
    setSavedAt(null);
    setQuickPick(false);
    setRankMode('votes');
  };

  // Opt-in: answers saved to the signed-in wallet follow the player to other devices.
  const [signedIn, setSignedIn] = useState(false);
  const [walletSavedAt, setWalletSavedAt] = useState<string | null>(null);
  const [walletBusy, setWalletBusy] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  const lastSynced = useRef<string | null>(null);

  const loadWallet = useCallback(async () => {
    try {
      const me = (await fetch('/api/auth/me').then((r) => r.json())) as { stakeAddress: string | null };
      setSignedIn(!!me.stakeAddress);
      if (!me.stakeAddress) {
        setWalletSavedAt(null);
        return;
      }
      const res = await fetch('/api/me/quiz');
      const body = (await res.json()) as { saved: { answers: Answers; include_deeper: boolean; updated_at: string } | null; error?: string };
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      if (!body.saved) {
        setWalletSavedAt(null);
        return;
      }
      setWalletSavedAt(body.saved.updated_at);
      lastSynced.current = JSON.stringify([body.saved.answers, body.saved.include_deeper]);
      const local = JSON.parse(localStorage.getItem(SAVED_KEY) ?? 'null') as SavedQuiz | null;
      // The newer copy wins, so answers updated on another device show up here.
      if (!local || new Date(body.saved.updated_at) > new Date(local.savedAt)) {
        setAnswers(body.saved.answers);
        setIncludeDeeper(body.saved.include_deeper);
        setSavedAt(body.saved.updated_at);
      }
    } catch (e) {
      setWalletError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    loadWallet();
    window.addEventListener('adapolis:auth', loadWallet);
    return () => window.removeEventListener('adapolis:auth', loadWallet);
  }, [loadWallet]);

  const pushToWallet = useCallback(async (a: Answers, deeper: boolean) => {
    setWalletBusy(true);
    setWalletError(null);
    try {
      const res = await fetch('/api/me/quiz', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: a, include_deeper: deeper }),
      });
      const body = (await res.json()) as { saved?: { updated_at: string }; error?: string };
      if (!res.ok || !body.saved) throw new Error(body.error ?? `HTTP ${res.status}`);
      lastSynced.current = JSON.stringify([a, deeper]);
      setWalletSavedAt(body.saved.updated_at);
    } catch (e) {
      setWalletError(e instanceof Error ? e.message : String(e));
    } finally {
      setWalletBusy(false);
    }
  }, []);

  const removeFromWallet = async () => {
    setWalletBusy(true);
    setWalletError(null);
    try {
      const res = await fetch('/api/me/quiz', { method: 'DELETE', headers: { 'Content-Type': 'application/json' } });
      if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? `HTTP ${res.status}`);
      setWalletSavedAt(null);
      lastSynced.current = null;
    } catch (e) {
      setWalletError(e instanceof Error ? e.message : String(e));
    } finally {
      setWalletBusy(false);
    }
  };

  // Once saved to the wallet, later edits sync automatically.
  useEffect(() => {
    if (!walletSavedAt || !hasAnswers) return;
    if (JSON.stringify([answers, includeDeeper]) === lastSynced.current) return;
    const t = setTimeout(() => pushToWallet(answers, includeDeeper), 1000);
    return () => clearTimeout(t);
  }, [answers, includeDeeper, walletSavedAt, hasAnswers, pushToWallet]);

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
  // Once answers exist (saved here or to the wallet), open straight on the matches.
  const autoOpened = useRef(false);
  useEffect(() => {
    if (autoOpened.current || !data || !hasAnswers || stepIndex !== 0) return;
    autoOpened.current = true;
    setQuickPick(false);
    setStepIndex(steps.length - 1);
  }, [data, hasAnswers, stepIndex, steps.length]);
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
    <div className={`${step.kind === 'results' ? 'max-w-6xl' : 'max-w-2xl'} mx-auto`}>
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
          <h1 className="text-4xl sm:text-5xl font-bold text-white">DRep Match-maker</h1>
          <p className="text-lg text-slate-300">
            Answer a few questions about the Cardano you want. We compare your answers with how DReps have actually voted
            on-chain, and show you who matches best and why.
          </p>
          {savedAt && hasAnswers && data && (
            <div className="rounded-xl border border-violet-700/60 bg-violet-950/40 p-4 space-y-3">
              <p className="text-sm text-slate-200">
                Welcome back. Your answers from {new Date(savedAt).toLocaleDateString()} are saved in this browser.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setQuickPick(false);
                    setStepIndex(steps.length - 1);
                  }}
                  className="bg-violet-600 hover:bg-violet-700 text-white font-semibold py-2 px-5 rounded-lg"
                >
                  See my matches
                </button>
                <button type="button" onClick={next} className="bg-slate-800 hover:bg-slate-700 text-white py-2 px-5 rounded-lg">
                  Update my answers
                </button>
                <button
                  type="button"
                  onClick={() => {
                    clearSaved();
                    next();
                  }}
                  className="text-sm text-slate-400 hover:text-slate-200 underline underline-offset-2 px-2"
                >
                  Retake from scratch
                </button>
              </div>
            </div>
          )}
          <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-4 text-left text-sm text-slate-300 space-y-2">
            <p className="flex gap-2">
              <ShieldCheck size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
              Your answers stay on this device until you retake or clear them. Nothing is sent to us unless you choose to
              save them to your wallet to use on other devices.
            </p>
            <p className="flex gap-2">
              <Sparkles size={16} className="text-violet-300 flex-shrink-0 mt-0.5" />
              No right answers. For each statement, say how much you agree and how much it matters to you.
            </p>
          </div>
          {!(savedAt && hasAnswers) && (
            <button
              type="button"
              disabled={!data}
              onClick={next}
              className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-semibold py-3 px-8 rounded-lg"
            >
              {data ? 'Start (about 2 minutes)' : 'Loading DRep voting records…'}
            </button>
          )}
          {data && (
            <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-4">
              <p className="text-sm text-slate-300">Not into the details? Skip the questions.</p>
              <button
                type="button"
                onClick={() => {
                  setQuickPick(true);
                  setStepIndex(steps.length - 1);
                }}
                className="mt-2 bg-emerald-700 hover:bg-emerald-600 text-white font-semibold py-2 px-5 rounded-lg"
              >
                Just show me reliable, thoughtful DReps
              </button>
              <p className="mt-2 text-xs text-slate-500">
                Ranked on showing up, explaining their votes and a long track record, with a nudge toward smaller DReps.
              </p>
            </div>
          )}
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
          answer={answers.topics[step.topic.id] ?? { agree: 0, importance: 2 }}
          onChange={(a) => setAnswers((prev) => ({ ...prev, topics: { ...prev.topics, [step.topic.id]: a } }))}
          onSkip={() => {
            setAnswers((prev) => {
              const topics = { ...prev.topics };
              delete topics[step.topic.id];
              return { ...prev, topics };
            });
            next();
          }}
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
                  argsFor={step.question.arguments.for.map(toArgument)}
                  argsAgainst={step.question.arguments.against.map(toArgument)}
                  proposalId={step.question.proposal_id}
                  footnote={`AI-summarized from the published rationales of DReps who voted Yes (${step.question.arguments.for_sources}) and No (${step.question.arguments.against_sources}). Each quote is the DRep's exact words; read the full rationale to judge for yourself.`}
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
          <h2 className="text-3xl font-bold text-white">{quickPick || !hasAnswers ? 'Reliable, thoughtful DReps' : 'Your best-matched DReps'}</h2>
          <p className="text-sm text-slate-400">
            {quickPick || !hasAnswers
              ? 'Ranked on track record, showing up, and explaining their votes. Switch presets or fine-tune the weights to change what counts.'
              : "Values match compares your answers with each DRep's on-chain voting record, weighted by how much each topic matters to you. Your score blends that with the other weights below."}{' '}
            <Link href="/methodology#find-my-drep" className="text-violet-300 hover:text-violet-200">
              How matching works
            </Link>
          </p>
          {hasAnswers && !quickPick && drepsWithStatements > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-slate-400" title="Changes the ranking: match your answers against DReps' on-chain votes, or against what they have said in their own published words.">Match on:</span>
              {(
                [
                  ['votes', 'How they vote'],
                  ['statements', 'What they say'],
                ] as const
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setRankMode(mode)}
                  aria-pressed={rankMode === mode}
                  className={`px-3 py-1.5 rounded-md ${rankMode === mode ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                >
                  {label}
                </button>
              ))}
              {rankMode === 'statements' && (
                <span className="text-xs text-slate-500 w-full">
                  Ranking now uses DReps&apos; own published words (summarized by AI, each linked to the source) instead of their votes.
                  {drepsWithStatements} DReps have statements on file; this also counts your answers on topics nobody has voted on yet.
                </span>
              )}
            </div>
          )}

          <ExploreDReps
            key={`${quickPick}-${hasAnswers}`}
            dreps={data.dreps}
            results={hasAnswers && !quickPick ? results : []}
            hasAnswers={hasAnswers && !quickPick}
            quickPick={quickPick}
          />

          {hasAnswers && !quickPick && statedAnswered.length > 0 && rankMode === 'votes' && (
            <p className="text-xs text-slate-500 border-t border-slate-800 pt-4">
              {statedAnswered.length} of your answers (
              {statedAnswered.map((t) => t.statement.replace(/\.$/, '').toLowerCase()).join('; ')}) are on topics DReps
              haven&apos;t voted on, so they don&apos;t affect the values match.{' '}
              {drepsWithStatements > 0
                ? 'Switch to "What they say" to match on them using DReps\' published statements.'
                : 'They will count once DRep statements are summarized.'}
            </p>
          )}
          {hasAnswers && !quickPick && (
            <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 text-sm">
              {!signedIn ? (
                <p className="flex items-center gap-2 text-slate-300">
                  <CloudOff size={16} className="text-slate-500" /> Saved on this device only. Connect your wallet to save
                  your answers to it and use them on other devices.
                </p>
              ) : walletSavedAt ? (
                <div className="flex flex-wrap items-center gap-3">
                  <p className="flex items-center gap-2 text-emerald-300">
                    <Cloud size={16} /> Saved to your wallet
                    {walletBusy ? ' · syncing…' : ` · ${new Date(walletSavedAt).toLocaleString()}`}
                  </p>
                  <button
                    type="button"
                    onClick={removeFromWallet}
                    disabled={walletBusy}
                    className="text-slate-400 hover:text-slate-200 underline underline-offset-2 disabled:opacity-50"
                  >
                    Remove from wallet
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-slate-300">Saved on this device only.</p>
                  <button
                    type="button"
                    onClick={() => pushToWallet(answers, includeDeeper)}
                    disabled={walletBusy}
                    className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-1.5 font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
                  >
                    {walletBusy ? <Loader2 size={14} className="animate-spin" /> : <Cloud size={14} />} Save to my wallet
                  </button>
                  <span className="text-xs text-slate-500">Use your answers on any device you sign in from. Private to you.</span>
                </div>
              )}
              {walletError && <p className="mt-2 text-red-300">{walletError}</p>}
            </div>
          )}
          <div className="flex flex-wrap gap-4 border-t border-slate-800 pt-4">
            <button
              type="button"
              onClick={() => {
                setQuickPick(false);
                setStepIndex(1);
              }}
              className="inline-flex items-center gap-2 text-sm text-violet-300 hover:text-violet-200"
            >
              {hasAnswers ? 'Update my answers' : 'Take the quiz to match on values'}
            </button>
            {hasAnswers && (
              <button
                type="button"
                onClick={() => {
                  if (walletSavedAt) removeFromWallet();
                  clearSaved();
                  setStepIndex(0);
                }}
                className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200"
              >
                <RotateCcw size={14} /> Clear my answers{walletSavedAt ? ' (here and from my wallet)' : ''}
              </button>
            )}
          </div>
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
            disabled={
              (step.kind === 'real' && answers.realVotes[step.question.proposal_id] === undefined) ||
              (step.kind === 'topic' && !(answers.topics[step.topic.id]?.agree > 0))
            }
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
  onSkip,
}: {
  topic: Topic;
  answer: { agree: number; importance: number };
  onChange: (a: { agree: number; importance: number }) => void;
  onSkip: () => void;
}) {
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
      <button type="button" onClick={onSkip} className="text-sm text-slate-400 hover:text-slate-200 underline underline-offset-2">
        Skip, no opinion
      </button>
    </div>
  );
}

