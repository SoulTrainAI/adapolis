/**
 * Full Cron Pipeline
 * POST /api/cron
 * Returns 202 Accepted immediately, runs sync + score pipeline in background
 * Requires Authorization header with CRON_SECRET
 */

import { finalizeEndedSeasons } from '@/lib/season/finalize';
import { recordLockEligibility } from '@/lib/season/eligibility-run';
import { refreshSocialAvatars } from '@/lib/drep-profile/social-avatars';
import { NextResponse } from 'next/server';
import { syncDReps } from '@/lib/sync/sync-dreps';
import { syncProposals } from '@/lib/sync/sync-proposals';
import { syncAllVotes } from '@/lib/sync/sync-votes';
import { syncBacking } from '@/lib/sync/sync-backing';
import { computeGovScoresForEpoch } from '@/lib/scoring/govscore-v1';
import { supabaseAdmin } from '@/lib/sync/supabase-admin';
import { fetchCurrentEpoch } from '@/lib/koios';
import { syncDRepMetadata } from '@/lib/metadata/drep-metadata';
import { getMatchData } from '@/lib/match/profiles';
import { getSeasonData } from '@/lib/season/data';
import { isStatementRunActive, runStatementSummaries } from '@/lib/statements/run';
import { refreshProposalArguments } from '@/lib/statements/proposal-arguments';
import { getHotTopics } from '@/lib/hot-topics/data';
import { getCards } from '@/lib/cards/data';
import { refreshForumDiscussions } from '@/lib/forum/discussions';
import { discordConfigured } from '@/lib/discord/rest';
import { runFeeds } from '@/lib/discord/feeds';
import { runOverviews } from '@/lib/overview/generate';

const STATEMENT_INTERVAL_HOURS: Record<string, number> = { on: 0, daily: 24, weekly: 168 };

// The last run time lives in the database so a redeploy doesn't reset the schedule.
async function statementsDue(): Promise<boolean> {
  const hours = STATEMENT_INTERVAL_HOURS[process.env.STATEMENT_SUMMARIES ?? ''];
  if (hours === undefined) return false;
  if (hours === 0) return true;
  const { data, error } = await supabaseAdmin
    .from('drep_statement_runs')
    .select('generated_at')
    .order('generated_at', { ascending: false })
    .limit(1);
  if (error) return false;
  const last = data?.[0]?.generated_at;
  // 1h slack so a 24h schedule doesn't slip to 30h on a 6-hourly cron.
  return !last || Date.now() - new Date(last).getTime() >= (hours - 1) * 3_600_000;
}

function verifyAuth(request: Request): boolean {
  const authHeader = request.headers.get('Authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error(JSON.stringify({ event: 'cron_secret_missing' }));
    return false;
  }

  const expectedAuth = `Bearer ${cronSecret}`;
  if (!authHeader || authHeader !== expectedAuth) {
    console.warn(JSON.stringify({ event: 'cron_unauthorized', provided: !!authHeader }));
    return false;
  }

  return true;
}

interface PipelineRun {
  started_at: string;
  finished_at: string | null;
  current_step: string;
  completed_steps: Record<string, unknown>;
  error: { step: string; message: string } | null;
  /** Optional steps that failed without stopping the run */
  warnings: Array<{ step: string; message: string }>;
}

// Railway runs a single long-lived replica, so in-memory state is enough to
// report the most recent run. It resets on redeploy, which is acceptable for a
// diagnostic: the tables themselves are the durable record.
let lastRun: PipelineRun | null = null;

/** An optional step failed: keep its error visible as a warning without failing the run. */
function demoteError(): void {
  if (lastRun?.error) {
    lastRun.warnings.push(lastRun.error);
    lastRun.error = null;
  }
}

async function step<T>(name: string, fn: () => Promise<T>): Promise<T> {
  if (lastRun) lastRun.current_step = name;
  try {
    const result = await fn();
    if (lastRun) lastRun.completed_steps[name] = result;
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (lastRun) lastRun.error = { step: name, message };
    throw error;
  }
}

/**
 * Uses the live chain epoch so scores roll forward each epoch. Falls back to
 * the latest stored epoch only if Koios is unreachable, so a Koios outage
 * re-scores the current epoch instead of failing the whole pipeline.
 */
async function getCurrentEpoch(): Promise<number> {
  try {
    return await fetchCurrentEpoch();
  } catch (error) {
    const { data, error: dbError } = await supabaseAdmin
      .from('drep_scores')
      .select('epoch')
      .order('epoch', { ascending: false })
      .limit(1);

    if (dbError || !data || data.length === 0) {
      throw new Error(
        `Cannot determine current epoch: Koios /tip failed (${error instanceof Error ? error.message : String(error)}) and no stored scores exist. Check https://api.koios.rest/ status and retry.`
      );
    }

    console.warn(
      JSON.stringify({
        event: 'current_epoch_koios_fallback',
        error: error instanceof Error ? error.message : String(error),
        using_stored_epoch: data[0].epoch,
      })
    );
    return data[0].epoch;
  }
}

