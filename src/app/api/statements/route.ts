/**
 * Stated-position summaries (AI) — admin trigger and public status.
 *
 * POST /api/statements  (requires CRON_SECRET)
 *   body: { dryRun?: boolean, limit?: number, maxCostUsd?: number, force?: boolean }
 *   A dry run only estimates cost. A real run continues in the background;
 *   check progress with GET.
 * GET /api/statements — progress/result of the latest run (no secrets).
 */

import { NextResponse } from 'next/server';
import { getStatementRunStatus, isStatementRunActive, runStatementSummaries, type RunOptions } from '@/lib/statements/run';

export const dynamic = 'force-dynamic';

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && request.headers.get('Authorization') === `Bearer ${secret}`;
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized: invalid or missing CRON_SECRET' }, { status: 401 });
  }
  if (isStatementRunActive()) {
    return NextResponse.json({ error: 'A run is already in progress', status: getStatementRunStatus() }, { status: 409 });
  }

  let options: RunOptions = {};
  try {
    const body = (await request.json()) as RunOptions;
    options = {
      dryRun: body.dryRun === true,
      limit: typeof body.limit === 'number' && body.limit > 0 ? Math.floor(body.limit) : undefined,
      maxCostUsd: typeof body.maxCostUsd === 'number' && body.maxCostUsd > 0 ? Math.min(body.maxCostUsd, 20) : undefined,
      force: body.force === true,
    };
  } catch {
    options = { dryRun: true };
  }

  if (options.dryRun) {
    return NextResponse.json(await runStatementSummaries(options));
  }

  runStatementSummaries(options).catch((error) =>
    console.error(JSON.stringify({ event: 'statement_run_unhandled', error: String(error) }))
  );
  return NextResponse.json(
    { status: 'started', message: 'Running in the background. Check progress at GET /api/statements.' },
    { status: 202 }
  );
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ latest_run: getStatementRunStatus() ?? 'no run since this deploy started' });
}
