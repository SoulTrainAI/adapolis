import { NextResponse } from 'next/server';
import { cronSecretMismatch, hasCronSecret } from '@/lib/auth/cron-secret';
import { syncRecentVotes } from '@/lib/sync/sync-votes';
import { getSeasonData } from '@/lib/season/data';
import { getCards } from '@/lib/cards/data';
import { runNotifications } from '@/lib/notifications/generate';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * POST /api/cron/votes — the hourly light run (railway.json): new votes only,
 * then season points and cards are recomputed. The full pipeline at /api/cron
 * still runs every 6 hours for DReps, proposals, scores and summaries.
 * Notifications are generated here too, so they follow the freshest points.
 */
export async function POST(request: Request): Promise<NextResponse> {
  if (!hasCronSecret(request)) return NextResponse.json({ error: cronSecretMismatch(request) }, { status: 401 });
  const started = Date.now();
  try {
    const votes = await syncRecentVotes();
    const [season, cards] = await Promise.all([getSeasonData({ force: true }), getCards({ force: true })]);
    // Notifications never block the sync: a failure is logged and reported, the points are already updated.
    const notifications = await runNotifications().catch((e: unknown) => ({ error: e instanceof Error ? e.message : String(e) }));
    const result = { votes, season: season.season, cards: cards.cards.length, notifications, ms: Date.now() - started };
    console.log(JSON.stringify({ event: 'cron_votes_done', ...result }));
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(JSON.stringify({ event: 'cron_votes_failed', error: message }));
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
