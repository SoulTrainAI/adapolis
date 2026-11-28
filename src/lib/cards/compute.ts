/**
 * Pure card-stat computation: every DRep's history rebuilt from votes and
 * proposals, one stat line per 6-epoch window (the back of a sports card),
 * plus trends, averages, fantasy projections and TCG-style abilities.
 *
 * Process only (Cardinal Rule): nothing here reads which way a DRep voted,
 * except the plain Yes/No/Abstain tally shown on the card back.
 */

import type { ProposalWindow } from '@/lib/scoring/govscore-v1';
import { withMomentum, type Momentum } from '@/lib/season/momentum';
import { processScores } from '@/lib/scoring/govscore-v2';
import type { RegistrationPeriod } from '@/lib/koios/drep-registrations';
import { seasonLabel,
  computeSeasonPoints,
  seasonNumber,
  underdogScale,
  windowEpochs,
  windowForEpoch,
  type SeasonProposal,
  type SeasonVote,
} from '@/lib/season/points';
import type { CardAbility, CardSummary, SeasonLine } from './types';
import { ABILITY_RULES, TIER_NAMES, tierFor } from './abilities';
import { classFor } from './classes';

const TREND_WINDOWS = 12;

export interface CardInputs {
  currentEpoch: number;
  dreps: Array<{ drep_id: string; registered: boolean; ada: number; delegators: number; name: string | null; image: string | null; do_not_list: boolean; profile_complete: boolean }>;
  proposals: Array<SeasonProposal & ProposalWindow>;
  votes: SeasonVote[];
  periods: Map<string, RegistrationPeriod[]>;
  latest: Map<string, { govscore: number | null; participation: number | null; votes_cast: number; votes_eligible: number; streak: number }>;
  ownership: { rosters: number; picks: Map<string, number> };
  /** Momentum per season window (see season/momentum.ts); windows without it score unchanged. */
  momentum?: Map<number, Map<string, Momentum>>;
}

export interface CardComputation {
  currentWindow: number;
  summaries: Map<string, CardSummary>;
  lines: Map<string, SeasonLine[]>;
}

