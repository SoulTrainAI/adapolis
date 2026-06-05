/**
 * Sync API Route
 * POST /api/sync
 * Triggers the ETL sync jobs
 * Requires Authorization header with CRON_SECRET
 */

import { syncAll } from '@/lib/sync/sync-all';

/**
 * POST /api/sync
 * Triggers all sync jobs (DReps, Proposals, Votes)
 * Requires: Authorization: Bearer {CRON_SECRET} header
 * Returns: JSON summary of sync results
 */
export async function POST(request: Request): Promise<Response> {
  try {
    // Verify CRON_SECRET
    const authHeader = request.headers.get('Authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error(JSON.stringify({ event: 'cron_secret_missing' }));
      return new Response(JSON.stringify({ error: 'Server misconfiguration: CRON_SECRET not set' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const expectedAuth = `Bearer ${cronSecret}`;
    if (!authHeader || authHeader !== expectedAuth) {
      console.warn(JSON.stringify({ event: 'sync_unauthorized', provided: !!authHeader }));
      return new Response(JSON.stringify({ error: 'Unauthorized: invalid or missing CRON_SECRET' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Run sync
    console.log(JSON.stringify({ event: 'sync_api_request', timestamp: new Date().toISOString() }));
    const summary = await syncAll();

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
