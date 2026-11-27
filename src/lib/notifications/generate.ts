/**
 * Notification generators, run by the hourly cron. Each notification has a
 * dedupe key, so re-running never sends twice. Process-only: nothing here
 * reacts to how a DRep voted except to report it, as the commentary does.
 */

import { supabaseAdmin } from '@/lib/sync/supabase-admin';
import { getRace } from '@/lib/season/race';
import { getLeaderboard } from '@/lib/season/leaderboard';
import { buildCommentary, displayName, orderAt } from '@/lib/season/commentary';
import { seasonLabel } from '@/lib/season/points';
import { mintWindow } from '@/lib/season/mint-window';
import { notify, type NewNotification } from './store';

/** 18:00 UTC = 8 am in Hawaii; the daily digest goes out once, at the first run in that hour. */
const DAILY_HOUR_UTC = 18;
const DAY_MS = 86_400_000;
const RECENT_MS = 3 * DAY_MS;

interface SeasonRow {
  season_number: number;
  start_epoch: number;
  end_epoch: number;
  starts_at: string;
  ends_at: string;
  finalized_at: string | null;
}

async function rosterWallets(season: number): Promise<Array<{ stake_address: string; drep_ids: string[] }>> {
  const { data } = await supabaseAdmin.from('fantasy_rosters').select('stake_address, fantasy_roster_picks(drep_id)').eq('season_number', season);
  return (data ?? []).map((r) => ({
    stake_address: r.stake_address as string,
    drep_ids: ((r.fantasy_roster_picks ?? []) as Array<{ drep_id: string }>).map((p) => p.drep_id),
  }));
}

function pick(options: string[], seed: number): string {
  return options[Math.abs(seed) % options.length];
}

const OPENERS = ['🏟️ What an epoch, folks!', '📣 And that’s the buzzer on another epoch!', '🔥 Hold onto your hats!', '🎙️ Live from the Cardanathon!'];

/** Team summary + commentary digest, once a day. */
async function daily(now: Date, live: SeasonRow, out: NewNotification[]): Promise<void> {
  const day = now.toISOString().slice(0, 10);
  const [board, wallets, race] = await Promise.all([getLeaderboard({ season: live.season_number }), rosterWallets(live.season_number), getRace()]);
  const { data: states } = await supabaseAdmin.from('notification_team_state').select('stake_address, rank, points').eq('season_number', live.season_number);
  const prev = new Map((states ?? []).map((s) => [s.stake_address as string, { rank: s.rank as number | null, points: Number(s.points ?? 0) }]));
  const nextState: Array<Record<string, unknown>> = [];

  for (const t of board?.teams ?? []) {
    if (!t.owner) continue;
    const p = prev.get(t.owner);
    nextState.push({ stake_address: t.owner, season_number: live.season_number, rank: t.rank, points: t.points, updated_at: now.toISOString() });
    if (!p) continue;
    const gained = Math.round((t.points - p.points) * 10) / 10;
    const moved = p.rank !== null ? p.rank - t.rank : 0;
    if (gained === 0 && moved === 0) continue;
    const pts = gained > 0 ? `gained +${gained}` : gained < 0 ? `lost ${gained}` : 'held steady';
    const rank = moved > 0 ? ` and climbed from #${p.rank} to #${t.rank} 🚀` : moved < 0 ? ` and slipped from #${p.rank} to #${t.rank}` : ` and holds #${t.rank}`;
    out.push({
      stake_address: t.owner,
      type: 'team_daily',
      title: `${gained >= 0 ? '📈' : '📉'} ${t.name} ${pts} today${rank}`,
      body: `${t.points} points so far this season.`,
      url: '/cardanathon',
      dedupe_key: `team:${live.season_number}:${day}`,
    });
  }
  if (nextState.length) await supabaseAdmin.from('notification_team_state').upsert(nextState);

  const since = Math.floor((now.getTime() - DAY_MS) / 1000);
  const until = Math.min(Math.floor(now.getTime() / 1000), race.ends_at);
  const lines = buildCommentary(race.racers, { starts_at: race.starts_at, until, start_epoch: race.start_epoch }).filter((c) => c.t >= since);
  for (const w of wallets) {
    const mine = lines.filter((c) => c.drep_ids.some((id) => w.drep_ids.includes(id))).slice(-3);
    if (mine.length === 0) continue;
    out.push({
      stake_address: w.stake_address,
      type: 'commentary',
      title: `🎙️ ${mine.length} call${mine.length === 1 ? '' : 's'} on your DReps today`,
      body: mine.map((c) => `• ${c.text}`).join('\n'),
      url: '/cardanathon',
      dedupe_key: `commentary:${day}`,
    });
  }
}

