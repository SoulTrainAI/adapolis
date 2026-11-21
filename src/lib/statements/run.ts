/**
 * Runs stated-position summarization across DReps: dry-run estimates, skips
 * DReps whose words haven't changed, and stops at a hard spending cap.
 */

import { supabaseAdmin } from '@/lib/sync/supabase-admin';
import { inputFingerprint, loadSources, profileText, SOURCE_LIMITS } from './sources';
import { DEFAULT_STATEMENTS_MODEL, priceFor, summarizeStatements } from './summarize';
import { getMatchData } from '@/lib/match/profiles';

const DB_PAGE_SIZE = 1000;
const WORKERS = 3;
// Calibrated on mainnet rationales (Nov 2026): ~1,200 chars per capped rationale, ~3.6 chars/token.
const EST_CHARS_PER_RATIONALE = 1200;
const EST_CHARS_PER_TOKEN = 3.6;
const EST_PROMPT_OVERHEAD_TOKENS = 1800;
const EST_OUTPUT_TOKENS = 600;

export interface RunOptions {
  dryRun?: boolean;
  /** Max DReps to process this run */
  limit?: number;
  /** Stop once actual spend reaches this many USD */
  maxCostUsd?: number;
  /** Reprocess even DReps whose inputs are unchanged */
  force?: boolean;
}

export interface RunStatus {
  started_at: string;
  finished_at: string | null;
  dry_run: boolean;
  model: string;
  candidates: number;
  processed: number;
  positions_found: number;
  quotes_rejected: number;
  errors: number;
  spent_usd: number;
  estimated_usd: number;
  stopped_reason: string | null;
  last_error: string | null;
}

let current: RunStatus | null = null;
export function getStatementRunStatus(): RunStatus | null {
  return current;
}
export function isStatementRunActive(): boolean {
  return current !== null && current.finished_at === null;
}

async function loadAll<T>(
  table: string,
  columns: string,
  orderBy: string,
  filter: { eq?: [string, boolean]; notNull?: string } = {}
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += DB_PAGE_SIZE) {
    let query = supabaseAdmin.from(table).select(columns);
    if (filter.eq) query = query.eq(filter.eq[0], filter.eq[1]);
    if (filter.notNull) query = query.not(filter.notNull, 'is', null);
    const { data, error } = await query.order(orderBy).range(from, from + DB_PAGE_SIZE - 1);
    if (error) {
      throw new Error(
        `Failed to read ${table}: ${error.message}.${table.startsWith('drep_statement') ? ' Run migration 007 in the Supabase SQL editor.' : ''}`
      );
    }
    rows.push(...((data ?? []) as T[]));
    if (!data || data.length < DB_PAGE_SIZE) return rows;
  }
}

interface Candidate {
  drep_id: string;
  metadata: unknown;
  fingerprint: string;
  estChars: number;
}

async function findCandidates(force: boolean): Promise<Candidate[]> {
  const [dreps, rationaleVotes, runs] = await Promise.all([
    loadAll<{ drep_id: string; metadata: unknown; metadata_fetch_status: string | null }>(
      'dreps',
      'drep_id, metadata, metadata_fetch_status',
      'drep_id',
      { eq: ['is_registered', true] }
    ),
    loadAll<{ drep_id: string; rationale_url: string }>(
      'votes',
      'drep_id, rationale_url',
      'vote_id',
      { notNull: 'rationale_url' }
    ),
    loadAll<{ drep_id: string; input_fingerprint: string }>('drep_statement_runs', 'drep_id, input_fingerprint', 'drep_id'),
  ]);

  const urlsByDRep = new Map<string, string[]>();
  for (const v of rationaleVotes) {
    const list = urlsByDRep.get(v.drep_id) ?? [];
    list.push(v.rationale_url);
    urlsByDRep.set(v.drep_id, list);
  }
  const done = new Map(runs.map((r) => [r.drep_id, r.input_fingerprint]));

  const candidates: Candidate[] = [];
  for (const d of dreps) {
    const metadata = d.metadata_fetch_status === 'ok' ? d.metadata : null;
    const urls = Array.from(new Set(urlsByDRep.get(d.drep_id) ?? []));
    const profile = profileText(metadata);
    if (!profile && urls.length === 0) continue;
    const fingerprint = inputFingerprint(metadata, urls);
    if (!force && done.get(d.drep_id) === fingerprint) continue;
    candidates.push({
      drep_id: d.drep_id,
      metadata,
      fingerprint,
      estChars: (profile?.length ?? 0) + Math.min(urls.length, SOURCE_LIMITS.maxRationales) * EST_CHARS_PER_RATIONALE,
    });
  }
  return candidates;
}

function estimateUsd(candidates: Candidate[], model: string): number {
  const price = priceFor(model);
  const inputTokens = candidates.reduce((sum, c) => sum + c.estChars / EST_CHARS_PER_TOKEN + EST_PROMPT_OVERHEAD_TOKENS, 0);
  const outputTokens = candidates.length * EST_OUTPUT_TOKENS;
  return (inputTokens * price.input + outputTokens * price.output) / 1_000_000;
}

