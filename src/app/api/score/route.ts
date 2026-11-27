/**
 * Score API Route
 * POST /api/score?epoch=600
 * Computes GovScore (v2) for a given epoch
 * Requires Authorization header with CRON_SECRET
 */

import { computeGovScoresForEpoch } from '@/lib/scoring/govscore-v1';
import { supabaseAdmin } from '@/lib/sync/supabase-admin';

/**
 * POST /api/score
 * Triggers GovScore v1 computation for a given epoch
 * Query param: epoch (optional, defaults to 600)
 * Returns: top 10 DReps by raw_govscore
 */
export async function POST(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized. Send Authorization: Bearer <CRON_SECRET> (set in Railway variables).' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  try {
    // Get epoch from query params
    const url = new URL(request.url);
    const epochParam = url.searchParams.get('epoch');
    const epoch = epochParam ? parseInt(epochParam, 10) : 600;

    if (isNaN(epoch)) {
      return new Response(JSON.stringify({ error: 'Invalid epoch parameter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(JSON.stringify({ event: 'score_api_request', epoch, timestamp: new Date().toISOString() }));

    // Run scoring
    const result = await computeGovScoresForEpoch(epoch);

    // Fetch top 10
    const { data: topDReps, error: fetchError } = await supabaseAdmin
      .from('drep_scores')
      .select(
        `
        drep_id,
        raw_govscore,
        participation_rate,
        dreps(hex_id, amount_lovelace)
      `
      )
      .eq('epoch', epoch)
      .order('raw_govscore', { ascending: false })
      .limit(10);

    if (fetchError) {
      throw new Error(`Failed to fetch top DReps: ${fetchError.message}`);
    }

    const summary = {
      epoch,
      dreps_scored: result.dreps_scored,
      avg_participation: result.avg_participation,
      top_10: topDReps || [],
    };

    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(JSON.stringify({ event: 'score_api_error', error: errorMessage }));

    return new Response(JSON.stringify({ error: 'Scoring failed', details: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Health check endpoint
 */
export async function GET(): Promise<Response> {
  return new Response(JSON.stringify({ status: 'ok', message: 'Score endpoint is ready' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
