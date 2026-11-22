/**
 * "Link Discord": Discord sign-in (OAuth2, identify + guilds.join), then the
 * bot gives roles for what the visitor proved on adapolis.net:
 *   Verified DRep: signed with a registered DRep key (CIP-95).
 *   Delegator: signed-in wallet delegates to a DRep.
 *   Player: signed-in wallet has a fantasy team this season.
 * Roles are only ever added here, never removed.
 */

import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { sign, unsign } from '@/lib/auth/session';
import { SITE_URL } from '@/lib/site/social';
import { supabaseAdmin } from '@/lib/sync/supabase-admin';
import { lookupDelegation } from '@/lib/koios/delegation';
import { draftSeason } from '@/lib/season/fantasy';
import { discord, guildId, listRoles } from './rest';

export const STATE_COOKIE = 'adapolis_discord_state';
const STATE_TTL_MS = 10 * 60 * 1000;
export const REDIRECT_URI = `${SITE_URL}/api/discord/callback`;

export function linkConfigured(): boolean {
  return Boolean(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET && process.env.DISCORD_BOT_TOKEN && process.env.DISCORD_GUILD_ID);
}

/** Authorize URL plus the nonce to bind into a cookie, so a stolen state can't be replayed from another browser. */
export function authorizeUrl(): { url: string; nonce: string } {
  const nonce = randomBytes(16).toString('hex');
  const state = sign('discord-state', { n: nonce, iat: Date.now() });
  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID ?? '',
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: 'identify guilds.join',
    state,
    prompt: 'none',
  });
  return { url: `https://discord.com/oauth2/authorize?${params}`, nonce };
}

export function checkState(state: string | null, cookieNonce: string | undefined): boolean {
  if (!state || !cookieNonce) return false;
  const claims = unsign('discord-state', state);
  if (typeof claims !== 'object' || claims === null) return false;
  const { n, iat } = claims as { n?: unknown; iat?: unknown };
  return typeof n === 'string' && n === cookieNonce && typeof iat === 'number' && Date.now() - iat < STATE_TTL_MS;
}

const TokenSchema = z.object({ access_token: z.string(), token_type: z.string() });
const UserSchema = z.object({ id: z.string(), username: z.string(), global_name: z.string().nullable().optional() });

export interface LinkResult {
  username: string;
  granted: string[];
  joined: boolean;
}

export async function completeLink(code: string, proofs: { drepId: string | null; stakeAddress: string | null }): Promise<LinkResult> {
  const tokenRes = await fetch('https://discord.com/api/v10/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      client_id: process.env.DISCORD_CLIENT_ID ?? '',
      client_secret: process.env.DISCORD_CLIENT_SECRET ?? '',
    }),
  });
  const tokenJson: unknown = await tokenRes.json().catch(() => null);
  if (!tokenRes.ok) {
    throw new Error(
      `Discord didn't accept the sign-in (HTTP ${tokenRes.status}). Check DISCORD_CLIENT_ID / DISCORD_CLIENT_SECRET and that ${REDIRECT_URI} is listed under OAuth2 → Redirects.`
    );
  }
  const { access_token } = TokenSchema.parse(tokenJson);
  const userRes = await fetch('https://discord.com/api/v10/users/@me', { headers: { Authorization: `Bearer ${access_token}` } });
  if (!userRes.ok) throw new Error(`Couldn't read your Discord profile (HTTP ${userRes.status}). Try linking again.`);
  const user = UserSchema.parse(await userRes.json());

  // Work out which roles the proofs earn.
  const wanted: string[] = [];
  if (proofs.drepId) {
    const { data } = await supabaseAdmin.from('dreps').select('is_registered').eq('drep_id', proofs.drepId).maybeSingle();
    if ((data as { is_registered?: boolean } | null)?.is_registered) wanted.push('Verified DRep');
  }
  if (proofs.stakeAddress) {
    const delegated = await lookupDelegation(proofs.stakeAddress).catch(() => null);
    if (delegated?.startsWith('drep1')) wanted.push('Delegator');
    const season = await draftSeason().catch(() => null);
    if (season) {
      const { data } = await supabaseAdmin.from('fantasy_rosters').select('roster_id').eq('stake_address', proofs.stakeAddress).eq('season_number', season.season_number).limit(1);
      if (data?.length) wanted.push('Player');
    }
  }

  const roles = await listRoles();
  const roleIds = wanted.map((name) => roles.find((r) => r.name === name)?.id).filter((id): id is string => Boolean(id));
  const gid = guildId();
  // Adds them to the server if they aren't in it yet (201), or does nothing if they are (204).
  const joinRes = await fetch(`https://discord.com/api/v10/guilds/${gid}/members/${user.id}`, {
    method: 'PUT',
    headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ access_token, roles: roleIds }),
  });
  if (!joinRes.ok && joinRes.status !== 204) throw new Error(`Couldn't add you to the ADApolis server (HTTP ${joinRes.status}). Try again, or join from the invite link first.`);
  const joined = joinRes.status === 201;
  if (!joined) {
    for (const id of roleIds) await discord('PUT', `/guilds/${gid}/members/${user.id}/roles/${id}`, undefined, { reason: 'ADApolis: linked on adapolis.net' });
  }

  const { error } = await supabaseAdmin.from('discord_links').upsert({
    discord_user_id: user.id,
    discord_username: user.username,
    stake_address: proofs.stakeAddress,
    drep_id: proofs.drepId && wanted.includes('Verified DRep') ? proofs.drepId : null,
    roles: wanted,
    linked_at: new Date().toISOString(),
  });
  if (error) console.error(JSON.stringify({ event: 'discord_link_record_failed', error: error.message }));

  return { username: user.global_name ?? user.username, granted: wanted, joined };
}
