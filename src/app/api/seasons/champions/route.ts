import { NextResponse } from 'next/server';
import { getChampions } from '@/lib/season/champions';
import { errorResponse } from '@/lib/season/route-errors';

export const dynamic = 'force-dynamic';

/** GET ?season=N → that season's Champion Cards (latest finalized season by default). */
export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get('season');
  try {
    const data = await getChampions(raw && /^\d{1,3}$/.test(raw) ? Number(raw) : null);
    return NextResponse.json(data ?? { season_number: null, champions: [] }, { headers: { 'Cache-Control': 'public, max-age=600' } });
  } catch (error) {
    return errorResponse(error, 'champions_failed');
  }
}
