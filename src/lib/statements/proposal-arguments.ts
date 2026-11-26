/**
 * Arguments for and against the real proposals in the Find My DRep quiz,
 * summarized from the published rationales of DReps who voted Yes and No.
 *
 * "For" points may only cite Yes rationales and "against" points only No
 * rationales, and every point must carry a verbatim quote from the rationale
 * it cites, so the summary can't invent or misattribute an argument.
 */

import { createHash } from 'node:crypto';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { koiosFetch } from '@/lib/koios/client';
import { supabaseAdmin } from '@/lib/sync/supabase-admin';
import { rationaleText } from './sources';
import { publicUrl } from '@/lib/utils/links';
import { toDisplayProfile } from '@/lib/metadata/profile-display';
import { DEFAULT_STATEMENTS_MODEL, priceFor } from './summarize';

const MAX_RATIONALES_PER_SIDE = 30;
const MAX_CHARS_PER_RATIONALE = 1500;
const MAX_POINTS_PER_SIDE = 3;

export interface ProposalArgument {
  text: string;
  /** Verbatim words from the cited rationale */
  quote: string;
  /** Browser-openable link to the full rationale */
  url: string | null;
  drep_id: string | null;
  /** Resolved when loaded, so renamed DReps show their current name */
  drep_name?: string | null;
}

export interface ProposalArguments {
  for: ProposalArgument[];
  against: ProposalArgument[];
  for_sources: number;
  against_sources: number;
  /** "State of the debate": short neutral AI summary; null until generated (migration 024). */
  debate_summary: string | null;
}

interface Rationale {
  index: number;
  drep_id: string;
  side: 'yes' | 'no';
  text: string;
  url: string | null;
}

const VoteRowSchema = z.object({
  voter_id: z.string(),
  vote: z.enum(['Yes', 'No', 'Abstain']),
  meta_url: z.string().nullable(),
  meta_json: z.unknown().nullable(),
});

async function loadRationales(proposalId: string): Promise<Rationale[]> {
  const raw = await koiosFetch<unknown>(
    `/vote_list?proposal_id=eq.${encodeURIComponent(proposalId)}&voter_role=eq.DRep&select=voter_id,vote,block_time,meta_url,meta_json&order=block_time.desc&limit=1000`,
    { method: 'GET' }
  );
  const parsed = z.array(VoteRowSchema).safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      `Koios /vote_list returned an unexpected shape for ${proposalId}: ${parsed.error.message}. Check https://api.koios.rest/#/Governance/vote_list for schema changes.`
    );
  }

  const seenVoters = new Set<string>();
  const seenTexts = new Set<string>();
  const out: Rationale[] = [];
  const count = { yes: 0, no: 0 };
  for (const row of parsed.data) {
    // Newest first, so a DRep that changed its vote is counted by its latest one.
    if (seenVoters.has(row.voter_id)) continue;
    seenVoters.add(row.voter_id);
    if (row.vote === 'Abstain') continue;
    const side = row.vote === 'Yes' ? 'yes' : 'no';
    if (count[side] >= MAX_RATIONALES_PER_SIDE) continue;
    const text = rationaleText(row.meta_json);
    if (!text) continue;
    const key = createHash('sha1').update(text).digest('hex');
    if (seenTexts.has(key)) continue;
    seenTexts.add(key);
    count[side]++;
    out.push({ index: out.length, drep_id: row.voter_id, side, text: text.slice(0, MAX_CHARS_PER_RATIONALE), url: row.meta_url });
  }
  return out;
}

// Bump when the prompt changes so every proposal is regenerated once.
const PROMPT_VERSION = 'v3-debate-summary';

function fingerprint(rationales: Rationale[]): string {
  return createHash('sha256')
    .update(PROMPT_VERSION + '\n')
    .update(rationales.map((r) => `${r.side}:${createHash('sha1').update(r.text).digest('hex')}`).sort().join('\n'))
    .digest('hex');
}

const SYSTEM_PROMPT = `You summarize the main arguments Cardano DReps gave for and against one governance proposal, using only the vote rationales provided.

Rules:
- "for" points must come from rationales marked side="yes"; "against" points only from side="no".
- Give up to ${MAX_POINTS_PER_SIDE} distinct points per side, most common or most substantive first. Merge rationales that make the same point.
- text: a neutral label for the argument in at most 12 words (used only to tell points apart; readers see the quote).
- quote: 1 to 3 COMPLETE, consecutive sentences copied EXACTLY from the cited rationale that state the argument clearly on their own. Start at the beginning of a sentence and end at its final punctuation. At most 80 words. Do not paraphrase, trim mid-sentence or join separate passages.
- source_index: the index of the rationale quoted.
- debate_summary: 2 or 3 neutral sentences (at most 60 words) for a newcomer: what the proposal asks for and the main point of disagreement between the Yes and No sides, as the rationales put it. No names, no verdict on who is right, no prediction of the outcome, no political labels. Empty string if there are no rationales.
- Skip thanks, procedural remarks and anything that isn't a reason to pass or reject. Fewer points is better than weak ones.

Call the record_arguments tool exactly once.`;

