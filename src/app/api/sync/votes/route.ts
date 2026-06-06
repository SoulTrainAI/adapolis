/**
 * Sync Votes Endpoint
 * POST /api/sync/votes
 * Syncs votes with optional pagination
 * Body: { limit?: number (default 50), offset?: number (default 0) }
 */

import { syncVotes } from '@/lib/sync/sync-votes';

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

    let limit = 50;
    let offset = 0;

    try {
      const body = await request.json() as { limit?: number; offset?: number };
      if (body.limit !== undefined) limit = Math.max(1, body.limit);
      if (body.offset !== undefined) offset = Math.max(0, body.offset);
    } catch {
      // No JSON body or invalid JSON, use defaults
    }

    console.log(
      JSON.stringify({
        event: 'sync_votes_request',
        limit,
        offset,
        timestamp: new Date().toISOString(),
      })
    );
    const result = await syncVotes(undefined, { limit, offset });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(JSON.stringify({ event: 'sync_votes_error', error: errorMessage }));

    return new Response(JSON.stringify({ error: 'Votes sync failed', details: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
