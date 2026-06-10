/**
 * Full Cron Pipeline
 * POST /api/cron
 * Runs: syncDReps() → syncProposals() → computeGovScoresForEpoch(currentEpoch)
 * Requires Authorization header with CRON_SECRET
 */

import { syncDReps } from '@/lib/sync/sync-dreps';
import { syncProposals } from '@/lib/sync/sync-proposals';
import { computeGovScoresForEpoch } from '@/lib/scoring/govscore-v1';
import { supabaseAdmin } from '@/lib/sync/supabase-admin';

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

/**
 * Gets the current epoch from drep_scores (latest computed epoch)
 */
async function getCurrentEpoch(): Promise<number> {
  const { data: latestEpochData, error: epochError } = await supabaseAdmin
    .from('drep_scores')
    .select('epoch')
    .order('epoch', { ascending: false })
    .limit(1);

  if (epochError || !latestEpochData || latestEpochData.length === 0) {
    console.warn(
      JSON.stringify({
        event: 'current_epoch_fetch_failed',
        error: epochError?.message || 'No epochs found',
        defaulting_to: 600,
      })
    );
    return 600; // Fallback to epoch 600 if no scores exist
  }

  return latestEpochData[0].epoch;
}

/**
 * POST /api/cron
 * Runs full sync + score pipeline
 */
export async function POST(request: Request): Promise<Response> {
  const pipelineStartTime = Date.now();

  try {
    if (!verifyAuth(request)) {
      return new Response(JSON.stringify({ error: 'Unauthorized: invalid or missing CRON_SECRET' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(JSON.stringify({ event: 'cron_pipeline_start', timestamp: new Date().toISOString() }));

    // Step 1: Sync DReps
    console.log(JSON.stringify({ event: 'cron_step_1_sync_dreps', timestamp: new Date().toISOString() }));
    const drepsSyncResult = await syncDReps();
    console.log(
      JSON.stringify({
        event: 'cron_step_1_complete',
        result: drepsSyncResult,
        timestamp: new Date().toISOString(),
      })
    );

    // Step 2: Sync Proposals
    console.log(JSON.stringify({ event: 'cron_step_2_sync_proposals', timestamp: new Date().toISOString() }));
    const proposalsSyncResult = await syncProposals();
    console.log(
      JSON.stringify({
        event: 'cron_step_2_complete',
        result: proposalsSyncResult,
        timestamp: new Date().toISOString(),
      })
    );

    // Step 3: Get current epoch
    console.log(JSON.stringify({ event: 'cron_step_3_get_epoch', timestamp: new Date().toISOString() }));
    const currentEpoch = await getCurrentEpoch();
    console.log(JSON.stringify({ event: 'current_epoch_determined', epoch: currentEpoch }));

    // Step 4: Compute GovScores
    console.log(
      JSON.stringify({
        event: 'cron_step_4_compute_scores',
        epoch: currentEpoch,
        timestamp: new Date().toISOString(),
      })
    );
    const scoreResult = await computeGovScoresForEpoch(currentEpoch);
    console.log(
      JSON.stringify({
        event: 'cron_step_4_complete',
        result: scoreResult,
        timestamp: new Date().toISOString(),
      })
    );

    const pipelineDuration = Date.now() - pipelineStartTime;

    const summary = {
      status: 'success',
      pipeline_duration_ms: pipelineDuration,
      timestamp: new Date().toISOString(),
      steps: {
        sync_dreps: drepsSyncResult,
        sync_proposals: proposalsSyncResult,
        current_epoch: currentEpoch,
        compute_govscore: scoreResult,
      },
    };

    console.log(JSON.stringify({ event: 'cron_pipeline_complete', summary, timestamp: new Date().toISOString() }));

    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(JSON.stringify({ event: 'cron_pipeline_error', error: errorMessage, timestamp: new Date().toISOString() }));

    return new Response(
      JSON.stringify({
        status: 'error',
        error: 'Cron pipeline failed',
        details: errorMessage,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Health check endpoint
 * GET /api/cron returns 200 if the endpoint is reachable
 */
export async function GET(): Promise<Response> {
  return new Response(JSON.stringify({ status: 'ok', message: 'Cron endpoint is ready' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
