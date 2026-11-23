/**
 * Leagues: persistent groups of players whose teams are ranked against each
 * other each season. Public leagues can be browsed and joined by anyone;
 * private leagues only with their invite link. Bragging rights only: no fees
 * and no pools (docs/GAME.md 1.11). Server-only (service role).
 */

import { randomInt } from 'node:crypto';
import { supabaseAdmin } from '@/lib/sync/supabase-admin';
import { DraftError } from './fantasy';
import { getLeaderboard, type Leaderboard } from './leaderboard';
import { isMissingSchema, MIGRATION_HINT } from './schema';

export const MAX_LEAGUES_PER_WALLET = 10;
const MAX_MEMBERS = 500;
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

export interface LeagueSummary {
  league_id: string;
  name: string;
  visibility: 'public' | 'private';
  members: number;
  /** Only for members (private links are never listed publicly). */
  invite_code?: string;
  is_member?: boolean;
  is_owner?: boolean;
}

function inviteCode(): string {
  return Array.from({ length: 10 }, () => CODE_CHARS[randomInt(CODE_CHARS.length)]).join('');
}

function fail(error: { code?: string; message?: string }, what: string): never {
  if (isMissingSchema(error)) throw new DraftError(`Leagues open once the site’s database update is applied. ${MIGRATION_HINT}`, 503);
  throw new Error(`Couldn't ${what}: ${error.message}`);
}

async function memberCounts(ids: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (ids.length === 0) return counts;
  const { data, error } = await supabaseAdmin.from('league_members').select('league_id').in('league_id', ids);
  if (error) fail(error, 'count league members');
  for (const r of data ?? []) counts.set(r.league_id as string, (counts.get(r.league_id as string) ?? 0) + 1);
  return counts;
}

