'use client';

import { useEffect, useMemo, useState } from 'react';
import type { MatchData } from '@/lib/match/profiles';
import { scoreMatches, type Answers } from '@/lib/match/score';
import { alignmentMap, hasQuizAnswers, readSavedQuiz, type Alignment } from '@/lib/match/personal';

export interface AlignmentState {
  /** The visitor has taken the quiz (in this browser or saved to their wallet) */
  hasQuiz: boolean;
  /** Null until match data loads, or when there's no quiz */
  byDRep: Map<string, Alignment> | null;
  data: MatchData | null;
}

/** The visitor's Alignment with every matchable DRep, worked out in this browser. */
export function useAlignment(enabled = true): AlignmentState {
  const [answers, setAnswers] = useState<Answers | null>(null);
  const [data, setData] = useState<MatchData | null>(null);

  useEffect(() => {
    let live = true;
    const local = readSavedQuiz();
    if (local) setAnswers(local.answers);
    // Answers saved to the signed-in wallet count too (taken on another device).
    fetch('/api/me/quiz')
      .then((r) => (r.ok ? r.json() : null))
      .then((body: { saved: { answers: Answers; updated_at: string } | null } | null) => {
        const saved = body?.saved;
        if (!live || !saved || !hasQuizAnswers(saved.answers)) return;
        if (!local || new Date(saved.updated_at) > new Date(local.savedAt)) setAnswers(saved.answers);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled || !answers || data) return;
    let live = true;
    fetch('/api/match')
      .then((r) => (r.ok ? r.json() : null))
      .then((d: MatchData | null) => {
        if (live && d) setData(d);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [enabled, answers, data]);

  const byDRep = useMemo(() => (answers && data ? alignmentMap(scoreMatches(data.dreps, data.real_votes, answers)) : null), [answers, data]);
  return { hasQuiz: hasQuizAnswers(answers), byDRep, data };
}
