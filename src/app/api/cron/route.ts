/**
 * Full Cron Pipeline
 * POST /api/cron
 * Returns 202 Accepted immediately, runs sync + score pipeline in background
 * Requires Authorization header with CRON_SECRET
 */

import { NextResponse } from 'next/server';
import { syncDReps } from '@/lib/sync/sync-dreps';
import { syncProposals } from '@/lib/sync/sync-proposals';
import { computeGovScoresForEpoch } from '@/lib/scoring/govscore-v1';
import { supabaseAdmin } from '@/lib/sync/supabase-admin';
import { fetchCurrentEpoch } from '@/lib/koios';
import { syncDRepMetadata } from '@/lib/metadata/drep-metadata';

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

  try {
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

    // Metadata failures are logged but don't stop scoring: profiles are cosmetic,
    // scores are the product.
    try {
      const metadataResult = await syncDRepMetadata();
      console.log(JSON.stringify({ event: 'cron_step_1b_metadata_complete', result: metadataResult }));
    } catch (error) {
      console.error(
        JSON.stringify({
          event: 'cron_step_1b_metadata_failed',
          error: error instanceof Error ? error.message : String(error),
        })
      );
    }

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
    console.log(
      JSON.stringify({
        event: 'cron_pipeline_complete',
        duration_ms: pipelineDuration,
        timestamp: new Date().toISOString(),
      })
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(
      JSON.stringify({
        event: 'cron_pipeline_error',
        error: errorMessage,
        timestamp: new Date().toISOString(),
      })
    );
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

/**
 * Health check endpoint
 * GET /api/cron returns 200 if the endpoint is reachable
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ status: 'ok', message: 'Cron endpoint is ready' });
}
