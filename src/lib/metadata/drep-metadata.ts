/**
 * CIP-119 DRep metadata via Koios /drep_metadata
 *
 * Koios fetches each anchor, resolves IPFS, and checks the document against the
 * on-chain anchor hash (is_valid). Using it instead of fetching anchors
 * ourselves gives us IPFS support and hash verification without running our
 * own fetcher.
 *
 * @see https://github.com/cardano-foundation/CIPs/blob/master/CIP-0119/README.md
 * @see https://api.koios.rest/#/Governance/drep_metadata
 */

import { z } from 'zod';
import { koiosFetch } from '@/lib/koios/client';
import { supabaseAdmin } from '@/lib/sync/supabase-admin';

const KOIOS_BATCH_SIZE = 50;
const DB_PAGE_SIZE = 1000;

export type MetadataFetchStatus =
  | 'ok'
  | 'no_anchor'
  | 'unreachable'
  | 'hash_mismatch'
  | 'invalid_json'
  | 'schema_mismatch';

const KoiosDRepMetadataSchema = z.object({
  drep_id: z.string(),
  hex: z.string(),
  meta_url: z.string().nullable(),
  meta_hash: z.string().nullable(),
  meta_json: z.unknown().nullable(),
  is_valid: z.boolean().nullable(),
});

// CIP-119 is JSON-LD: any text field may be a plain string or { "@value": "..." }.
const TextValue = z
  .union([z.string(), z.object({ '@value': z.string() })])
  .transform((v) => (typeof v === 'string' ? v : v['@value']).trim());

const ImageValue = z
  .union([z.string(), z.object({ contentUrl: TextValue })])
  .transform((v) => (typeof v === 'string' ? v.trim() : v.contentUrl));

const ReferenceValue = z.object({
  '@type': z.string().optional(),
  label: TextValue.optional(),
  uri: TextValue,
});

export interface DRepProfile {
  givenName?: string;
  image?: string;
  motivations?: string;
  objectives?: string;
  qualifications?: string;
  references?: Array<{ type?: string; label?: string; uri: string }>;
  doNotList: boolean;
}

export interface DRepMetadataRecord {
  drep_id: string;
  hex_id: string;
  metadata: DRepProfile | null;
  metadata_fetch_status: MetadataFetchStatus;
  metadata_fetched_at: string;
}

