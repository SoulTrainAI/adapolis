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
import { DEFAULT_STATEMENTS_MODEL, priceFor, quoteIsVerbatim } from './summarize';

const MAX_RATIONALES_PER_SIDE = 30;
const MAX_CHARS_PER_RATIONALE = 1500;
const MAX_POINTS_PER_SIDE = 3;

export interface ProposalArgument {
  text: string;
  quote: string;
  url: string | null;
}

export interface ProposalArguments {
  for: ProposalArgument[];
  against: ProposalArgument[];
  for_sources: number;
  against_sources: number;
}

interface Rationale {
  index: number;
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
    out.push({ index: out.length, side, text: text.slice(0, MAX_CHARS_PER_RATIONALE), url: row.meta_url });
  }
  return out;
}

function fingerprint(rationales: Rationale[]): string {
  return createHash('sha256')
    .update(rationales.map((r) => `${r.side}:${createHash('sha1').update(r.text).digest('hex')}`).sort().join('\n'))
    .digest('hex');
}

const SYSTEM_PROMPT = `You summarize the main arguments Cardano DReps gave for and against one governance proposal, using only the vote rationales provided.

Rules:
- "for" points must come from rationales marked side="yes"; "against" points only from side="no".
- Give up to ${MAX_POINTS_PER_SIDE} distinct points per side, most common or most substantive first. Merge rationales that make the same point.
- text: a neutral, plain-language summary of the argument in at most 20 words. No names, no judgment of whether the argument is right.
- quote: 5-30 consecutive words copied EXACTLY from the cited rationale, showing that argument. Do not paraphrase or join passages.
- source_index: the index of the rationale quoted.
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
    },
    required: ['for', 'against'],
  },
};

const PointSchema = z.object({ text: z.string().min(3).max(240), quote: z.string(), source_index: z.number().int() });
const ToolInputSchema = z.object({ for: z.array(z.unknown()).default([]), against: z.array(z.unknown()).default([]) });

function validPoints(raw: unknown[], side: 'yes' | 'no', rationales: Rationale[]): ProposalArgument[] {
  const points: ProposalArgument[] = [];
  for (const item of raw) {
    const p = PointSchema.safeParse(item);
    if (!p.success) continue;
    const source = rationales.find((r) => r.index === p.data.source_index);
    if (!source || source.side !== side || !quoteIsVerbatim(p.data.quote, source.text)) continue;
    if (points.some((x) => x.text === p.data.text.trim())) continue;
    points.push({ text: p.data.text.trim(), quote: p.data.quote.trim(), url: source.url });
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
  const raw = input.success ? input.data : { for: [], against: [] };
  return {
    for: validPoints(raw.for, 'yes', rationales),
    against: validPoints(raw.against, 'no', rationales),
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
      let args = { for: [] as ProposalArgument[], against: [] as ProposalArgument[], inputTokens: 0, outputTokens: 0 };
      if (rationales.length > 0) args = await summarize(p.title, rationales, model);
      result.spent_usd += (args.inputTokens * price.input + args.outputTokens * price.output) / 1_000_000;
      const { error: upsertError } = await supabaseAdmin.from('proposal_arguments').upsert({
        proposal_id: p.proposal_id,
        args_for: args.for,
        args_against: args.against,
        ...counts,
        input_fingerprint: fp,
        model,
        input_tokens: args.inputTokens,
        output_tokens: args.outputTokens,
        generated_at: new Date().toISOString(),
      });
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

const StoredSchema = z.object({
  proposal_id: z.string(),
  args_for: z.array(z.object({ text: z.string(), quote: z.string(), url: z.string().nullable() })),
  args_against: z.array(z.object({ text: z.string(), quote: z.string(), url: z.string().nullable() })),
  for_sources: z.number(),
  against_sources: z.number(),
});

/** Stored arguments by proposal id. Empty if the table doesn't exist yet. */
export async function loadProposalArguments(ids: string[]): Promise<Map<string, ProposalArguments>> {
  const out = new Map<string, ProposalArguments>();
  if (ids.length === 0) return out;
  const { data, error } = await supabaseAdmin
    .from('proposal_arguments')
    .select('proposal_id, args_for, args_against, for_sources, against_sources')
    .in('proposal_id', ids);
  if (error) {
    console.warn(JSON.stringify({ event: 'proposal_arguments_unavailable', error: error.message }));
    return out;
  }
  for (const row of data ?? []) {
    const r = StoredSchema.safeParse(row);
    if (!r.success) continue;
    if (r.data.args_for.length + r.data.args_against.length === 0) continue;
    out.set(r.data.proposal_id, {
      for: r.data.args_for,
      against: r.data.args_against,
      for_sources: r.data.for_sources,
      against_sources: r.data.against_sources,
    });
  }
  return out;
}