const POINT_SCHEMA = {
  type: 'object',
  properties: {
    text: { type: 'string' },
    quote: { type: 'string' },
    source_index: { type: 'integer' },
  },
  required: ['text', 'quote', 'source_index'],
} as const;

const TOOL: Anthropic.Tool = {
  name: 'record_arguments',
  description: 'Record the arguments for and against the proposal, each backed by a verbatim quote.',
  input_schema: {
    type: 'object',
    properties: {
      for: { type: 'array', items: POINT_SCHEMA },
      against: { type: 'array', items: POINT_SCHEMA },
      debate_summary: { type: 'string' },
    },
    required: ['for', 'against', 'debate_summary'],
  },
};

const PointSchema = z.object({ text: z.string().min(3).max(240), quote: z.string(), source_index: z.number().int() });
const ToolInputSchema = z.object({ for: z.array(z.unknown()).default([]), against: z.array(z.unknown()).default([]), debate_summary: z.string().default('') });

const LOADED = /\b(left|right)[- ]?(wing|leaning)|\b(conservative|liberal|progressive|libertarian|socialist|populist)\b|\b(will|is going to|is likely to) (pass|fail)\b/i;

/** Neutral, short, or nothing: a summary that labels people or predicts the result is dropped. */
export function cleanDebateSummary(text: string): string | null {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length < 30 || t.length > 600 || LOADED.test(t)) return null;
  return t;
}

