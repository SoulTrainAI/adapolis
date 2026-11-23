import { NextResponse } from 'next/server';
import { currentStakeAddress } from '@/lib/auth/current';
import { getLeaderboard } from '@/lib/season/leaderboard';

export const dynamic = 'force-dynamic';

/** GET ?season=N → fantasy teams ranked by points (current season by default). */
export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get('season');
  const season = raw && /^\d{1,3}$/.test(raw) ? Number(raw) : null;
  try {
    const data = await getLeaderboard({ season, me: currentStakeAddress() });
    if (!data) return NextResponse.json({ error: 'No fantasy season yet.' }, { status: 404 });
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(JSON.stringify({ event: 'leaderboard_failed', error: message }));
    return NextResponse.json({ error: `Couldn't load the leaderboard: ${message}` }, { status: 503 });
  }
}
