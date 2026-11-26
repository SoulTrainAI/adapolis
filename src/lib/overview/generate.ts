/**
 * Builds DRep Overviews. Facts (activity, vote split, tenure) are computed by
 * code from on-chain data. The AI only picks the DRep's core values and stated
 * affiliations from their own published words, each backed by a quote that
 * must appear verbatim in the cited source; anything else is dropped. It is
 * told never to label anyone politically, and a filter enforces that.
 * Display only: never feeds points, Draft Cost or prizes (Cardinal Rule).
 */

import Anthropic from '@anthropic-ai/sdk';
import { supabaseAdmin } from '@/lib/sync/supabase-admin';
import { getCards } from '@/lib/cards/data';
import { loadSources, inputFingerprint, type StatementSource } from '@/lib/statements/sources';
import { DEFAULT_STATEMENTS_MODEL, priceFor, quoteIsVerbatim } from '@/lib/statements/summarize';
import { seasonNumber } from '@/lib/season/points';
import type { Overview, OverviewFacts, OverviewQuoteItem, OverviewSource } from './types';

const PER_RUN = 25;
const RUN_BUDGET_USD = 1;
const MIN_VOTES = 3;
const NEW_SOURCES_TO_REFRESH = 10;
const POLITICAL = /\b(left|right)[- ]?(wing|leaning)|\b(conservative|liberal|progressive|libertarian|socialist|centrist|populist|far[- ](left|right))\b/i;

const SYSTEM = `You write the "core values" and "affiliations" sections of a neutral profile of one Cardano DRep, using ONLY the DRep's own published words provided (their profile and their vote rationales).

Rules:
- values: up to 5 recurring principles or priorities the DRep states (for example fiscal discipline, decentralization, developer funding, transparency). label: at most 8 words, neutral. quote: 6–40 consecutive words copied EXACTLY from the cited source that show it. source_index: that source.
- affiliations: only organisations, roles or groups the DRep explicitly says they belong to, work for, founded or represent (e.g. "Founder of X", "Member of the Y coalition", "Runs stake pool Z"). Never infer affiliations from how they vote or who they agree with. Same quote rules. Empty if none are stated.
- headline: one neutral sentence (max 30 words) that only restates the values you listed. No praise, no criticism, no predictions.
- NEVER use political labels (left, right, conservative, liberal, progressive, libertarian, etc.) or judge whether the DRep is right.
- Do not mention how often they vote; that is shown separately.

Call record_overview exactly once.`;

const QUOTE_ITEM = {
  type: 'object',
  properties: { label: { type: 'string' }, quote: { type: 'string' }, source_index: { type: 'integer' } },
  required: ['label', 'quote', 'source_index'],
} as const;

const TOOL: Anthropic.Tool = {
  name: 'record_overview',
  description: 'Record the DRep overview, every item backed by a verbatim quote.',
  input_schema: {
    type: 'object',
    properties: { headline: { type: 'string' }, values: { type: 'array', items: QUOTE_ITEM }, affiliations: { type: 'array', items: QUOTE_ITEM } },
    required: ['headline', 'values', 'affiliations'],
  },
};

let client: Anthropic | null = null;
function ai(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set. Add it in Railway → adapolis → Variables to enable DRep Overviews.');
    client = new Anthropic({ apiKey });
  }
  return client;
}

const pct = (v: number | null | undefined) => (v === null || v === undefined ? null : Math.round(v <= 1 ? v * 100 : v));

export function validItems(raw: unknown, sources: StatementSource[], max: number): OverviewQuoteItem[] {
  const out: OverviewQuoteItem[] = [];
  for (const item of Array.isArray(raw) ? raw : []) {
    const i = item as { label?: unknown; quote?: unknown; source_index?: unknown };
    if (typeof i.label !== 'string' || typeof i.quote !== 'string' || typeof i.source_index !== 'number') continue;
    const label = i.label.trim().slice(0, 80);
    const source = sources.find((s) => s.index === i.source_index);
    if (!label || POLITICAL.test(label) || !source || !quoteIsVerbatim(i.quote, source.text)) continue;
    if (out.some((o) => o.label.toLowerCase() === label.toLowerCase())) continue;
    out.push({ label, quote: i.quote.trim(), source_index: i.source_index });
    if (out.length >= max) break;
  }
  return out;
}

async function voteSplit(drepId: string): Promise<{ split: OverviewFacts['split']; rationaleUrls: string[] }> {
  const { data } = await supabaseAdmin.from('votes').select('vote, rationale_url').eq('drep_id', drepId);
  const split = { yes: 0, no: 0, abstain: 0 };
  const urls = new Set<string>();
  for (const v of data ?? []) {
    if (v.vote === 'yes' || v.vote === 'no' || v.vote === 'abstain') split[v.vote as 'yes' | 'no' | 'abstain']++;
    if (v.rationale_url) urls.add(v.rationale_url as string);
  }
  return { split, rationaleUrls: Array.from(urls) };
}

export interface OverviewRunResult {
  checked: number;
  generated: number;
  skipped_no_sources: number;
  spent_usd: number;
  errors: number;
  last_error: string | null;
}

