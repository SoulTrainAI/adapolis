import { NextResponse } from 'next/server';
import { getRace } from '@/lib/season/race';

export const dynamic = 'force-dynamic';

/** GET ?window=N → the season race (current season by default). */
export async function GET(request: Request) {
  const param = new URL(request.url).searchParams.get('window');
  const window = param !== null && /^-?\d{1,3}$/.test(param) ? Number(param) : undefined;
  try {
    return NextResponse.json(await getRace(window), { headers: { 'Cache-Control': 'public, max-age=300' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(JSON.stringify({ event: 'season_race_failed', error: message }));
    return NextResponse.json({ error: `Couldn't load the race: ${message}. Try again in a minute.` }, { status: 503 });
  }
}
