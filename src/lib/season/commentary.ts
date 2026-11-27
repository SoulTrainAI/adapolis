/**
 * Race commentary: replays a season day by day and turns what happened into
 * short, fun lines ("Kurdopia drops a fresh hot take and pulls ahead of THOR").
 *
 * Lines come from process events (voted, explained, voted early, kept a
 * streak, missed an action) and rank changes. Each line can carry the actions
 * behind it, including how the DRep voted, for display (Jason, 2026-11-25).
 * Points never depend on the vote (Cardinal Rule); see points.test.ts.
 */

import type { PointEvent } from './points';

export const DAY_S = 86_400;
const EPOCH_S = 432_000;
export const SHOWN = 20;
const LINES_PER_DAY = 5;

export interface RaceEntrant {
  drep_id: string;
  name: string | null;
  events: PointEvent[];
}

export interface CommentaryLine {
  /** Unix seconds: end of the day the line describes. */
  t: number;
  day: number;
  epoch: number;
  text: string;
  tone: 'lead' | 'move' | 'hot' | 'streak' | 'slip' | 'info';
  drep_ids: string[];
  /** The actions behind the line: what was voted on (and how), or what was missed. */
  details?: CommentaryDetail[];
}

export interface CommentaryDetail {
  drep_id: string;
  proposal_id: string;
  action: 'voted' | 'missed';
  vote?: 'yes' | 'no' | 'abstain';
  explained?: boolean;
}

export function displayName(e: Pick<RaceEntrant, 'name' | 'drep_id'>): string {
  return e.name ?? `${e.drep_id.slice(0, 10)}…`;
}

/** Points per DRep at time t (inclusive). */
export function pointsAt(entrants: RaceEntrant[], t: number): Map<string, number> {
  const out = new Map<string, number>();
  for (const e of entrants) {
    let sum = 0;
    for (const ev of e.events) {
      if (ev.t > t) break;
      sum += ev.pts;
    }
    out.set(e.drep_id, sum);
  }
  return out;
}

/** Ranked order at time t: points, then name, so ties are stable. */
export function orderAt(entrants: RaceEntrant[], t: number): Array<{ drep_id: string; points: number }> {
  const pts = pointsAt(entrants, t);
  const name = new Map(entrants.map((e) => [e.drep_id, displayName(e)]));
  return entrants
    .map((e) => ({ drep_id: e.drep_id, points: pts.get(e.drep_id) ?? 0 }))
    .sort((a, b) => b.points - a.points || name.get(a.drep_id)!.localeCompare(name.get(b.drep_id)!));
}

function pick(options: string[], seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return options[h % options.length];
}

const HOT = ['drops a fresh hot take', 'publishes a brand-new rationale', 'shows their working, fresh off the press', 'explains themselves in original prose'];
const BIG = ['has a monster day', 'goes on a tear', 'is everywhere today', 'clears the docket'];
const EARLY = ['beats the crowd to the booth', 'votes before the coffee is ready', 'is first through the door'];
const SLIP = ['lets an action slip by', 'misses one at the buzzer', 'leaves a vote on the table'];
const VOTE = ['puts in a shift', 'gets votes on the board', 'keeps ticking along'];

