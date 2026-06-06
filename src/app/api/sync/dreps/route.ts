/**
 * Sync DReps Endpoint
 * POST /api/sync/dreps
 * Syncs DReps only
 */

import { syncDReps } from '@/lib/sync/sync-dreps';

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

export async function POST(request: Request): Promise<Response> {
  try {
    if (!verifyAuth(request)) {
      return new Response(JSON.stringify({ error: 'Unauthorized: invalid or missing CRON_SECRET' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(JSON.stringify({ event: 'sync_dreps_request', timestamp: new Date().toISOString() }));
    const result = await syncDReps();

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(JSON.stringify({ event: 'sync_dreps_error', error: errorMessage }));

    return new Response(JSON.stringify({ error: 'DReps sync failed', details: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
