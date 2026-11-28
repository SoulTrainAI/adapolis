/**
 * Summarizes a DRep's stated positions on the Find My DRep topics from its own
 * published words. Every position must quote the source verbatim; quotes
 * that can't be found in the source text are discarded, so the model can't
 * attribute words a DRep never wrote.
 */

import Anthropic from '@anthropic-ai/sdk';
import { POSITION_TOPICS as TOPICS, quoteFitsTopic } from '@/lib/match/topics';
import type { StatementSource } from './sources';

export const DEFAULT_STATEMENTS_MODEL = 'claude-haiku-5-5';

/** USD per million tokens (prompts under 100K tokens). */
const PRICES: Record<string, { input: number; output: number }> = {
  'claude-haiku-5-5': { input: 0.1, output: 0.5 },
  'claude-sonnet-5-5': { input: 2, output: 10 },
};
// Unknown models are costed at Sonnet rates so the budget cap stays conservative.
export function priceFor(model: string): { input: number; output: number } {
  return PRICES[model] ?? PRICES['claude-sonnet-5-5'];
}

export interface StatedPosition {
  topic_id: string;
  stance: number;
  confidence: 'high' | 'medium';
  quote: string;
  source: StatementSource;
}

export interface SummaryResult {
  positions: StatedPosition[];
  rejected: number;
  inputTokens: number;
  outputTokens: number;
}

const SYSTEM_PROMPT = `You record what a Cardano DRep (delegated representative) has SAID about specific governance topics, using only the DRep's own published words provided to you.

Rules:
- Use only the provided sources. Never use outside knowledge about the DRep, and never infer a position from how they voted alone.
- Record a topic only if the DRep clearly states or clearly implies a GENERAL view on it. An objection to one specific proposal (e.g. "this budget is too high") is not a general view unless the DRep generalizes (e.g. "the treasury should only fund essentials").
- The quote must be about the topic itself, not a neighbouring subject. For example, the size of the Constitutional Committee is not about large ADA holders' voting power, and voting to enact one election result is not a general view on trusting the committee.
- Test every position: someone reading ONLY the quote and the topic statement should be able to see the DRep's stance on that topic. If they could not, omit it. Thanks, praise, or a review of one proposal ("good effort but needs iteration") is never a position.
- Pay for the Constitutional Committee, Intersect staff or proposal teams is not DRep compensation. drep_compensation is only about paying DReps.
- Views change. Rationales are dated, newest first. If the DRep's newer writing conflicts with older writing on a topic, record the newer view and quote the newer source.
- stance: 1-10 agreement with the topic statement exactly as worded (10 = strongly agrees, 1 = strongly disagrees, 5-6 = explicitly mixed).
- confidence: "high" if explicit, "medium" if clearly implied. If neither, omit the topic.
- quote: copy 5-30 consecutive words EXACTLY as they appear in the cited source (same words, same order). Do not paraphrase, fix typos, or join separate passages.
- Be neutral. Do not judge whether a position is good or bad.
- It is normal to record few or no topics. Omitting is better than guessing.

Call the record_positions tool exactly once.`;

const TOOL: Anthropic.Tool = {
  name: 'record_positions',
  description: "Record the DRep's stated positions, each backed by a verbatim quote.",
  input_schema: {
    type: 'object',
    properties: {
      positions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            topic_id: { type: 'string', enum: TOPICS.map((t) => t.id) },
            stance: { type: 'integer', minimum: 1, maximum: 10 },
            confidence: { type: 'string', enum: ['high', 'medium'] },
            quote: { type: 'string' },
            source_index: { type: 'integer' },
          },
          required: ['topic_id', 'stance', 'confidence', 'quote', 'source_index'],
        },
      },
    },
    required: ['positions'],
  },
};

// Ignores formatting and typographic variants so a faithful quote of Markdown
// text (e.g. "to** not support**") still verifies; the words themselves must match.
function normalize(text: string): string {
  return text
    .replace(/[*`]+/g, '')
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[“”„‟]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function quoteIsVerbatim(quote: string, sourceText: string): boolean {
  const q = normalize(quote).replace(/^["'.…\s]+|["'.…\s]+$/g, '');
  const words = q.split(' ').filter(Boolean).length;
  return words >= 4 && words <= 40 && normalize(sourceText).includes(q);
}

function buildUserMessage(sources: StatementSource[]): string {
  const topics = TOPICS.map((t) => `- ${t.id}: "${t.statement}" (${t.context})`).join('\n');
  const docs = sources
    .map((s) => `<source index="${s.index}" kind="${s.kind}"${s.date ? ` date="${s.date}"` : ''}>\n${s.text}\n</source>`)
    .join('\n\n');
  return `Topics (stance = agreement with each statement):\n${topics}\n\nThe DRep's own published words:\n\n${docs}`;
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  // Created lazily so the rest of the app runs without an API key configured.
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not set. Add it in Railway → adapolis → Variables to enable stated-position summaries.');
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

export async function summarizeStatements(sources: StatementSource[], model: string): Promise<SummaryResult> {
  const response = await getClient().messages.create({
    model,
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    tools: [TOOL],
    tool_choice: { type: 'tool', name: TOOL.name },
    messages: [{ role: 'user', content: buildUserMessage(sources) }],
  });

  const toolUse = response.content.find((c): c is Anthropic.ToolUseBlock => c.type === 'tool_use');
  const raw = (toolUse?.input as { positions?: unknown } | undefined)?.positions;
  const candidates = Array.isArray(raw) ? raw : [];

  const byTopic = new Map<string, StatedPosition>();
  let rejected = 0;
  for (const c of candidates) {
    const p = c as { topic_id?: unknown; stance?: unknown; confidence?: unknown; quote?: unknown; source_index?: unknown };
    const source = sources.find((s) => s.index === p.source_index);
    const valid =
      typeof p.topic_id === 'string' &&
      TOPICS.some((t) => t.id === p.topic_id) &&
      typeof p.stance === 'number' &&
      Number.isInteger(p.stance) &&
      p.stance >= 1 &&
      p.stance <= 10 &&
      (p.confidence === 'high' || p.confidence === 'medium') &&
      typeof p.quote === 'string' &&
      source !== undefined &&
      quoteIsVerbatim(p.quote, source.text) &&
      quoteFitsTopic(p.topic_id as string, p.quote);
    if (!valid) {
      rejected++;
      continue;
    }
    const existing = byTopic.get(p.topic_id as string);
    // One position per topic; an explicit statement beats an implied one.
    if (!existing || (existing.confidence === 'medium' && p.confidence === 'high')) {
      byTopic.set(p.topic_id as string, {
        topic_id: p.topic_id as string,
        stance: p.stance as number,
        confidence: p.confidence as 'high' | 'medium',
        quote: (p.quote as string).trim(),
        source: source!,
      });
    }
  }

  return {
    positions: Array.from(byTopic.values()),
    rejected,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}