async function processOne(c: Candidate, model: string): Promise<{ found: number; rejected: number; cost: number }> {
  const sources = await loadSources(c.drep_id, c.metadata);
  const price = priceFor(model);

  if (sources.length === 0) {
    await supabaseAdmin.from('drep_statement_runs').upsert({
      drep_id: c.drep_id, input_fingerprint: c.fingerprint, sources_count: 0, positions_found: 0,
      quotes_rejected: 0, status: 'no_sources', error: null, model, generated_at: new Date().toISOString(),
    });
    return { found: 0, rejected: 0, cost: 0 };
  }

  const result = await summarizeStatements(sources, model);
  const cost = (result.inputTokens * price.input + result.outputTokens * price.output) / 1_000_000;
  const generatedAt = new Date().toISOString();

  // Replace this DRep's AI rows only; DRep-signed pledges (Phase 3) are never overwritten.
  const del = await supabaseAdmin.from('drep_stated_positions').delete().eq('drep_id', c.drep_id).eq('origin', 'ai');
  if (del.error) throw new Error(`Failed to clear old positions: ${del.error.message}`);
  if (result.positions.length > 0) {
    const ins = await supabaseAdmin.from('drep_stated_positions').upsert(
      result.positions.map((p) => ({
        drep_id: c.drep_id,
        topic_id: p.topic_id,
        stance: p.stance,
        confidence: p.confidence,
        quote: p.quote,
        source_kind: p.source.kind,
        source_url: p.source.url,
        proposal_id: p.source.proposal_id,
        origin: 'ai',
        model,
        generated_at: generatedAt,
      })),
      { onConflict: 'drep_id,topic_id', ignoreDuplicates: true }
    );
    if (ins.error) throw new Error(`Failed to save positions: ${ins.error.message}`);
  }

  await supabaseAdmin.from('drep_statement_runs').upsert({
    drep_id: c.drep_id, input_fingerprint: c.fingerprint, sources_count: sources.length,
    positions_found: result.positions.length, quotes_rejected: result.rejected, status: 'ok', error: null,
    model, input_tokens: result.inputTokens, output_tokens: result.outputTokens, generated_at: generatedAt,
  });
  return { found: result.positions.length, rejected: result.rejected, cost };
}

export async function runStatementSummaries(options: RunOptions = {}): Promise<RunStatus> {
  if (isStatementRunActive()) throw new Error('A stated-positions run is already in progress.');
  const model = process.env.ANTHROPIC_STATEMENTS_MODEL || DEFAULT_STATEMENTS_MODEL;
  const maxCost = options.maxCostUsd ?? 2;

  current = {
    started_at: new Date().toISOString(), finished_at: null, dry_run: options.dryRun ?? false, model,
    candidates: 0, processed: 0, positions_found: 0, quotes_rejected: 0, errors: 0,
    spent_usd: 0, estimated_usd: 0, stopped_reason: null, last_error: null,
  };
  const status = current;

  try {
    let candidates = await findCandidates(options.force ?? false);
    if (options.limit !== undefined) candidates = candidates.slice(0, options.limit);
    status.candidates = candidates.length;
    status.estimated_usd = Number(estimateUsd(candidates, model).toFixed(4));

    if (status.dry_run) {
      status.stopped_reason = 'dry run: nothing was sent to the AI';
      return status;
    }
    if (!process.env.ANTHROPIC_API_KEY) {
      status.stopped_reason = 'ANTHROPIC_API_KEY is not set in Railway';
      return status;
    }

    let next = 0;
    const worker = async () => {
      while (next < candidates.length) {
        if (status.spent_usd >= maxCost) {
          status.stopped_reason = `spending cap of $${maxCost} reached`;
          return;
        }
        const c = candidates[next++];
        try {
          const r = await processOne(c, model);
          status.positions_found += r.found;
          status.quotes_rejected += r.rejected;
          status.spent_usd = Number((status.spent_usd + r.cost).toFixed(4));
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          status.errors++;
          status.last_error = `${c.drep_id}: ${message}`;
          await supabaseAdmin.from('drep_statement_runs').upsert({
            drep_id: c.drep_id, input_fingerprint: 'error', status: 'error', error: message.slice(0, 500), model,
            generated_at: new Date().toISOString(),
          });
          // A missing key or bad model fails every call; stop instead of burning through the list.
          if (/api[_ ]key|authentication|not_found_error|model/i.test(message)) {
            status.stopped_reason = `stopped after error: ${message.slice(0, 200)}`;
            next = candidates.length;
          }
        } finally {
          status.processed++;
        }
      }
    };
    await Promise.all(Array.from({ length: WORKERS }, worker));
    status.stopped_reason ??= 'completed';
    if (status.positions_found > 0) {
      // Make new statements visible in the quiz now rather than at the next 6-hour refresh.
      await getMatchData({ force: true }).catch((error: unknown) => {
        status.last_error = `match refresh failed: ${error instanceof Error ? error.message : String(error)}`;
      });
    }
    return status;
  } catch (error) {
    status.last_error = error instanceof Error ? error.message : String(error);
    status.stopped_reason = 'failed before processing';
    return status;
  } finally {
    status.finished_at = new Date().toISOString();
    console.log(JSON.stringify({ event: 'statement_run_finished', ...status }));
  }
}