export function windowLabel(window: number): string {
  const n = seasonNumber(window);
  if (n !== null) return seasonLabel(n);
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
    const m = input.momentum?.get(w);
    const rows = computeSeasonPoints(ids, proposals, votes, periods, { from: start, to: Math.min(end, currentEpoch) }).map((r) =>
      m?.has(r.drep_id) ? { ...r, points: withMomentum(r.points, m.get(r.drep_id)!.bonus) } : r
    );
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
  // GovScore v2 (the game's scoring, career-long) at the end of each window, so trends stay on one formula.
  const sized = dreps.map((d) => ({ drep_id: d.drep_id, amount_lovelace: d.ada * 1_000_000 }));
  const govscoreByWindow = windows.map(
    (w) => new Map(processScores(sized, proposals, votes, periods, Math.min(windowEpochs(w).end, currentEpoch)).map((s) => [s.drep_id, s.adjusted]))
  );
  /** Career votes and participation at the end of each window, for the journey chart. */
  const careerAt = new Map<string, Array<{ votes: number; participation: number | null }>>();
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
    const series: Array<number | null> = [];
    const career: Array<{ votes: number; participation: number | null }> = [];
    let ci = 0;
    let vi = 0;
    for (let i = 0; i < windows.length; i++) {
      const w = windows[i];
      const e = Math.min(windowEpochs(w).end, currentEpoch);
      while (ci < counted.length && counted[ci] <= e) ci++;
      while (vi < voted.length && voted[vi] <= e) vi++;
      // GovScore v2 as it stood at this window's end.
      series.push(govscoreByWindow[i].get(d.drep_id) ?? null);
      career.push({ votes: vi, participation: ci > 0 ? Math.min(1, vi / ci) : null });
    }
    govscoreAt.set(d.drep_id, series);
    careerAt.set(d.drep_id, career);
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

  // Scoreboard rank by current GovScore among active DReps: registered, has voted, holds delegation
  // (the scoreboard's default pool, so "#7 of N" matches it).
  const ranked = dreps
    .filter((d) => d.registered && d.ada > 0 && (latest.get(d.drep_id)?.votes_cast ?? 0) > 0 && latest.get(d.drep_id)?.govscore != null)
    .sort((a, b) => (latest.get(b.drep_id)!.govscore ?? 0) - (latest.get(a.drep_id)!.govscore ?? 0));
  const rankOf = new Map(ranked.map((d, i) => [d.drep_id, i + 1]));


  const summaries = new Map<string, CardSummary>();
  const lines = new Map<string, SeasonLine[]>();
  for (const d of dreps) {
    const gs = govscoreAt.get(d.drep_id) ?? [];
    const career = careerAt.get(d.drep_id) ?? [];
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
        // Counted from events: a rationale is worth 0 points on its own, so points can't be divided back into counts.
        rationales: r.events.filter((e) => e.kind === 'rationales').length,
        early: r.events.filter((e) => e.kind === 'early').length,
        missed: r.actions_missed,
        streak_points: r.breakdown.streak,
        govscore_end: gs[i] ?? null,
        career_votes_end: career[i]?.votes ?? 0,
        participation_end: career[i]?.participation ?? null,
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

    const votedWindows = completed.filter((c) => c.votes > 0).length;
    let cleanRun = 0;
    for (let i = completed.length - 1; i >= 0 && completed[i].votes > 0 && completed[i].missed === 0; i--) cleanRun++;
    const lastDone = completed[completed.length - 1];
    const activeLately = lastDone !== undefined && lastDone.window >= currentWindow - 1 && lastDone.votes > 0;
    const streak = l?.streak ?? 0;

    const abilities: CardAbility[] = [];
    const tiered: Record<string, [number, (n: number) => string]> = {
      scholar: [rationales, (n) => `${n} votes explained with a rationale.`],
      early_bird: [early, (n) => `${n} votes cast in the first half of the window.`],
      workhorse: [totalVotes, (n) => `${n} career votes.`],
      veteran: [votedWindows, (n) => `Voted in ${n} six-epoch windows.`],
      ironclad: [cleanRun, (n) => `${n} windows in a row with no missed votes.`],
      on_fire: [streak, (n) => `${n} epochs in a row without a miss.`],
    };
    for (const rule of ABILITY_RULES) {
      if (!rule.tiers) continue;
      const [value, describe] = tiered[rule.id];
      const tier = tierFor(value, rule.tiers);
      if (tier) abilities.push({ id: rule.id, label: `${rule.label} · ${TIER_NAMES[tier]}`, detail: describe(value), tier });
    }
    if (d.profile_complete) abilities.push({ id: 'identified', label: 'Identified', detail: 'Complete public profile: name, bio, image and links.', tier: null });
    // Only small DReps that are actually voting: a big multiplier on an idle DRep is a trap, not a sleeper.
    if (underdog >= 1.35 && activeLately)
      abilities.push({ id: 'underdog', label: 'Underdog', detail: 'Active small DRep: among the smallest by ADA and delegators.', tier: null });
    if (rookie) abilities.push({ id: 'rookie', label: 'Rookie', detail: 'First votes in the last two windows.', tier: null });
    const lastVote = (votesByDRep.get(d.drep_id) ?? []).reduce((m, v) => Math.max(m, v.epoch), -Infinity);
    const recentLines = myLines.filter((x) => x.window >= currentWindow - 1);

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
      last_vote_epoch: Number.isFinite(lastVote) ? lastVote : null,
      recent: { votes: recentLines.reduce((t, x) => t + x.votes, 0), missed: recentLines.reduce((t, x) => t + x.missed, 0) },
      rookie,
      underdog,
      momentum: input.momentum?.get(currentWindow)?.get(d.drep_id) ?? null,
      ownership: input.ownership.rosters > 0 ? (input.ownership.picks.get(d.drep_id) ?? 0) / input.ownership.rosters : null,
      archetype: abilities.find((a) => a.id !== 'underdog' && a.id !== 'rookie') ?? abilities[0] ?? null,
      abilities,
      drep_class: classFor(d.ada, d.delegators),
    });
  }
  // Archetype is the DRep's rarest ability (ability and tier together), so the headline trait sets it apart.
  const key = (a: CardAbility) => `${a.id}:${a.tier ?? 0}`;
  const abilityCount = new Map<string, number>();
  summaries.forEach((c) => c.abilities.forEach((a) => abilityCount.set(key(a), (abilityCount.get(key(a)) ?? 0) + 1)));
  const background = new Set(['underdog', 'rookie', 'identified']);
  summaries.forEach((c) => {
    const traits = c.abilities.filter((a) => !background.has(a.id));
    const pool = traits.length ? traits : c.abilities;
    c.archetype =
      pool.slice().sort((a, b) => (abilityCount.get(key(a)) ?? 0) - (abilityCount.get(key(b)) ?? 0) || (b.tier ?? 0) - (a.tier ?? 0))[0] ?? null;
  });

  return { currentWindow, summaries, lines };
}