/**
 * Runs the full sync + score pipeline in background
 * Does not block the HTTP response
 */
async function runPipeline(): Promise<void> {
  const pipelineStartTime = Date.now();
  lastRun = {
    started_at: new Date().toISOString(),
    finished_at: null,
    current_step: 'starting',
    completed_steps: {},
    error: null,
    warnings: [],
  };

  try {
    console.log(JSON.stringify({ event: 'cron_pipeline_start', timestamp: lastRun.started_at }));

    await step('sync_dreps', () => syncDReps());

    // Metadata failures are logged but don't stop scoring: profiles are
    // display-only, scores are the product.
    try {
      await step('sync_metadata', () => syncDRepMetadata());
    } catch (error) {
      demoteError();
      console.error(
        JSON.stringify({
          event: 'cron_step_metadata_failed',
          error: error instanceof Error ? error.message : String(error),
        })
      );
    }

    await step('sync_proposals', () => syncProposals());
    // Votes need DReps and proposals present first (foreign keys), and scoring
    // needs fresh votes, so this sits between them.
    await step('sync_votes', () => syncAllVotes());
    const currentEpoch = await step('get_epoch', () => getCurrentEpoch());
    await step('compute_scores', () => computeGovScoresForEpoch(currentEpoch));

    // Momentum snapshots (once per epoch). A failure only delays Momentum; scores stand.
    try {
      await step('snapshot_backing', () => syncBacking());
    } catch (error) {
      demoteError();
      console.error(
        JSON.stringify({
          event: 'cron_step_backing_failed',
          error: error instanceof Error ? error.message : String(error),
          hint: 'Momentum will use the next snapshot; check Koios status and that migration 025 is applied.',
        })
      );
    }

    // Incremental AI summaries for DReps whose published words changed.
    // STATEMENT_SUMMARIES = daily | weekly | on (every refresh); unset = off.
    // Batching DReps into fewer runs is cheaper, since each DRep is re-read once per run.
    if ((await statementsDue()) && !isStatementRunActive()) {
      try {
        await step('summarize_statements', async () => {
          const r = await runStatementSummaries({ limit: 50, maxCostUsd: 0.25 });
          return { processed: r.processed, positions_found: r.positions_found, spent_usd: r.spent_usd, stopped: r.stopped_reason };
        });
      } catch (error) {
        demoteError();
        console.error(
          JSON.stringify({ event: 'cron_step_statements_failed', error: error instanceof Error ? error.message : String(error) })
        );
      }
    }

    // DRep Overviews: up to 25 per run, capped at $1, only once DREP_OVERVIEWS=on is set in Railway (AI spend is opt-in).
    if (process.env.DREP_OVERVIEWS === 'on' && process.env.ANTHROPIC_API_KEY) {
      try {
        await step('drep_overviews', () => runOverviews());
      } catch (error) {
        demoteError();
        console.error(JSON.stringify({ event: 'cron_step_overviews_failed', error: error instanceof Error ? error.message : String(error) }));
      }
    }

    // The quiz reads a cached snapshot; refresh it from the new scores. A
    // failure here leaves the previous snapshot in place rather than failing the run.
    try {
      await step('refresh_match_data', async () => {
        const data = await getMatchData({ force: true });
        return { eligible_dreps: data.eligible_count, real_vote_questions: data.real_votes.length };
      });
    } catch (error) {
      demoteError();
      console.error(
        JSON.stringify({ event: 'cron_step_match_failed', error: error instanceof Error ? error.message : String(error) })
      );
    }

    // Quiz proposals and Hot Topics get for/against summaries from Yes and No voters' rationales.
    // Only proposals whose rationales changed are re-sent to the AI, so most runs cost nothing.
    if (STATEMENT_INTERVAL_HOURS[process.env.STATEMENT_SUMMARIES ?? ''] !== undefined) {
      try {
        await step('summarize_proposal_arguments', async () => {
          const [{ real_votes }, hot] = await Promise.all([getMatchData(), getHotTopics({ force: true })]);
          const targets = new Map<string, string>();
          for (const q of real_votes) targets.set(q.proposal_id, q.title);
          for (const t of hot.topics) targets.set(t.proposal_id, t.title);
          const r = await refreshProposalArguments(Array.from(targets, ([proposal_id, title]) => ({ proposal_id, title })));
          if (r.generated > 0) await Promise.all([getMatchData({ force: true }), getHotTopics({ force: true })]);
          return r;
        });
      } catch (error) {
        demoteError();
        console.error(
          JSON.stringify({ event: 'cron_step_proposal_arguments_failed', error: error instanceof Error ? error.message : String(error) })
        );
      }
    }

    // Cardano Forum threads for open proposals. Re-analyzed only when their posts change.
    if (STATEMENT_INTERVAL_HOURS[process.env.STATEMENT_SUMMARIES ?? ''] !== undefined) {
      try {
        await step('summarize_forum_discussions', async () => {
          const hot = await getHotTopics();
          return refreshForumDiscussions(hot.topics.map((t) => ({ proposal_id: t.proposal_id, title: t.title })));
        });
      } catch (error) {
        demoteError();
        console.error(
          JSON.stringify({ event: 'cron_step_forum_failed', error: error instanceof Error ? error.message : String(error) })
        );
      }
    }

    try {
      await step('refresh_hot_topics', async () => {
        const data = await getHotTopics({ force: true });
        return { topics: data.topics.length };
      });
    } catch (error) {
      demoteError();
      console.error(
        JSON.stringify({ event: 'cron_step_hot_topics_failed', error: error instanceof Error ? error.message : String(error) })
      );
    }

    try {
      await step('refresh_cards', async () => {
        const data = await getCards({ force: true });
        return { cards: data.cards.length, window: data.current_window };
      });
    } catch (error) {
      demoteError();
      console.error(JSON.stringify({ event: 'cron_step_cards_failed', error: error instanceof Error ? error.message : String(error) }));
    }

    try {
      await step('refresh_season', async () => {
        const data = await getSeasonData({ force: true });
        return { window: data.window, season: data.season, ranked_dreps: data.standings.length };
      });
    } catch (error) {
      demoteError();
      console.error(
        JSON.stringify({ event: 'cron_step_season_failed', error: error instanceof Error ? error.message : String(error) })
      );
    }

    try {
      await step('lock_eligibility', () => recordLockEligibility());
    } catch (error) {
      demoteError();
      console.error(JSON.stringify({ event: 'cron_step_lock_eligibility_failed', error: error instanceof Error ? error.message : String(error) }));
    }

    try {
      await step('social_avatars', () => refreshSocialAvatars());
    } catch (error) {
      demoteError();
      console.error(JSON.stringify({ event: 'cron_step_social_avatars_failed', error: error instanceof Error ? error.message : String(error) }));
    }

    try {
      await step('finalize_seasons', async () => {
        const done = await finalizeEndedSeasons();
        return { finalized: done };
      });
    } catch (error) {
      demoteError();
      console.error(JSON.stringify({ event: 'cron_step_finalize_failed', error: error instanceof Error ? error.message : String(error) }));
    }

    // Discord feeds are opt-in: set DISCORD_FEEDS=on once the server is set up.
    if (process.env.DISCORD_FEEDS === 'on' && discordConfigured()) {
      try {
        await step('discord_feeds', async () => {
          const report = await runFeeds({ apply: true });
          return { posted: report.posted.length, warnings: report.warnings };
        });
      } catch (error) {
        demoteError();
        console.error(JSON.stringify({ event: 'cron_step_discord_failed', error: error instanceof Error ? error.message : String(error) }));
      }
    }

    lastRun.current_step = 'done';
    console.log(
      JSON.stringify({ event: 'cron_pipeline_complete', duration_ms: Date.now() - pipelineStartTime, steps: lastRun.completed_steps })
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        event: 'cron_pipeline_error',
        step: lastRun?.error?.step,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      })
    );
  } finally {
    if (lastRun) lastRun.finished_at = new Date().toISOString();
  }
}

