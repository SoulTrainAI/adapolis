/**
 * Pure card-stat computation: every DRep's history rebuilt from votes and
 * proposals, one stat line per 6-epoch window (the back of a sports card),
 * plus trends, averages, fantasy projections and TCG-style abilities.
 *
 * Process only (Cardinal Rule): nothing here reads which way a DRep voted,
 * except the plain Yes/No/Abstain tally shown on the card back.
 */

import { calculateDampener, type ProposalWindow } from '@/lib/scoring/govscore-v1';
import { wilsonLowerBound } from '@/lib/scoring/confidence';
import type { RegistrationPeriod } from '@/lib/koios/drep-registrations';
import {
  computeSeasonPoints,
  POINT_RULES,
  seasonNumber,
  underdogScale,
  windowEpochs,
  windowForEpoch,
  type SeasonProposal,
  type SeasonVote,
} from '@/lib/season/points';
import type { CardAbility, CardSummary, SeasonLine } from './types';

const TREND_WINDOWS = 12;

export interface CardInputs {
  currentEpoch: number;
  dreps: Array<{ drep_id: string; registered: boolean; ada: number; delegators: number; name: string | null; image: string | null; do_not_list: boolean }>;
  proposals: Array<SeasonProposal & ProposalWindow>;
  votes: SeasonVote[];
  periods: Map<string, RegistrationPeriod[]>;
  latest: Map<string, { govscore: number | null; participation: number | null; votes_cast: number; votes_eligible: number; streak: number }>;
  ownership: { rosters: number; picks: Map<string, number> };
}

export interface CardComputation {
  currentWindow: number;
  summaries: Map<string, CardSummary>;
  lines: Map<string, SeasonLine[]>;
}

export function windowLabel(window: number): string {
  const n = seasonNumber(window);
  if (n !== null) return `Season ${n}`;
  const { start, end } = windowEpochs(window);
  return `Epochs ${start}–${end}`;
}

