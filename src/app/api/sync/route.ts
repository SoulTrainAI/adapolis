/**
 * Sync API Routes
 * POST /api/sync — DReps + Proposals (no votes)
 * POST /api/sync/dreps — DReps only
 * POST /api/sync/proposals — Proposals only
 * POST /api/sync/votes — Votes only (with pagination)
 * GET /api/sync — Health check
 * Requires Authorization header with CRON_SECRET
 */

import { syncDRepsAndProposals } from '@/lib/sync/sync-all';

function verifyAuth(request: Request): boolean {
  const authHeader = request.headers.get('Authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error(JSON.stringify({ event: 'cron_secret_missing' }));
    return false;
  }

  const expectedAuth = `Bearer ${cronSecret}`;
  if (!authHeader || authHeader !== expectedAuth) {
    console.warn(JSON.stringify({ event: 'sync_unauthorized', provided: !!authHeader }));
    return false;
  }

  return true;
}

/**
 * POST /api/sync
 * Triggers DReps + Proposals sync (no votes)
 */
export async function POST(request: Request): Promise<Response> {
  try {
    if (!verifyAuth(request)) {
      return new Response(JSON.stringify({ error: 'Unauthorized: invalid or missing CRON_SECRET' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(JSON.stringify({ event: 'sync_dreps_proposals_request', timestamp: new Date().toISOString() }));
    const summary = await syncDRepsAndProposals();

    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(JSON.stringify({ event: 'sync_api_error', error: errorMessage }));

    return new Response(JSON.stringify({ error: 'Sync failed', details: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Health check endpoint
 * GET /api/sync returns 200 if the endpoint is reachable
 */
export async function GET(): Promise<Response> {
  return new Response(JSON.stringify({ status: 'ok', message: 'Sync endpoint is ready' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