/**
 * POST /api/cron
 * Returns 202 Accepted immediately, pipeline runs in background
 */
export async function POST(request: Request): Promise<NextResponse> {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized: invalid or missing CRON_SECRET' }, { status: 401 });
  }

  console.log(JSON.stringify({ event: 'cron_request_accepted', timestamp: new Date().toISOString() }));

  // Fire and forget — do not await
  runPipeline().catch((error) => {
    console.error(JSON.stringify({ event: 'cron_unhandled_error', error: String(error), timestamp: new Date().toISOString() }));
  });

  // Return immediately with 202 Accepted
  return NextResponse.json(
    {
      status: 'accepted',
      message: 'Cron pipeline scheduled to run in background',
      timestamp: new Date().toISOString(),
    },
    { status: 202 }
  );
}

async function tableCounts(): Promise<Record<string, number | string>> {
  const tables = ['dreps', 'proposals', 'votes', 'drep_scores', 'drep_backing_snapshots', 'team_wallet_snapshots', 'season_cards'] as const;
  const counts: Record<string, number | string> = {};
  for (const table of tables) {
    const { count, error } = await supabaseAdmin.from(table).select('*', { count: 'exact', head: true });
    counts[table] = error ? `error: ${error.message}` : (count ?? 0);
  }
  return counts;
}

/**
 * GET /api/cron — public status page: the latest pipeline run (which step it
 * reached, any error) and current row counts. Contains no secrets.
 */
export async function GET(): Promise<NextResponse> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  let supabaseHost = 'not set';
  try {
    supabaseHost = new URL(supabaseUrl).host + (new URL(supabaseUrl).pathname !== '/' ? ' (WARNING: URL has a path; it should end at .supabase.co)' : '');
  } catch {
    supabaseHost = 'invalid URL';
  }

  return NextResponse.json({
    status: 'ok',
    supabase_host: supabaseHost,
    last_run: lastRun ?? 'no run since this deploy started',
    counts: await tableCounts(),
  });
}