export function buildCommentary(
  entrants: RaceEntrant[],
  range: { starts_at: number; until: number; start_epoch: number }
): CommentaryLine[] {
  const byId = new Map(entrants.map((e) => [e.drep_id, e]));
  const name = (id: string) => displayName(byId.get(id)!);
  const lines: CommentaryLine[] = [];
  const days = Math.max(0, Math.ceil((range.until - range.starts_at) / DAY_S));
  let prevOrder = orderAt(entrants, range.starts_at - 1);

  for (let d = 0; d < days; d++) {
    const from = range.starts_at + d * DAY_S;
    const to = Math.min(from + DAY_S - 1, range.until);
    const epoch = range.start_epoch + Math.floor((to - range.starts_at) / EPOCH_S);
    const order = orderAt(entrants, to);
    const candidates: Array<{ heat: number; line: Omit<CommentaryLine, 't' | 'day' | 'epoch'> }> = [];

    // How the order changed: one movement per DRep (lead change, overtake, or breaking into the top 20).
    const prevRank = new Map(prevOrder.map((o, i) => [o.drep_id, i + 1]));
    const moves = new Map<string, { heat: number; phrase: string; tone: CommentaryLine['tone']; other?: string }>();
    const leader = order[0];
    const prevLeader = prevOrder[0];
    if (leader && leader.points > 0 && prevLeader && leader.drep_id !== prevLeader.drep_id) {
      moves.set(
        leader.drep_id,
        prevLeader.points > 0
          ? { heat: 100, phrase: `takes the lead from ${name(prevLeader.drep_id)}! 👑`, tone: 'lead', other: prevLeader.drep_id }
          : { heat: 100, phrase: 'draws first blood and leads the season 👑', tone: 'lead' }
      );
    }
    order.slice(1, 10).forEach((o, i) => {
      const rank = i + 2;
      const before = prevRank.get(o.drep_id) ?? Infinity;
      if (o.points <= 0 || before <= rank || moves.has(o.drep_id)) return;
      const passed = prevOrder.find((p, j) => j + 1 === rank && p.drep_id !== o.drep_id);
      if (passed) moves.set(o.drep_id, { heat: 70 - rank, phrase: `pulls ahead of ${name(passed.drep_id)} into #${rank}`, tone: 'move', other: passed.drep_id });
    });
    order.slice(10, SHOWN).forEach((o, i) => {
      if (o.points > 0 && (prevRank.get(o.drep_id) ?? Infinity) > SHOWN && !moves.has(o.drep_id)) {
        moves.set(o.drep_id, { heat: 22, phrase: `breaks into the top ${SHOWN} at #${i + 11}`, tone: 'move' });
      }
    });

    // What each DRep did today, joined with how they moved ("drops a fresh hot take and pulls ahead of THOR").
    for (const e of entrants) {
      const today = e.events.filter((ev) => ev.t >= from && ev.t <= to);
      const move = moves.get(e.drep_id);
      if (today.length === 0 && !move) continue;
      const pts = today.reduce((s, ev) => s + ev.pts, 0);
      const votes = today.filter((ev) => ev.kind === 'votes').length;
      const fresh = today.filter((ev) => ev.kind === 'fresh').length;
      const early = today.filter((ev) => ev.kind === 'early').length;
      const missed = today.filter((ev) => ev.kind === 'missed').length;
      const streak = today.find((ev) => ev.kind === 'streak');
      const explainedAt = new Set(today.filter((ev) => ev.kind === 'rationales').map((ev) => ev.t));
      const voteDetails: CommentaryDetail[] = today
        .filter((ev) => ev.kind === 'votes' && ev.proposal_id)
        .slice(0, 3)
        .map((ev) => ({ drep_id: e.drep_id, proposal_id: ev.proposal_id!, action: 'voted', vote: ev.vote, explained: explainedAt.has(ev.t) }));
      const missDetails: CommentaryDetail[] = today
        .filter((ev) => ev.kind === 'missed' && ev.proposal_id)
        .slice(0, 3)
        .map((ev) => ({ drep_id: e.drep_id, proposal_id: ev.proposal_id!, action: 'missed' }));
      const seed = `${e.drep_id}:${d}`;
      const sign = pts >= 0 ? `+${pts}` : `${pts}`;
      const action =
        pts >= 60
          ? { heat: 50 + pts / 10, phrase: `${pick(BIG, seed)} with ${votes} vote${votes === 1 ? '' : 's'}`, tone: 'hot' as const }
          : fresh > 0
            ? { heat: 40 + pts / 10, phrase: pick(HOT, seed), tone: 'hot' as const }
            : early > 0
              ? { heat: 25 + pts / 10, phrase: pick(EARLY, seed), tone: 'info' as const }
              : votes > 0
                ? { heat: 10 + pts / 10, phrase: pick(VOTE, seed), tone: 'info' as const }
                : null;
      if (action || move) {
        const phrase = [action?.phrase, move?.phrase].filter(Boolean).join(' and ');
        candidates.push({
          heat: (action?.heat ?? 0) + (move?.heat ?? 0),
          line: {
            text: `${name(e.drep_id)} ${phrase}${action ? ` (${sign})` : ''}`,
            tone: move?.tone === 'lead' ? 'lead' : action?.tone ?? move?.tone ?? 'info',
            drep_ids: move?.other ? [e.drep_id, move.other] : [e.drep_id],
            details: action ? voteDetails : undefined,
          },
        });
      }
      if (streak?.run && streak.run >= 3) {
        candidates.push({
          heat: 30 + streak.run * 2,
          line: { text: `🔥 ${name(e.drep_id)} keeps the streak alive: ${streak.run} clean epochs in a row (+${streak.pts})`, tone: 'streak', drep_ids: [e.drep_id] },
        });
      }
      if (missed > 0) {
        candidates.push({
          heat: 28,
          line: {
            text: `${name(e.drep_id)} ${pick(SLIP, seed)}${missed > 1 ? ` (${missed} actions)` : ''}: nothing scored, and the streak starts over`,
            tone: 'slip',
            drep_ids: [e.drep_id],
            details: missDetails,
          },
        });
      }
    }

    // The most interesting few, at most one per DRep (lead changes always make it).
    const used = new Set<string>();
    candidates
      .sort((a, b) => b.heat - a.heat)
      .filter((c) => {
        const key = `${c.line.drep_ids[0]}:${c.line.tone === 'streak' || c.line.tone === 'slip' ? c.line.tone : 'main'}`;
        if (used.has(key)) return false;
        used.add(key);
        return true;
      })
      .slice(0, LINES_PER_DAY)
      .forEach((c) => lines.push({ ...c.line, t: to, day: d + 1, epoch }));
    prevOrder = order;
  }
  return lines;
}
