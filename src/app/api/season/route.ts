import { NextResponse } from 'next/server';
import { getSeasonData } from '@/lib/season/data';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const param = new URL(request.url).searchParams.get('window');
  const window = param !== null && /^\d{1,3}$/.test(param) ? Number(param) : undefined;
  try {
    return NextResponse.json(await getSeasonData({ window }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(JSON.stringify({ event: 'season_data_failed', error: message }));
    return NextResponse.json(
      { error: `Couldn't compute season standings: ${message}. Koios or Supabase may be unreachable; try again in a minute.` },
      { status: 503 }
    );
  }
}