/** Cron step: (re)generates up to PER_RUN overviews that are missing, out of season, flagged, or have 10+ new sources. */
export async function runOverviews(options: { only?: string } = {}): Promise<OverviewRunResult> {
  const result: OverviewRunResult = { checked: 0, generated: 0, skipped_no_sources: 0, spent_usd: 0, errors: 0, last_error: null };
  const model = process.env.ANTHROPIC_OVERVIEW_MODEL || process.env.ANTHROPIC_STATEMENTS_MODEL || DEFAULT_STATEMENTS_MODEL;
  const price = priceFor(model);
  const cards = await getCards();
  const season = seasonNumber(cards.current_window);
  const { data: existing, error } = await supabaseAdmin.from('drep_overviews').select('drep_id, input_fingerprint, source_count, season_number, regenerate');
  if (error) throw new Error(`Couldn't read overviews: ${error.message}. Run supabase/migrations/023_drep_overviews.sql.`);
  const known = new Map((existing ?? []).map((e) => [e.drep_id as string, e]));

  const candidates = cards.cards
    .filter((c) => (options.only ? c.drep_id === options.only : c.lifetime.votes >= MIN_VOTES))
    .sort((a, b) => Number(known.has(a.drep_id)) - Number(known.has(b.drep_id)) || b.ada - a.ada);

  for (const card of candidates) {
    if (result.generated >= PER_RUN || result.spent_usd >= RUN_BUDGET_USD) break;
    const prev = known.get(card.drep_id);
    const { split, rationaleUrls } = await voteSplit(card.drep_id);
    const { data: drepRow } = await supabaseAdmin.from('dreps').select('metadata').eq('drep_id', card.drep_id).maybeSingle();
    const fingerprint = inputFingerprint(drepRow?.metadata ?? null, rationaleUrls);
    const due =
      options.only !== undefined ||
      !prev ||
      prev.regenerate === true ||
      prev.season_number !== season ||
      (prev.input_fingerprint !== fingerprint && rationaleUrls.length - Number(prev.source_count ?? 0) >= NEW_SOURCES_TO_REFRESH);
    if (!due) continue;
    result.checked++;

    try {
      const sources = await loadSources(card.drep_id, drepRow?.metadata ?? null);
      const facts: OverviewFacts = {
        votes_cast: card.lifetime.votes,
        votes_eligible: card.votes_eligible,
        participation_pct: pct(card.participation),
        explained_pct: pct(card.lifetime.rationale_rate),
        early_pct: pct(card.lifetime.early_rate),
        missed: card.lifetime.missed,
        tenure_epochs: card.lifetime.tenure_epochs,
        first_epoch: card.lifetime.first_epoch,
        split,
        delegators: card.delegators,
        ada: card.ada,
      };
      let overview: Overview = { headline: null, values: [], affiliations: [], facts };
      if (sources.length === 0) result.skipped_no_sources++;
      else {
        const docs = sources.map((s) => `<source index="${s.index}" kind="${s.kind}"${s.date ? ` date="${s.date}"` : ''}>\n${s.text}\n</source>`).join('\n\n');
        const response = await ai().messages.create({
          model,
          max_tokens: 1500,
          system: SYSTEM,
          tools: [TOOL],
          tool_choice: { type: 'tool', name: TOOL.name },
          messages: [{ role: 'user', content: `DRep: ${card.name ?? card.drep_id}\n\n${docs}` }],
        });
        result.spent_usd += (response.usage.input_tokens * price.input + response.usage.output_tokens * price.output) / 1_000_000;
        const input = (response.content.find((c): c is Anthropic.ToolUseBlock => c.type === 'tool_use')?.input ?? {}) as Record<string, unknown>;
        const values = validItems(input.values, sources, 5);
        const affiliations = validItems(input.affiliations, sources, 4);
        const headline = typeof input.headline === 'string' && values.length > 0 && !POLITICAL.test(input.headline) ? input.headline.trim().slice(0, 240) : null;
        overview = { headline, values, affiliations, facts };
      }
      const used = new Set([...overview.values, ...overview.affiliations].map((i) => i.source_index));
      const sourceList: OverviewSource[] = sources
        .filter((s) => used.has(s.index))
        .map((s) => ({ index: s.index, kind: s.kind, url: s.url, proposal_id: s.proposal_id, date: s.date }));
      const { error: saveError } = await supabaseAdmin.from('drep_overviews').upsert({
        drep_id: card.drep_id,
        overview,
        sources: sourceList,
        source_count: rationaleUrls.length,
        input_fingerprint: fingerprint,
        season_number: season,
        model,
        generated_at: new Date().toISOString(),
        regenerate: false,
      });
      if (saveError) throw new Error(saveError.message);
      result.generated++;
    } catch (e) {
      result.errors++;
      result.last_error = e instanceof Error ? e.message : String(e);
      console.error(JSON.stringify({ event: 'overview_failed', drep_id: card.drep_id, error: result.last_error }));
    }
  }
  result.spent_usd = Math.round(result.spent_usd * 10000) / 10000;
  return result;
}