/** A sportscaster recap after each epoch of the live season. */
async function epochRecap(live: SeasonRow, out: NewNotification[]): Promise<void> {
  const race = await getRace();
  const finished = race.current_epoch - 1;
  if (finished < live.start_epoch || finished > live.end_epoch) return;
  const epochEnd = race.starts_at + (finished - live.start_epoch + 1) * 432_000;
  const epochStart = epochEnd - 432_000;
  const before = orderAt(race.racers, epochStart);
  const after = orderAt(race.racers, epochEnd);
  if (!after[0] || after[0].points <= 0) return;
  const name = (id: string) => displayName(race.racers.find((r) => r.drep_id === id)!);
  const beforeRank = new Map(before.map((o, i) => [o.drep_id, i + 1]));
  const climber = after
    .slice(0, 20)
    .map((o, i) => ({ id: o.drep_id, gain: (beforeRank.get(o.drep_id) ?? 30) - (i + 1) }))
    .sort((a, b) => b.gain - a.gain)[0];
  const leader = after[0];
  const leaderChanged = before[0] && before[0].drep_id !== leader.drep_id && before[0].points > 0;
  const board = await getLeaderboard({ season: live.season_number });
  const topTeam = board?.teams[0];
  const lines = [
    `${pick(OPENERS, finished)} Epoch ${finished} is in the books.`,
    leaderChanged
      ? `👑 ${name(leader.drep_id)} snatches the lead from ${name(before[0].drep_id)} with ${leader.points} points!`
      : `👑 ${name(leader.drep_id)} keeps the yellow jersey at ${leader.points} points.`,
    climber && climber.gain > 1 ? `🚀 Mover of the epoch: ${name(climber.id)}, up ${climber.gain} places.` : null,
    topTeam ? `🏆 Top team: ${topTeam.name} on ${topTeam.points}.` : null,
    `${live.end_epoch - finished > 0 ? `${live.end_epoch - finished} epoch${live.end_epoch - finished === 1 ? '' : 's'} to go. Anything can happen!` : 'Final epoch next. It all comes down to this!'}`,
  ].filter(Boolean);
  for (const w of await rosterWallets(live.season_number)) {
    out.push({
      stake_address: w.stake_address,
      type: 'season_update',
      title: `📣 ${seasonLabel(live.season_number)}, epoch ${finished} recap`,
      body: lines.join('\n'),
      url: '/cardanathon',
      dedupe_key: `epoch:${finished}`,
    });
  }
}

