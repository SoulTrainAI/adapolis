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
 *
 * Some DReps publish a tiny picture (64×64) that looks blurry on a card. When
 * their own image is under MIN_OWN_PX and they link an X or GitHub account,
 * that account's larger picture is used instead (still their own choice of
 * picture); claimed-card art always wins over both.
 */

import { z } from 'zod';
import { supabaseAdmin } from '@/lib/sync/supabase-admin';
import { loadAll } from '@/lib/scoring/govscore-v1';
import { embeddedImage, imageSource, safeHttpsUrl, safeImageUrl, toDisplayProfile } from '@/lib/metadata/profile-display';
import { isSafeHttpsUrl } from '@/lib/rationale/anchor';
import { imageSize, largestXAvatar } from './image-size';
import { isMissingSchema } from '@/lib/season/schema';

const X_PER_RUN = 8;
const RECHECK_DAYS = 30;
const TIMEOUT_MS = 10_000;
const MIN_OWN_PX = 160;
const PROBES_PER_RUN = 40;
const SIZE_PROBE_BYTES = 64 * 1024;
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
    const url = body.success ? safeHttpsUrl(largestXAvatar(body.data.url)) : null;
    return url ? { status: 'ok', url } : { status: 'none', url: null };
  } catch {
    return { status: 'error', url: null };
  }
}

/** Smaller side of the DRep's own CIP-119 picture, or null if it can't be measured. */
async function ownImagePx(metadata: unknown, drepId: string): Promise<number | null> {
  const embedded = embeddedImage(metadata);
  let bytes: Uint8Array | null = embedded ? new Uint8Array(embedded.bytes) : null;
  if (!bytes) {
    const src = typeof metadata === 'object' && metadata !== null ? imageSource((metadata as Record<string, unknown>).image) : null;
    const url = src ? safeImageUrl(src, drepId) : null;
    if (!url || !isSafeHttpsUrl(url)) return null;
    try {
      const res = await fetch(url, { headers: { Range: `bytes=0-${SIZE_PROBE_BYTES - 1}` }, signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (!res.ok) return null;
      bytes = new Uint8Array((await res.arrayBuffer()).slice(0, SIZE_PROBE_BYTES));
    } catch {
      return null;
    }
  }
  const size = imageSize(bytes);
  return size ? Math.min(size.width, size.height) : null;
}

/** Cron step: resolve pictures for DReps with no image of their own, or one too small for a card. */
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
  let probes = PROBES_PER_RUN;
  let limited = false;
  for (const d of dreps) {
    if (d.is_registered === false || claimedArt.has(d.drep_id)) continue;
    const profile = toDisplayProfile(d.metadata, d.metadata_fetch_status, d.drep_id);
    const social = socialHandle(profile.links);
    if (!social) continue;
    const prev = known.get(d.drep_id);
    if (prev && prev.source === social.source && (prev.handle as string).toLowerCase() === social.handle.toLowerCase() && fresh(prev.checked_at as string)) continue;
    let ownPx: number | null = null;
    const checkedAt = new Date().toISOString();
    if (profile.image) {
      if (probes <= 0) continue;
      probes--;
      ownPx = await ownImagePx(d.metadata, d.drep_id);
      // Recorded either way so the image is measured once a month, not every run.
      if (ownPx === null || ownPx >= MIN_OWN_PX) {
        rows.push({ drep_id: d.drep_id, source: social.source, handle: social.handle, image_url: null, status: ownPx === null ? 'error' : 'none', own_image_px: ownPx ?? 0, checked_at: checkedAt });
        continue;
      }
    }
    const base = { drep_id: d.drep_id, handle: social.handle, own_image_px: ownPx, checked_at: checkedAt };
    if (social.source === 'github') {
      rows.push({ ...base, source: 'github', image_url: `https://github.com/${social.handle}.png?size=400`, status: 'ok' });
      continue;
    }
    if (xBudget <= 0 || limited) continue;
    xBudget--;
    const r = await resolveX(social.handle);
    if (r.status === 'limited') {
      limited = true;
      continue;
    }
    rows.push({ ...base, source: 'x', image_url: r.url, status: r.status });
  }
  if (rows.length > 0) {
    let { error } = await supabaseAdmin.from('drep_social_avatars').upsert(rows, { onConflict: 'drep_id' });
    if (error && /own_image_px/.test(error.message)) {
      // Migration 019 not run yet: keep the old behaviour (only DReps with no image of their own).
      const legacy = rows
        .filter((r) => r.own_image_px === null)
        .map((r) => Object.fromEntries(Object.entries(r).filter(([k]) => k !== 'own_image_px')));
      ({ error } = legacy.length ? await supabaseAdmin.from('drep_social_avatars').upsert(legacy, { onConflict: 'drep_id' }) : { error: null });
    }
    if (error) throw new Error(`Couldn't save avatars: ${error.message}`);
  }
  return { checked: rows.length, found: rows.filter((r) => r.status === 'ok').length, limited };
}

const TTL_MS = 10 * 60 * 1000;

export interface SocialAvatar {
  url: string;
  source: 'x' | 'github';
  /** True when this replaces a DRep's own picture that is too small for a card. */
  replacesOwn: boolean;
}

let cache: { at: number; map: Map<string, SocialAvatar> } | null = null;

/** Stored default pictures by DRep (empty until migration 015 is run). */
export async function getSocialAvatars(): Promise<Map<string, SocialAvatar>> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.map;
  // '*' so this keeps working before migration 019 adds own_image_px.
  const { data, error } = await supabaseAdmin.from('drep_social_avatars').select('*').eq('status', 'ok');
  const map = new Map<string, SocialAvatar>();
  if (!error)
    for (const r of data ?? []) {
      if (!r.image_url) continue;
      const own = typeof r.own_image_px === 'number' ? r.own_image_px : null;
      map.set(r.drep_id as string, {
        url: r.source === 'x' ? largestXAvatar(r.image_url as string) : (r.image_url as string),
        source: r.source as 'x' | 'github',
        replacesOwn: own !== null && own < MIN_OWN_PX,
      });
    }
  cache = { at: Date.now(), map };
  return map;
}

/** The picture a card shows: the DRep's own, unless it's missing or too small and a linked-account picture exists. */
export function cardImage(own: string | null, social: SocialAvatar | undefined): string | null {
  if (!social) return own;
  return !own || social.replacesOwn ? social.url : own;
}
