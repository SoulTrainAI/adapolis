/**
 * A DRep's vote rationale for one proposal, read from the document anchored
 * to the vote on-chain (via Koios), for display as a readable page instead
 * of raw JSON-LD.
 */

import { z } from 'zod';
import { koiosFetch } from '@/lib/koios/client';
import { supabaseAdmin } from '@/lib/sync/supabase-admin';
import { toDisplayProfile } from '@/lib/metadata/profile-display';
import { publicUrl } from '@/lib/utils/links';
import { fetchAnchor } from './anchor';

const SECTIONS = [
  ['summary', 'Summary'],
  ['rationaleStatement', 'Rationale'],
  ['precedentDiscussion', 'Precedent'],
  ['counterargumentDiscussion', 'Counterarguments'],
  ['conclusion', 'Conclusion'],
  ['comment', 'Comment'],
] as const;

export interface Rationale {
  drep_id: string;
  drep_name: string | null;
  proposal_id: string;
  proposal_title: string | null;
  vote: 'Yes' | 'No' | 'Abstain';
  voted_at: string;
  sections: Array<{ heading: string; text: string }>;
  /** false when the DRep attached a rationale but neither Koios nor we could read it. */
  readable: boolean;
  /** Whether the document matches the hash recorded on-chain; null if it couldn't be checked. */
  hash_matches: boolean | null;
  references: Array<{ label: string; url: string }>;
  source_url: string | null;
}

const RowSchema = z.object({
  vote: z.enum(['Yes', 'No', 'Abstain']),
  block_time: z.number(),
  meta_url: z.string().nullable(),
  meta_hash: z.string().nullable().optional(),
  meta_json: z.unknown().nullable(),
});

function text(v: unknown): string | null {
  if (typeof v === 'string') return v.trim() || null;
  if (v && typeof v === 'object' && typeof (v as Record<string, unknown>)['@value'] === 'string') {
    return ((v as Record<string, string>)['@value']).trim() || null;
  }
  return null;
}

const cache = new Map<string, { value: Rationale | null; at: number }>();
const TTL_MS = 60 * 60 * 1000;

export async function loadRationale(drepId: string, proposalId: string): Promise<Rationale | null> {
  const key = `${drepId}|${proposalId}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;

  const raw = await koiosFetch<unknown>(
    `/vote_list?voter_id=eq.${encodeURIComponent(drepId)}&proposal_id=eq.${encodeURIComponent(proposalId)}&select=vote,block_time,meta_url,meta_hash,meta_json&order=block_time.desc&limit=5`,
    { method: 'GET' }
  );
  const rows = z.array(RowSchema).parse(raw);
  // Latest vote that carries a rationale; a DRep may have re-voted.
  const row = rows.find((r) => r.meta_url !== null || r.meta_json !== null) ?? null;
  if (!row) {
    cache.set(key, { value: null, at: Date.now() });
    return null;
  }

  let doc: unknown = row.meta_json;
  let plainText: string | null = null;
  let hashMatches: boolean | null = row.meta_json !== null ? true : null;
  if (doc === null && row.meta_url) {
    const fetched = await fetchAnchor(row.meta_url, row.meta_hash ?? null);
    if (fetched) {
      doc = fetched.json;
      hashMatches = fetched.hashMatches;
      if (fetched.json === null) plainText = fetched.text.trim() || null;
    }
  }

  const body = (doc && typeof doc === 'object' ? ((doc as { body?: unknown }).body ?? {}) : {}) as Record<string, unknown>;
  const sections = plainText
    ? [{ heading: 'Rationale', text: plainText }]
    : SECTIONS.flatMap(([field, heading]) => {
        const t = text(body[field]);
        return t ? [{ heading, text: t }] : [];
      });
  const readable = doc !== null || plainText !== null;
  const references = (Array.isArray(body.references) ? body.references : []).flatMap((r) => {
    const ref = r as { label?: unknown; uri?: unknown };
    const url = typeof ref.uri === 'string' ? publicUrl(ref.uri) : null;
    return url ? [{ label: text(ref.label) ?? url, url }] : [];
  });

  const [{ data: drep }, { data: proposal }] = await Promise.all([
    supabaseAdmin.from('dreps').select('metadata, metadata_fetch_status').eq('drep_id', drepId).maybeSingle(),
    supabaseAdmin.from('proposals').select('title').eq('proposal_id', proposalId).maybeSingle(),
  ]);

  const value: Rationale = {
    drep_id: drepId,
    drep_name: drep ? toDisplayProfile(drep.metadata, (drep.metadata_fetch_status as string | null) ?? null).name : null,
    proposal_id: proposalId,
    proposal_title: (proposal?.title as string | null | undefined) ?? null,
    vote: row.vote,
    voted_at: new Date(row.block_time * 1000).toISOString(),
    sections,
    readable,
    hash_matches: hashMatches,
    references,
    source_url: publicUrl(row.meta_url),
  };
  if (readable) cache.set(key, { value, at: Date.now() });
  return value;
}

