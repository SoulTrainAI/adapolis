/**
 * Default card art from a DRep's own linked X or GitHub account, for DReps
 * whose CIP-119 profile has no picture. The DRep chose to link the account;
 * their own image, or art set by claiming their card, always wins.
 *
 * GitHub avatars are public at github.com/<user>.png. X has no free API, so
 * X pictures are resolved through unavatar.io, whose free tier allows about
 * 25–50 lookups a day per IP: the cron resolves a few per run and stores the
 * result, and browsers never call unavatar directly. LinkedIn photos need a
 * login, so they aren't used.
 */

import { z } from 'zod';
import { supabaseAdmin } from '@/lib/sync/supabase-admin';
import { loadAll } from '@/lib/scoring/govscore-v1';
import { safeHttpsUrl, toDisplayProfile } from '@/lib/metadata/profile-display';
import { isMissingSchema } from '@/lib/season/schema';

const X_PER_RUN = 8;
const RECHECK_DAYS = 30;
const TIMEOUT_MS = 10_000;
const RESERVED_X = new Set(['intent', 'share', 'home', 'search', 'i', 'hashtag', 'explore', 'settings']);

export interface SocialHandle {
  source: 'x' | 'github';
  handle: string;
}

/** The first X or GitHub account among a DRep's links. */
export function socialHandle(links: Array<{ url: string }>): SocialHandle | null {
  for (const { url } of links) {
    const x = url.match(new RegExp('^https://(?:www\\.|mobile\\.)?(?:x|twitter)\\.com/([A-Za-z0-9_]{1,15})(?:[/?#]|$)', 'i'));
    if (x && !RESERVED_X.has(x[1].toLowerCase())) return { source: 'x', handle: x[1] };
    const gh = url.match(new RegExp('^https://(?:www\\.)?github\\.com/([A-Za-z0-9-]{1,39})/?(?:[?#]|$)', 'i'));
    if (gh) return { source: 'github', handle: gh[1] };
  }
  return null;
}

const UnavatarJson = z.object({ url: z.string() });

async function resolveX(handle: string): Promise<{ status: 'ok' | 'none' | 'limited' | 'error'; url: string | null }> {
  try {
    const res = await fetch(`https://unavatar.io/x/${encodeURIComponent(handle)}?json&fallback=false`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (res.status === 429) return { status: 'limited', url: null };
    if (res.status === 404) return { status: 'none', url: null };
    if (!res.ok) return { status: 'error', url: null };
    const body = UnavatarJson.safeParse(await res.json());
    const url = body.success ? safeHttpsUrl(body.data.url) : null;
    return url ? { status: 'ok', url } : { status: 'none', url: null };
  } catch {
    return { status: 'error', url: null };
  }
}

/** Cron step: resolve pictures for DReps with no image of their own. */
export async function refreshSocialAvatars(): Promise<{ checked: number; found: number; limited: boolean }> {
  const [dreps, existing, overrides] = await Promise.all([
    loadAll<{ drep_id: string; is_registered: boolean | null; metadata: unknown; metadata_fetch_status: string | null }>(
      'dreps',
      'drep_id, is_registered, metadata, metadata_fetch_status'
    ),
    supabaseAdmin.from('drep_social_avatars').select('drep_id, source, handle, checked_at'),
    supabaseAdmin.from('drep_profile_overrides').select('drep_id, image'),
  ]);
  if (existing.error) {
    if (isMissingSchema(existing.error)) throw new Error('Table drep_social_avatars is missing: run supabase/migrations/015_social_avatars.sql.');
    throw new Error(`Couldn't load stored avatars: ${existing.error.message}`);
  }
  const known = new Map((existing.data ?? []).map((r) => [r.drep_id as string, r]));
  const claimedArt = new Set((overrides.data ?? []).filter((o) => o.image).map((o) => o.drep_id as string));
  const fresh = (checkedAt: string) => Date.now() - new Date(checkedAt).getTime() < RECHECK_DAYS * 86_400_000;

  const rows: Array<Record<string, unknown>> = [];
  let xBudget = X_PER_RUN;
  let limited = false;
  for (const d of dreps) {
    if (d.is_registered === false || claimedArt.has(d.drep_id)) continue;
    const profile = toDisplayProfile(d.metadata, d.metadata_fetch_status, d.drep_id);
    if (profile.image) continue;
    const social = socialHandle(profile.links);
    if (!social) continue;
    const prev = known.get(d.drep_id);
    if (prev && prev.source === social.source && (prev.handle as string).toLowerCase() === social.handle.toLowerCase() && fresh(prev.checked_at as string)) continue;
    if (social.source === 'github') {
      rows.push({ drep_id: d.drep_id, source: 'github', handle: social.handle, image_url: `https://github.com/${social.handle}.png?size=400`, status: 'ok', checked_at: new Date().toISOString() });
      continue;
    }
    if (xBudget <= 0 || limited) continue;
    xBudget--;
    const r = await resolveX(social.handle);
    if (r.status === 'limited') {
      limited = true;
      continue;
    }
    rows.push({ drep_id: d.drep_id, source: 'x', handle: social.handle, image_url: r.url, status: r.status, checked_at: new Date().toISOString() });
  }
  if (rows.length > 0) {
    const { error } = await supabaseAdmin.from('drep_social_avatars').upsert(rows, { onConflict: 'drep_id' });
    if (error) throw new Error(`Couldn't save avatars: ${error.message}`);
  }
  return { checked: rows.length, found: rows.filter((r) => r.status === 'ok').length, limited };
}

const TTL_MS = 10 * 60 * 1000;
let cache: { at: number; map: Map<string, { url: string; source: 'x' | 'github' }> } | null = null;

/** Stored default pictures by DRep (empty until migration 015 is run). */
export async function getSocialAvatars(): Promise<Map<string, { url: string; source: 'x' | 'github' }>> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.map;
  const { data, error } = await supabaseAdmin.from('drep_social_avatars').select('drep_id, source, image_url').eq('status', 'ok');
  const map = new Map<string, { url: string; source: 'x' | 'github' }>();
  if (!error) for (const r of data ?? []) if (r.image_url) map.set(r.drep_id as string, { url: r.image_url as string, source: r.source as 'x' | 'github' });
  cache = { at: Date.now(), map };
  return map;
}
