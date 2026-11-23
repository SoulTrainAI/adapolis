/**
 * Card art, bio and links a DRep set on adapolis.net after signing with its
 * DRep key. They sit on top of the on-chain CIP-119 profile and never touch
 * stats. Everything is re-checked on the way out, like on-chain profiles.
 */

import { z } from 'zod';
import { supabaseAdmin } from '@/lib/sync/supabase-admin';
import { uniqueLinks, cleanText, hostLabel, safeHttpsUrl, safeImageUrl } from '@/lib/metadata/profile-display';

export interface ProfileOverride {
  image: string | null;
  bio: string | null;
  links: Array<{ label: string; url: string }> | null;
  updated_at?: string;
}

export const OverrideInput = z.object({
  image: z.string().max(500).nullable(),
  bio: z.string().max(1500).nullable(),
  links: z
    .array(z.object({ label: z.string().max(40), url: z.string().max(500) }))
    .max(8)
    .nullable(),
});

const MISSING_TABLE = 'Table drep_profile_overrides is missing: run supabase/migrations/013_drep_claims.sql in the Supabase SQL Editor.';

/** Cleans what a DRep submitted; returns an error message for anything we won't show. */
export function sanitize(input: z.infer<typeof OverrideInput>): { ok: true; value: ProfileOverride } | { ok: false; error: string } {
  let image: string | null = null;
  if (input.image && input.image.trim()) {
    // Same rule as on-chain images, minus embedded data: an https or ipfs:// link.
    image = input.image.trim().startsWith('data:') ? null : safeImageUrl(input.image.trim());
    if (!image) return { ok: false, error: 'The image must be an https:// or ipfs:// link to a picture.' };
  }
  const links: Array<{ label: string; url: string }> = [];
  for (const l of input.links ?? []) {
    if (!l.url.trim()) continue;
    const url = safeHttpsUrl(l.url);
    if (!url) return { ok: false, error: `Links must start with https:// (check "${l.url.slice(0, 40)}").` };
    links.push({ label: cleanText(l.label, 40) ?? hostLabel(url), url });
  }
  return { ok: true, value: { image, bio: cleanText(input.bio, 1500), links: input.links === null ? null : uniqueLinks(links) } };
}

const TTL_MS = 60 * 1000;
let cache: { at: number; map: Map<string, ProfileOverride> } | null = null;

export async function getOverrides(): Promise<Map<string, ProfileOverride>> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.map;
  const { data, error } = await supabaseAdmin.from('drep_profile_overrides').select('drep_id, image, bio, links, updated_at');
  if (error) {
    // Missing table (migration not run yet) means no overrides, not a broken site.
    if (error.code !== '42P01') console.error(JSON.stringify({ event: 'overrides_read_failed', error: error.message }));
    return new Map();
  }
  const map = new Map<string, ProfileOverride>();
  for (const r of (data ?? []) as Array<ProfileOverride & { drep_id: string }>) map.set(r.drep_id, { image: r.image, bio: r.bio, links: r.links, updated_at: r.updated_at });
  cache = { at: Date.now(), map };
  return map;
}

export async function getOverride(drepId: string): Promise<ProfileOverride | null> {
  return (await getOverrides()).get(drepId) ?? null;
}

/** Saves the DRep's edits. Resetting stores all-null fields (rows are never deleted). */
export async function saveOverride(drepId: string, value: ProfileOverride | null): Promise<void> {
  const v = value ?? { image: null, bio: null, links: null };
  const { error } = await supabaseAdmin
    .from('drep_profile_overrides')
    .upsert({ drep_id: drepId, image: v.image, bio: v.bio, links: v.links, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.code === '42P01' ? MISSING_TABLE : `Couldn't save the card: ${error.message}`);
  cache = null;
}

/** The profile to show: each field the DRep set here wins over the on-chain one. */
export function applyOverride<T extends { image: string | null; bio?: string | null; links?: Array<{ label: string; url: string }> }>(profile: T, o: ProfileOverride | null | undefined): T {
  if (!o) return profile;
  return {
    ...profile,
    image: o.image ?? profile.image,
    ...('bio' in profile ? { bio: o.bio ?? profile.bio } : {}),
    ...('links' in profile ? { links: o.links ?? profile.links } : {}),
  };
}