/** Season end, winners and the mint window, for seasons that ended recently. */
async function seasonEvents(now: Date, seasons: SeasonRow[], out: NewNotification[]): Promise<void> {
  for (const s of seasons) {
    const end = new Date(s.ends_at);
    if (end > now) continue;
    const label = seasonLabel(s.season_number);
    const win = mintWindow(end);
    if (now.getTime() - end.getTime() > win.closes.getTime() - end.getTime() + RECENT_MS) continue;
    const wallets = await rosterWallets(s.season_number);

    if (now.getTime() - end.getTime() < RECENT_MS) {
      for (const w of wallets)
        out.push({ stake_address: w.stake_address, type: 'season_end', title: `🏁 ${label} is over!`, body: 'Final standings are being checked. Winners are announced shortly.', url: '/cardanathon', dedupe_key: `season:${s.season_number}:end` });
    }

    if (s.finalized_at && now.getTime() - new Date(s.finalized_at).getTime() < RECENT_MS) {
      const [{ data: champs }, { data: podium }] = await Promise.all([
        supabaseAdmin.from('season_champions').select('rank, card').eq('season_number', s.season_number).lte('rank', 3).order('rank'),
        supabaseAdmin.from('season_podium').select('place, team_name').eq('season_number', s.season_number).lte('place', 3).order('place'),
      ]);
      const medal = ['🥇', '🥈', '🥉'];
      const dreps = (champs ?? []).map((c, i) => `${medal[i]} ${((c.card ?? {}) as { name?: string }).name ?? 'A DRep'}`).join('  ');
      const teams = (podium ?? []).map((p, i) => `${medal[i]} ${p.team_name}`).join('  ');
      for (const w of wallets)
        out.push({
          stake_address: w.stake_address,
          type: 'winners',
          title: `🏆 ${label} winners!`,
          body: [dreps && `DReps: ${dreps}`, teams && `Teams: ${teams}`].filter(Boolean).join('\n'),
          url: '/hall-of-fame',
          dedupe_key: `season:${s.season_number}:winners`,
        });
    }

    // The Preseason's cards are tests and are never minted.
    if (s.season_number === 0) continue;
    const { data: claims } = await supabaseAdmin.from('season_claims').select('claimant, claimant_type, claimed_at').eq('season_number', s.season_number).neq('claimant_type', 'drep');
    const claimants = Array.from(new Set((claims ?? []).map((c) => c.claimant as string))).filter((c) => c.startsWith('stake1'));
    const unclaimed = new Set((claims ?? []).filter((c) => !c.claimed_at).map((c) => c.claimant as string));
    if (now >= win.opens && now < win.closes) {
      for (const c of claimants)
        out.push({ stake_address: c, type: 'mint_open', title: '✨ Your DRep All-Stars are ready to mint!', body: `The ${label} mint window is open until ${win.closes.toUTCString().slice(0, 16)}.`, url: '/mint', dedupe_key: `season:${s.season_number}:mint_open` });
    }
    if (now >= win.closingSoon && now < win.closes) {
      for (const c of claimants.filter((x) => unclaimed.has(x)))
        out.push({ stake_address: c, type: 'mint_closing', title: '⏳ Mint window closes soon', body: `Unclaimed ${label} All-Stars are never minted. About one epoch left.`, url: '/mint', dedupe_key: `season:${s.season_number}:mint_closing` });
    }
    if (now >= win.closes) {
      const minted = (claims ?? []).filter((c) => c.claimed_at).length;
      for (const c of claimants)
        out.push({ stake_address: c, type: 'mint_closed', title: `🔒 ${label} minting is closed`, body: `${minted} DRep All-Star copies were minted. Supply is now fixed forever.`, url: '/nfts', dedupe_key: `season:${s.season_number}:mint_closed` });
    }
  }
}

export async function runNotifications(now = new Date()): Promise<{ sent: number }> {
  const { data, error } = await supabaseAdmin.from('seasons').select('season_number, start_epoch, end_epoch, starts_at, ends_at, finalized_at').order('season_number');
  if (error) throw new Error(`Couldn't read seasons for notifications: ${error.message}`);
  const seasons = (data ?? []) as SeasonRow[];
  const live = seasons.find((s) => new Date(s.starts_at) <= now && new Date(s.ends_at) > now) ?? null;
  const out: NewNotification[] = [];
  if (live) {
    if (now.getUTCHours() === DAILY_HOUR_UTC) await daily(now, live, out);
    await epochRecap(live, out);
  }
  await seasonEvents(now, seasons, out);
  return { sent: await notify(out) };
}
