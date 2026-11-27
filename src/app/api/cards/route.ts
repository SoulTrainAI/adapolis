import { NextResponse } from 'next/server';
import { getCards } from '@/lib/cards/data';

export const dynamic = 'force-dynamic';

/** GET /api/cards → every registered DRep's card; ?retired=1 → retired DReps that ever voted, instead. */
export async function GET(request: Request) {
  try {
    const retired = new URL(request.url).searchParams.get('retired') === '1';
    return NextResponse.json(await getCards({ retired }), { headers: { 'Cache-Control': 'public, max-age=300' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(JSON.stringify({ event: 'cards_failed', error: message }));
    return NextResponse.json({ error: `Couldn't build DRep cards: ${message}. Try again in a minute.` }, { status: 503 });
  }
}