function overlaps(periods: RegistrationPeriod[], start: number, end: number): boolean {
  return periods.some((r) => r.from <= end && (r.to === null || r.to >= start));
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const round1 = (x: number | null) => (x === null ? null : Math.round(x * 10) / 10);

export function computeCards(input: CardInputs): CardComputation {
  const { currentEpoch, dreps, proposals, votes, periods, latest } = input;
  const currentWindow = windowForEpoch(currentEpoch);
  const firstEpoch = proposals.reduce((m, p) => Math.min(m, p.start), currentEpoch);
  const firstWindow = windowForEpoch(firstEpoch);
  const ids = dreps.map((d) => d.drep_id);
  const windows: number[] = [];
  for (let w = firstWindow; w <= currentWindow; w++) windows.push(w);

  // Points per window: one pass of the season engine per window.
  const pointsByWindow = new Map<number, Map<string, ReturnType<typeof computeSeasonPoints>[number]>>();
  for (const w of windows) {
    const { start, end } = windowEpochs(w);
    const rows = computeSeasonPoints(ids, proposals, votes, periods, { from: start, to: Math.min(end, currentEpoch) });
    pointsByWindow.set(w, new Map(rows.map((r) => [r.drep_id, r])));
  }

  // GovScore as of each window's end: for each proposal a DRep could have voted on,
  // the epoch it became "counted" (its vote, or its close while registered).
  const votesByDRep = new Map<string, SeasonVote[]>();
  for (const v of votes) {
    const list = votesByDRep.get(v.drep_id) ?? [];
    list.push(v);
    votesByDRep.set(v.drep_id, list);
  }
  const govscoreAt = new Map<string, Array<number | null>>();
  const sizeById = new Map(dreps.map((d) => [d.drep_id, d]));
  for (const d of dreps) {
    const own = periods.get(d.drep_id) ?? [{ from: 0, to: null }];
    const voteEpoch = new Map<string, number>();
    for (const v of votesByDRep.get(d.drep_id) ?? []) {
      const prev = voteEpoch.get(v.proposal_id);
      if (prev === undefined || v.epoch < prev) voteEpoch.set(v.proposal_id, v.epoch);
    }
    const counted: number[] = [];
    for (const p of proposals) {
      const ve = voteEpoch.get(p.proposal_id);
      const closed = p.end !== null && overlaps(own, p.start, p.end) ? p.end : null;
      const k = Math.min(ve ?? Infinity, closed ?? Infinity);
      if (k !== Infinity) counted.push(k);
    }
    counted.sort((a, b) => a - b);
    const voted = Array.from(voteEpoch.values()).sort((a, b) => a - b);
    const damp = calculateDampener(d.ada * 1_000_000);
    const series: Array<number | null> = [];
    let ci = 0;
    let vi = 0;
    for (const w of windows) {
      const e = Math.min(windowEpochs(w).end, currentEpoch);
      while (ci < counted.length && counted[ci] <= e) ci++;
      while (vi < voted.length && voted[vi] <= e) vi++;
      series.push(ci > 0 ? Math.round(wilsonLowerBound(vi, ci) * 1000 * damp) / 10 : null);
    }
    govscoreAt.set(d.drep_id, series);
  }

  // Draft multiplier scale: DReps active in the latest finished window.
  const prevPoints = pointsByWindow.get(currentWindow - 1);
  const scale = underdogScale(
    Array.from(prevPoints?.values() ?? [])
      .filter((r) => r.votes_cast > 0)
      .map((r) => {
        const s = sizeById.get(r.drep_id);
        return { drep_id: r.drep_id, amount_lovelace: (s?.ada ?? 0) * 1_000_000, delegator_count: s?.delegators ?? 0 };
      })
  );

  // Current-window rank among DReps that voted this window.
  const current = pointsByWindow.get(currentWindow)!;
  const seasonRank = new Map(
    Array.from(current.values())
      .filter((r) => r.votes_cast > 0)
      .sort((a, b) => b.points - a.points || b.votes_cast - a.votes_cast)
      .map((r, i) => [r.drep_id, i + 1])
  );

  // Scoreboard rank by current GovScore among registered DReps.
  const ranked = dreps
    .filter((d) => d.registered && latest.get(d.drep_id)?.govscore != null)
    .sort((a, b) => (latest.get(b.drep_id)!.govscore ?? 0) - (latest.get(a.drep_id)!.govscore ?? 0));
  const rankOf = new Map(ranked.map((d, i) => [d.drep_id, i + 1]));
  const votesTotal = new Map(dreps.map((d) => [d.drep_id, (votesByDRep.get(d.drep_id) ?? []).length]));
  const workhorseCut = Array.from(votesTotal.values()).sort((a, b) => b - a)[Math.max(0, Math.floor(dreps.length * 0.1) - 1)] ?? Infinity;

  const summaries = new Map<string, CardSummary>();
  const lines = new Map<string, SeasonLine[]>();
  for (const d of dreps) {
    const gs = govscoreAt.get(d.drep_id) ?? [];
    const myLines: SeasonLine[] = windows.map((w, i) => {
      const r = pointsByWindow.get(w)!.get(d.drep_id)!;
      const { start, end } = windowEpochs(w);
      return {
        window: w,
        label: windowLabel(w),
        start_epoch: start,
        end_epoch: end,
        in_progress: w === currentWindow,
        played: r.votes_cast > 0 || r.actions_missed > 0,
        points: r.points,
        votes: r.votes_cast,
        rationales: r.breakdown.rationales / POINT_RULES.rationale,
        early: r.breakdown.early / POINT_RULES.early,
        missed: r.actions_missed,
        streak_points: r.breakdown.streak,
        govscore_end: gs[i] ?? null,
      };
    });
    lines.set(d.drep_id, myLines);

    const completed = myLines.filter((l) => !l.in_progress && l.played);
    const avg = mean(completed.map((l) => l.points));
    const form = completed.length ? mean(completed.slice(-3).map((l) => l.points)) : null;
    const totalVotes = myLines.reduce((s, l) => s + l.votes, 0);
    const rationales = myLines.reduce((s, l) => s + l.rationales, 0);
    const early = myLines.reduce((s, l) => s + l.early, 0);
    const missed = myLines.reduce((s, l) => s + l.missed, 0);
    const firstPlayed = myLines.find((l) => l.votes > 0);
    const firstVoteEpoch = (votesByDRep.get(d.drep_id) ?? []).reduce((m, v) => Math.min(m, v.epoch), Infinity);
    const firstEpochOf = Number.isFinite(firstVoteEpoch) ? firstVoteEpoch : null;
    const trend = gs.slice(-TREND_WINDOWS);
    const nowScore = latest.get(d.drep_id)?.govscore ?? trend[trend.length - 1] ?? null;
    const at = (back: number) => trend[trend.length - 1 - back] ?? null;
    const l = latest.get(d.drep_id);
    const underdog = scale({ amount_lovelace: d.ada * 1_000_000, delegator_count: d.delegators });
    const rookie = firstPlayed !== undefined && firstPlayed.window >= currentWindow - 1;
    const rationaleRate = totalVotes ? rationales / totalVotes : null;
    const earlyRate = totalVotes ? early / totalVotes : null;
    const cur = myLines[myLines.length - 1];

    const abilities: CardAbility[] = [];
    if (rationaleRate !== null && totalVotes >= 5 && rationaleRate >= 0.8)
      abilities.push({ id: 'scholar', label: 'Scholar', detail: `Explains ${Math.round(rationaleRate * 100)}% of votes.` });
    if (earlyRate !== null && totalVotes >= 5 && earlyRate >= 0.5)
      abilities.push({ id: 'early_bird', label: 'Early Bird', detail: `Votes early on ${Math.round(earlyRate * 100)}% of actions.` });
    if (completed.length >= 3 && completed.every((c) => c.missed === 0))
      abilities.push({ id: 'ironclad', label: 'Ironclad', detail: `No missed votes in ${completed.length} windows.` });
    if (totalVotes >= workhorseCut && totalVotes > 0)
      abilities.push({ id: 'workhorse', label: 'Workhorse', detail: `${totalVotes} career votes, top 10% of DReps.` });
    if ((l?.streak ?? 0) >= 5) abilities.push({ id: 'on_fire', label: 'On Fire', detail: `${l?.streak} epochs in a row.` });
    if (completed.length >= 10)
      abilities.push({ id: 'veteran', label: 'Veteran', detail: `Played ${completed.length} windows.` });
    if (underdog >= 1.35) abilities.push({ id: 'underdog', label: 'Underdog', detail: `${underdog.toFixed(2)}× draft multiplier.` });
    if (rookie) abilities.push({ id: 'rookie', label: 'Rookie', detail: 'First votes in the last two windows.' });

    summaries.set(d.drep_id, {
      drep_id: d.drep_id,
      name: d.name,
      image: d.image,
      registered: d.registered,
      do_not_list: d.do_not_list,
      rank: rankOf.get(d.drep_id) ?? null,
      total: ranked.length,
      ada: Math.round(d.ada),
      delegators: d.delegators,
      govscore: nowScore,
      govscore_trend: trend,
      delta1: nowScore !== null && at(1) !== null ? round1(nowScore - at(1)!) : null,
      delta3: nowScore !== null && at(3) !== null ? round1(nowScore - at(3)!) : null,
      participation: l?.participation ?? null,
      votes_cast: l?.votes_cast ?? totalVotes,
      votes_eligible: l?.votes_eligible ?? 0,
      streak: l?.streak ?? 0,
      season: {
        window: currentWindow,
        label: windowLabel(currentWindow),
        points: cur.points,
        votes: cur.votes,
        rationales: cur.rationales,
        early: cur.early,
        missed: cur.missed,
        rank: seasonRank.get(d.drep_id) ?? null,
      },
      points_trend: myLines.slice(-TREND_WINDOWS).map((x) => x.points),
      last_points: completed.length ? completed[completed.length - 1].points : null,
      avg_points: round1(avg),
      best_points: completed.reduce((m, c) => Math.max(m, c.points), 0),
      form: round1(form),
      projection: round1(form ?? avg),
      lifetime: {
        votes: totalVotes,
        points: myLines.reduce((s, x) => s + x.points, 0),
        seasons: myLines.filter((x) => x.played).length,
        rationale_rate: rationaleRate,
        early_rate: earlyRate,
        missed,
        first_epoch: firstEpochOf,
        tenure_epochs: firstEpochOf === null ? 0 : currentEpoch - firstEpochOf,
      },
      rookie,
      underdog,
      ownership: input.ownership.rosters > 0 ? (input.ownership.picks.get(d.drep_id) ?? 0) / input.ownership.rosters : null,
      archetype: abilities.find((a) => a.id !== 'underdog' && a.id !== 'rookie') ?? abilities[0] ?? null,
      abilities,
    });
  }
  return { currentWindow, summaries, lines };
}
