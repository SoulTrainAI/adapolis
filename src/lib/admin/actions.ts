/** Admin moderation and operations. Every change is written to the public audit log first-class with its before/after. */

import { supabaseAdmin } from '@/lib/sync/supabase-admin';
import { getOverrides, sanitize, OverrideInput } from '@/lib/drep-profile/overrides';

export async function logAction(admin: string, action: string, target: string, details: Record<string, unknown>): Promise<void> {
  const { error } = await supabaseAdmin.from('admin_actions').insert({ admin_stake: admin, action, target, details });
  if (error) throw new Error(`Couldn't write the audit log (${error.message}); the change was not made. Run supabase/migrations/021_admin_moderation.sql.`);
}

export async function searchTeams(q: string) {
  const { data, error } = await supabaseAdmin
    .from('fantasy_rosters')
    .select('roster_id, season_number, team_name, stake_address')
    .ilike('team_name', `%${q.replace(/[%_]/g, '')}%`)
    .order('season_number', { ascending: false })
    .limit(50);
  if (error) throw new Error(`Couldn't search teams: ${error.message}`);
  return (data ?? []).map((r) => ({ ...r, stake_tail: (r.stake_address as string).slice(-6), stake_address: undefined }));
}

export async function renameTeam(admin: string, rosterId: string, name: string | null, reason: string) {
  const { data: before } = await supabaseAdmin.from('fantasy_rosters').select('team_name').eq('roster_id', rosterId).maybeSingle();
  if (!before) throw new Error('No team with that id.');
  await logAction(admin, 'rename_team', rosterId, { from: before.team_name, to: name, reason });
  const { error } = await supabaseAdmin.from('fantasy_rosters').update({ team_name: name }).eq('roster_id', rosterId);
  if (error) throw new Error(`Couldn't rename the team: ${error.message}`);
}

export async function searchLeagues(q: string) {
  const { data, error } = await supabaseAdmin.from('leagues').select('league_id, name, visibility, created_at').ilike('name', `%${q.replace(/[%_]/g, '')}%`).limit(50);
  if (error) throw new Error(`Couldn't search leagues: ${error.message}`);
  return data ?? [];
}

export async function renameLeague(admin: string, leagueId: string, name: string, reason: string) {
  if (name.length < 3 || name.length > 40) throw new Error('League names are 3–40 characters.');
  const { data: before } = await supabaseAdmin.from('leagues').select('name').eq('league_id', leagueId).maybeSingle();
  if (!before) throw new Error('No league with that id.');
  await logAction(admin, 'rename_league', leagueId, { from: before.name, to: name, reason });
  const { error } = await supabaseAdmin.from('leagues').update({ name }).eq('league_id', leagueId);
  if (error) throw new Error(`Couldn't rename the league: ${error.message}`);
}

export async function getProfileRow(drepId: string): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabaseAdmin.from('drep_profile_overrides').select('*').eq('drep_id', drepId).maybeSingle();
  if (error) throw new Error(`Couldn't read the profile: ${error.message}`);
  return data;
}

/** Hide or restore a DRep's image or bio (on-chain and claimed alike). Never edits what a DRep wrote. */
export async function moderateProfile(admin: string, drepId: string, change: { hide_image?: boolean; hide_bio?: boolean; note: string }) {
  if (!/^drep1[02-9ac-hj-np-z]{20,100}$/.test(drepId)) throw new Error('Expected a DRep ID (drep1…).');
  const before = await getProfileRow(drepId);
  await logAction(admin, 'moderate_profile', drepId, { before: { hide_image: before?.hide_image ?? false, hide_bio: before?.hide_bio ?? false }, change });
  const row = {
    drep_id: drepId,
    ...(before ? {} : { image: null, bio: null, links: null }),
    ...(change.hide_image !== undefined ? { hide_image: change.hide_image } : {}),
    ...(change.hide_bio !== undefined ? { hide_bio: change.hide_bio } : {}),
    moderation_note: change.note.slice(0, 300) || null,
    moderated_at: new Date().toISOString(),
  };
  const { error } = await supabaseAdmin.from('drep_profile_overrides').upsert(row);
  if (error) throw new Error(`Couldn't save the moderation: ${error.message}. Run migration 021.`);
  await getOverrides(true);
}

/** Full edit, only for profiles no DRep has claimed (rows ADApolis created), e.g. for testing. */
export async function editUnclaimedProfile(admin: string, drepId: string, input: unknown) {
  const before = await getProfileRow(drepId);
  if (before && before.edited_by_admin !== true) throw new Error('This DRep has claimed their profile. You can hide content, but not edit what they wrote.');
  const parsed = OverrideInput.safeParse(input);
  if (!parsed.success) throw new Error('Invalid profile fields.');
  const clean = sanitize(parsed.data);
  if (!clean.ok) throw new Error(clean.error);
  await logAction(admin, 'edit_unclaimed_profile', drepId, { before: before ?? null, after: clean.value });
  const { error } = await supabaseAdmin
    .from('drep_profile_overrides')
    .upsert({ drep_id: drepId, ...clean.value, edited_by_admin: true, moderated_at: new Date().toISOString(), updated_at: new Date().toISOString() });
  if (error) throw new Error(`Couldn't save: ${error.message}. Run migration 021.`);
  await getOverrides(true);
}

export async function recentActions(limit = 100) {
  const { data, error } = await supabaseAdmin.from('admin_actions').select('*').order('created_at', { ascending: false }).limit(limit);
  if (error) return [];
  return data ?? [];
}
