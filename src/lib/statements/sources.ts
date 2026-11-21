/**
 * Collects a DRep's own published words: its CIP-119 profile (already stored)
 * and its CIP-100/136 vote rationales (read from Koios, which has verified
 * each against its on-chain hash). These are the only inputs the summarizer
 * may draw on.
 */

import { createHash } from 'node:crypto';
import { z } from 'zod';
import { koiosFetch } from '@/lib/koios/client';

export const SOURCE_LIMITS = {
  maxRationales: 40,
  maxCharsPerSource: 2000,
  maxProfileChars: 3000,
} as const;

const RATIONALE_FIELDS = [
  'summary',
  'rationaleStatement',
  'precedentDiscussion',
  'counterargumentDiscussion',
  'conclusion',
  'comment',
] as const;

export interface StatementSource {
  index: number;
  kind: 'profile' | 'rationale';
  text: string;
  url: string | null;
  proposal_id: string | null;
}

function textValue(v: unknown): string | null {
  if (typeof v === 'string') return v.trim() || null;
  if (v && typeof v === 'object' && typeof (v as Record<string, unknown>)['@value'] === 'string') {
    return ((v as Record<string, string>)['@value']).trim() || null;
  }
  return null;
}

export function profileText(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const m = metadata as Record<string, unknown>;
  const parts = [
    ['Objectives', m.objectives],
    ['Motivations', m.motivations],
    ['Qualifications', m.qualifications],
  ]
    .map(([label, v]) => {
      const t = textValue(v);
      return t ? `${label}: ${t}` : null;
    })
    .filter((x): x is string => x !== null);
  const joined = parts.join('\n\n').slice(0, SOURCE_LIMITS.maxProfileChars);
  return joined.length >= 20 ? joined : null;
}

export function rationaleText(metaJson: unknown): string | null {
  const body = (metaJson as { body?: Record<string, unknown> } | null)?.body;
  if (!body) return null;
  const parts = RATIONALE_FIELDS.map((f) => textValue(body[f])).filter((x): x is string => x !== null);
  const joined = parts.join('\n\n');
  return joined.length >= 20 ? joined : null;
}

/**
 * Changes whenever the DRep's profile or set of rationale anchors changes, so
 * unchanged DReps are skipped without calling Koios or the AI.
 */
export function inputFingerprint(metadata: unknown, rationaleUrls: string[]): string {
  return createHash('sha256')
    .update(JSON.stringify(metadata ?? null))
    .update('\n')
    .update([...rationaleUrls].sort().join('\n'))
    .digest('hex');
}

const RationaleRowSchema = z.object({
  proposal_id: z.string(),
  block_time: z.number(),
  meta_url: z.string().nullable(),
  meta_json: z.unknown().nullable(),
});

export async function loadSources(drepId: string, metadata: unknown): Promise<StatementSource[]> {
  const sources: StatementSource[] = [];
  const profile = profileText(metadata);
  if (profile) sources.push({ index: 0, kind: 'profile', text: profile, url: null, proposal_id: null });

  const raw = await koiosFetch<unknown>(
    `/vote_list?voter_id=eq.${encodeURIComponent(drepId)}&meta_json=not.is.null&select=proposal_id,block_time,meta_url,meta_json&order=block_time.desc&limit=200`,
    { method: 'GET' }
  );
  const rows = z.array(RationaleRowSchema).parse(raw);

  // DReps often reuse one rationale across many votes; each distinct text once.
  const seen = new Set<string>();
  for (const row of rows) {
    if (sources.filter((s) => s.kind === 'rationale').length >= SOURCE_LIMITS.maxRationales) break;
    const text = rationaleText(row.meta_json);
    if (!text) continue;
    const key = createHash('sha1').update(text).digest('hex');
    if (seen.has(key)) continue;
    seen.add(key);
    sources.push({
      index: sources.length,
      kind: 'rationale',
      text: text.slice(0, SOURCE_LIMITS.maxCharsPerSource),
      url: row.meta_url,
      proposal_id: row.proposal_id,
    });
  }
  return sources;
}