function optionalField<T>(schema: z.ZodType<T>, value: unknown): T | undefined {
  const parsed = schema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

/**
 * Parses each field independently so one malformed field (common in
 * hand-written CIP-119 files) doesn't discard an otherwise valid profile.
 */
export function parseCip119Body(metaJson: unknown): DRepProfile | null {
  if (typeof metaJson !== 'object' || metaJson === null) return null;
  const body = (metaJson as Record<string, unknown>).body;
  if (typeof body !== 'object' || body === null) return null;
  const b = body as Record<string, unknown>;

  const references = Array.isArray(b.references)
    ? b.references
        .map((r) => optionalField(ReferenceValue, r))
        .filter((r): r is z.infer<typeof ReferenceValue> => r !== undefined && r.uri.length > 0)
        .map((r) => ({ type: r['@type'], label: r.label, uri: r.uri }))
    : undefined;

  const profile: DRepProfile = {
    givenName: optionalField(TextValue, b.givenName) || undefined,
    image: optionalField(ImageValue, b.image) || undefined,
    motivations: optionalField(TextValue, b.motivations) || undefined,
    objectives: optionalField(TextValue, b.objectives) || undefined,
    qualifications: optionalField(TextValue, b.qualifications) || undefined,
    references: references && references.length > 0 ? references : undefined,
    doNotList: b.doNotList === true,
  };

  const hasContent =
    profile.givenName ||
    profile.image ||
    profile.motivations ||
    profile.objectives ||
    profile.qualifications ||
    profile.references;

  return hasContent ? profile : null;
}

export function toMetadataRecord(
  row: z.infer<typeof KoiosDRepMetadataSchema>,
  fetchedAt: string
): DRepMetadataRecord {
  const base = { drep_id: row.drep_id, hex_id: row.hex, metadata_fetched_at: fetchedAt };

  if (!row.meta_url) return { ...base, metadata: null, metadata_fetch_status: 'no_anchor' };
  if (row.meta_json === null || row.meta_json === undefined) {
    return { ...base, metadata: null, metadata_fetch_status: 'unreachable' };
  }
  // Unverified metadata could be swapped after registration, so it is never shown.
  if (row.is_valid === false) return { ...base, metadata: null, metadata_fetch_status: 'hash_mismatch' };
  if (typeof row.meta_json !== 'object') {
    return { ...base, metadata: null, metadata_fetch_status: 'invalid_json' };
  }

  const profile = parseCip119Body(row.meta_json);
  return profile
    ? { ...base, metadata: profile, metadata_fetch_status: 'ok' }
    : { ...base, metadata: null, metadata_fetch_status: 'schema_mismatch' };
}

export async function fetchDRepMetadataRecords(drepIds: string[]): Promise<DRepMetadataRecord[]> {
  const fetchedAt = new Date().toISOString();
  const records: DRepMetadataRecord[] = [];

  for (let i = 0; i < drepIds.length; i += KOIOS_BATCH_SIZE) {
    const batch = drepIds.slice(i, i + KOIOS_BATCH_SIZE);
    const raw = await koiosFetch<unknown>('/drep_metadata', {
      method: 'POST',
      body: { _drep_ids: batch },
    });
    const parsed = z.array(KoiosDRepMetadataSchema).safeParse(raw);
    if (!parsed.success) {
      throw new Error(
        `Koios /drep_metadata returned an unexpected shape for batch starting at ${i}: ${parsed.error.message}. Check https://api.koios.rest/#/Governance/drep_metadata for schema changes.`
      );
    }
    records.push(...parsed.data.map((row) => toMetadataRecord(row, fetchedAt)));
  }

  return records;
}

async function loadAllDRepIds(): Promise<string[]> {
  const ids: string[] = [];
  for (let from = 0; ; from += DB_PAGE_SIZE) {
    const { data, error } = await supabaseAdmin
      .from('dreps')
      .select('drep_id')
      .order('drep_id')
      .range(from, from + DB_PAGE_SIZE - 1);
    if (error) {
      throw new Error(
        `Failed to read DRep IDs from Supabase: ${error.message}. Check SUPABASE_SERVICE_ROLE_KEY and that migrations 001 and 005 have been applied.`
      );
    }
    ids.push(...(data ?? []).map((r: { drep_id: string }) => r.drep_id));
    if (!data || data.length < DB_PAGE_SIZE) return ids;
  }
}

export interface MetadataSyncResult {
  processed: number;
  by_status: Record<MetadataFetchStatus, number>;
  duration_ms: number;
}

/**
 * Refreshes CIP-119 metadata for every DRep already in the dreps table.
 * hex_id is included so the upsert satisfies its NOT NULL constraint; rows
 * always exist already, so it only ever updates.
 */
export async function syncDRepMetadata(): Promise<MetadataSyncResult> {
  const start = Date.now();
  const drepIds = await loadAllDRepIds();
  const records = await fetchDRepMetadataRecords(drepIds);

  for (let i = 0; i < records.length; i += DB_PAGE_SIZE) {
    const { error } = await supabaseAdmin
      .from('dreps')
      .upsert(records.slice(i, i + DB_PAGE_SIZE), { onConflict: 'drep_id' });
    if (error) {
      throw new Error(
        `Failed to save DRep metadata: ${error.message}. If the error mentions metadata_fetch_status, apply migration 005 in the Supabase SQL editor.`
      );
    }
  }

  const by_status: Record<MetadataFetchStatus, number> = {
    ok: 0,
    no_anchor: 0,
    unreachable: 0,
    hash_mismatch: 0,
    invalid_json: 0,
    schema_mismatch: 0,
  };
  for (const r of records) by_status[r.metadata_fetch_status]++;

  const result = { processed: records.length, by_status, duration_ms: Date.now() - start };
  console.log(JSON.stringify({ event: 'drep_metadata_sync_complete', ...result }));
  return result;
}