/** Verbatim, 6–90 words, and made of whole sentences: starts with a capital (or quote mark) and ends with sentence punctuation. */
export function isFullSentenceQuote(quote: string, sourceText: string): boolean {
  const q = quote.trim();
  const words = q.split(/\s+/).filter(Boolean).length;
  if (words < 6 || words > 90) return false;
  if (!/^["'“‘(]?[A-Z0-9]/.test(q) || !/[.!?]["'”’)]?$/.test(q)) return false;
  const norm = (t: string) => t.replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim().toLowerCase();
  return norm(sourceText).includes(norm(q));
}

function validPoints(raw: unknown[], side: 'yes' | 'no', rationales: Rationale[]): ProposalArgument[] {
  const points: ProposalArgument[] = [];
  for (const item of raw) {
    const p = PointSchema.safeParse(item);
    if (!p.success) continue;
    const source = rationales.find((r) => r.index === p.data.source_index);
    if (!source || source.side !== side || !isFullSentenceQuote(p.data.quote, source.text)) continue;
    if (points.some((x) => x.text === p.data.text.trim())) continue;
    points.push({ text: p.data.text.trim(), quote: p.data.quote.trim(), url: publicUrl(source.url), drep_id: source.drep_id });
    if (points.length >= MAX_POINTS_PER_SIDE) break;
  }
  return points;
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set. Add it in Railway → adapolis → Variables to enable proposal argument summaries.');
    client = new Anthropic({ apiKey });
  }
  return client;
}

async function summarize(title: string, rationales: Rationale[], model: string) {
  const docs = rationales
    .map((r) => `<rationale index="${r.index}" side="${r.side}">\n${r.text}\n</rationale>`)
    .join('\n\n');
  const response = await getClient().messages.create({
    model,
    max_tokens: 1200,
    system: SYSTEM_PROMPT,
    tools: [TOOL],
    tool_choice: { type: 'tool', name: TOOL.name },
    messages: [{ role: 'user', content: `Proposal: ${title}\n\n${docs}` }],
  });
  const toolUse = response.content.find((c): c is Anthropic.ToolUseBlock => c.type === 'tool_use');
  const input = ToolInputSchema.safeParse(toolUse?.input ?? {});
  const raw = input.success ? input.data : { for: [], against: [], debate_summary: '' };
  return {
    for: validPoints(raw.for, 'yes', rationales),
    against: validPoints(raw.against, 'no', rationales),
    debate_summary: cleanDebateSummary(raw.debate_summary),
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}

export interface ArgumentsRunResult {
  checked: number;
  generated: number;
  unchanged: number;
  errors: number;
  spent_usd: number;
  last_error: string | null;
}

/** Refreshes arguments for the given proposals, skipping those whose rationales haven't changed. */
export async function refreshProposalArguments(proposals: Array<{ proposal_id: string; title: string }>): Promise<ArgumentsRunResult> {
  const model = process.env.ANTHROPIC_STATEMENTS_MODEL || DEFAULT_STATEMENTS_MODEL;
  const price = priceFor(model);
  const result: ArgumentsRunResult = { checked: 0, generated: 0, unchanged: 0, errors: 0, spent_usd: 0, last_error: null };
  if (proposals.length === 0) return result;

  const { data: existing, error } = await supabaseAdmin
    .from('proposal_arguments')
    .select('proposal_id, input_fingerprint')
    .in('proposal_id', proposals.map((p) => p.proposal_id));
  if (error) {
    throw new Error(`Couldn't read proposal_arguments: ${error.message}. Run supabase/migrations/008_proposal_arguments.sql in the Supabase SQL Editor.`);
  }
  const known = new Map((existing ?? []).map((r: { proposal_id: string; input_fingerprint: string }) => [r.proposal_id, r.input_fingerprint]));

  for (const p of proposals) {
    result.checked++;
    try {
      const rationales = await loadRationales(p.proposal_id);
      const fp = fingerprint(rationales);
      if (known.get(p.proposal_id) === fp) {
        result.unchanged++;
        continue;
      }
      const counts = {
        for_sources: rationales.filter((r) => r.side === 'yes').length,
        against_sources: rationales.filter((r) => r.side === 'no').length,
      };
      let args = { for: [] as ProposalArgument[], against: [] as ProposalArgument[], debate_summary: null as string | null, inputTokens: 0, outputTokens: 0 };
      if (rationales.length > 0) args = await summarize(p.title, rationales, model);
      result.spent_usd += (args.inputTokens * price.input + args.outputTokens * price.output) / 1_000_000;
      const row = {
        proposal_id: p.proposal_id,
        args_for: args.for,
        args_against: args.against,
        ...counts,
        input_fingerprint: fp,
        model,
        input_tokens: args.inputTokens,
        output_tokens: args.outputTokens,
        generated_at: new Date().toISOString(),
      };
      let { error: upsertError } = await supabaseAdmin.from('proposal_arguments').upsert({ ...row, debate_summary: args.debate_summary });
      // Migration 024 not run yet: save without the summary rather than lose the arguments.
      if (upsertError && /debate_summary/.test(upsertError.message)) ({ error: upsertError } = await supabaseAdmin.from('proposal_arguments').upsert(row));
      if (upsertError) throw new Error(`Saving arguments failed: ${upsertError.message}`);
      result.generated++;
    } catch (e) {
      result.errors++;
      result.last_error = `${p.proposal_id}: ${e instanceof Error ? e.message : String(e)}`;
    }
  }
  result.spent_usd = Number(result.spent_usd.toFixed(4));
  console.log(JSON.stringify({ event: 'proposal_arguments_run', ...result }));
  return result;
}

const StoredPointSchema = z.object({
  text: z.string(),
  quote: z.string(),
  url: z.string().nullable(),
  drep_id: z.string().nullable().default(null),
});
const StoredSchema = z.object({
  proposal_id: z.string(),
  args_for: z.array(StoredPointSchema),
  args_against: z.array(StoredPointSchema),
  for_sources: z.number(),
  against_sources: z.number(),
  debate_summary: z.string().nullable().optional(),
});

async function drepNames(ids: string[]): Promise<Map<string, string | null>> {
  const names = new Map<string, string | null>();
  if (ids.length === 0) return names;
  const { data, error } = await supabaseAdmin.from('dreps').select('drep_id, metadata, metadata_fetch_status').in('drep_id', ids);
  if (error) return names;
  for (const d of data ?? []) {
    names.set(d.drep_id as string, toDisplayProfile(d.metadata, (d.metadata_fetch_status as string | null) ?? null).name);
  }
  return names;
}

/** Stored arguments by proposal id, with author names. Empty if the table doesn't exist yet. */
export async function loadProposalArguments(ids: string[]): Promise<Map<string, ProposalArguments>> {
  const out = new Map<string, ProposalArguments>();
  if (ids.length === 0) return out;
  const { data, error } = await supabaseAdmin
    .from('proposal_arguments')
    .select('*')
    .in('proposal_id', ids);
  if (error) {
    console.warn(JSON.stringify({ event: 'proposal_arguments_unavailable', error: error.message }));
    return out;
  }
  const rows = (data ?? []).map((row) => StoredSchema.safeParse(row)).flatMap((r) => (r.success ? [r.data] : []));
  const authorIds = new Set(rows.flatMap((r) => [...r.args_for, ...r.args_against]).flatMap((p) => (p.drep_id ? [p.drep_id] : [])));
  const names = await drepNames(Array.from(authorIds));
  const named = (points: z.infer<typeof StoredPointSchema>[]): ProposalArgument[] =>
    points.map((p) => ({ ...p, url: publicUrl(p.url), drep_name: p.drep_id ? (names.get(p.drep_id) ?? null) : null }));
  for (const r of rows) {
    if (r.args_for.length + r.args_against.length === 0) continue;
    out.set(r.proposal_id, {
      for: named(r.args_for),
      against: named(r.args_against),
      for_sources: r.for_sources,
      against_sources: r.against_sources,
      debate_summary: r.debate_summary ?? null,
    });
  }
  return out;
}