export async function listLeagues(me: string | null): Promise<{ mine: LeagueSummary[]; public: LeagueSummary[] }> {
  const [{ data: pub, error: pubError }, mineRows] = await Promise.all([
    supabaseAdmin.from('leagues').select('league_id, name, visibility, invite_code, owner_stake').eq('visibility', 'public').order('created_at', { ascending: false }).limit(200),
    me
      ? supabaseAdmin.from('league_members').select('leagues(league_id, name, visibility, invite_code, owner_stake)').eq('stake_address', me)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (pubError) fail(pubError, 'load public leagues');
  if (mineRows.error) fail(mineRows.error, 'load your leagues');
  type Row = { league_id: string; name: string; visibility: 'public' | 'private'; invite_code: string; owner_stake: string };
  const mine = ((mineRows.data ?? []) as Array<{ leagues: Row | Row[] | null }>)
    .flatMap((r) => (Array.isArray(r.leagues) ? r.leagues : r.leagues ? [r.leagues] : []));
  const mineIds = new Set(mine.map((l) => l.league_id));
  const counts = await memberCounts(Array.from(new Set(mine.map((l) => l.league_id).concat(((pub ?? []) as Row[]).map((l) => l.league_id)))));
  const summary = (l: Row, member: boolean): LeagueSummary => ({
    league_id: l.league_id,
    name: l.name,
    visibility: l.visibility,
    members: counts.get(l.league_id) ?? 0,
    is_member: member,
    is_owner: member && l.owner_stake === me,
    ...(member ? { invite_code: l.invite_code } : {}),
  });
  return {
    mine: mine.map((l) => summary(l, true)),
    public: ((pub ?? []) as Row[]).filter((l) => !mineIds.has(l.league_id)).map((l) => summary(l, false)),
  };
}

export async function createLeague(me: string, name: string, visibility: 'public' | 'private'): Promise<LeagueSummary> {
  const { count, error: countError } = await supabaseAdmin.from('leagues').select('league_id', { count: 'exact', head: true }).eq('owner_stake', me);
  if (countError) fail(countError, 'check your leagues');
  if ((count ?? 0) >= MAX_LEAGUES_PER_WALLET) throw new DraftError(`You can run up to ${MAX_LEAGUES_PER_WALLET} leagues.`, 409);
  const { data, error } = await supabaseAdmin
    .from('leagues')
    .insert({ name, visibility, invite_code: inviteCode(), owner_stake: me })
    .select('league_id, name, visibility, invite_code')
    .single();
  if (error || !data) fail(error ?? { message: 'no row returned' }, 'create the league');
  const { error: joinError } = await supabaseAdmin.from('league_members').insert({ league_id: data.league_id, stake_address: me });
  if (joinError) fail(joinError, 'add you to your league');
  console.log(JSON.stringify({ event: 'league_created', league_id: data.league_id, visibility }));
  return { league_id: data.league_id as string, name: data.name as string, visibility, members: 1, invite_code: data.invite_code as string, is_member: true, is_owner: true };
}

/** Join by invite code (any league) or by id (public leagues only). */
export async function joinLeague(me: string, by: { code?: string; league_id?: string }): Promise<string> {
  let query = supabaseAdmin.from('leagues').select('league_id, visibility');
  query = by.code ? query.eq('invite_code', by.code) : query.eq('league_id', by.league_id ?? '');
  const { data: league, error } = await query.maybeSingle();
  if (error) fail(error, 'find the league');
  if (!league || (!by.code && league.visibility !== 'public')) throw new DraftError('That league doesn’t exist, or its invite link has changed.', 404);
  const counts = await memberCounts([league.league_id as string]);
  if ((counts.get(league.league_id as string) ?? 0) >= MAX_MEMBERS) throw new DraftError(`This league is full (${MAX_MEMBERS} members).`, 409);
  const { error: joinError } = await supabaseAdmin
    .from('league_members')
    .upsert({ league_id: league.league_id, stake_address: me }, { onConflict: 'league_id,stake_address', ignoreDuplicates: true });
  if (joinError) fail(joinError, 'join the league');
  return league.league_id as string;
}

export async function leaveLeague(me: string, leagueId: string): Promise<void> {
  const { error } = await supabaseAdmin.from('league_members').delete().eq('league_id', leagueId).eq('stake_address', me);
  if (error) fail(error, 'leave the league');
}

/** A league and its leaderboard. Private leagues are visible to members or with the invite code. */
export async function getLeague(
  leagueId: string,
  me: string | null,
  options: { code?: string | null; season?: number | null } = {}
): Promise<{ league: LeagueSummary; board: Leaderboard | null } | null> {
  const { data: league, error } = await supabaseAdmin.from('leagues').select('league_id, name, visibility, invite_code, owner_stake').eq('league_id', leagueId).maybeSingle();
  if (error) fail(error, 'load the league');
  if (!league) return null;
  const { data: members, error: memberError } = await supabaseAdmin.from('league_members').select('stake_address').eq('league_id', leagueId);
  if (memberError) fail(memberError, 'load league members');
  const memberSet = new Set((members ?? []).map((m) => m.stake_address as string));
  const isMember = me !== null && memberSet.has(me);
  if (league.visibility === 'private' && !isMember && options.code !== league.invite_code) return null;
  const board = await getLeaderboard({
    season: options.season ?? null,
    me,
    scope: { kind: 'league', league_id: leagueId, name: league.name as string },
    members: memberSet,
  });
  return {
    league: {
      league_id: leagueId,
      name: league.name as string,
      visibility: league.visibility as 'public' | 'private',
      members: memberSet.size,
      is_member: isMember,
      is_owner: isMember && league.owner_stake === me,
      ...(isMember ? { invite_code: league.invite_code as string } : {}),
    },
    board,
  };
}

/** Resolves an invite code to its league (for the join page). */
export async function leagueByCode(code: string): Promise<{ league_id: string; name: string; members: number } | null> {
  const { data, error } = await supabaseAdmin.from('leagues').select('league_id, name').eq('invite_code', code).maybeSingle();
  if (error) fail(error, 'find the league');
  if (!data) return null;
  const counts = await memberCounts([data.league_id as string]);
  return { league_id: data.league_id as string, name: data.name as string, members: counts.get(data.league_id as string) ?? 0 };
}
