/**
 * Sync Proposals Endpoint
 * POST /api/sync/proposals
 * Syncs proposals only
 */

import { syncProposals } from '@/lib/sync/sync-proposals';

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

    console.log(JSON.stringify({ event: 'sync_proposals_request', timestamp: new Date().toISOString() }));
    const result = await syncProposals();

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(JSON.stringify({ event: 'sync_proposals_error', error: errorMessage }));

    return new Response(JSON.stringify({ error: 'Proposals sync failed', details: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
