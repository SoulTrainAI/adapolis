import { NextResponse } from 'next/server';
import { getCards } from '@/lib/cards/data';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json(await getCards(), { headers: { 'Cache-Control': 'public, max-age=300' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(JSON.stringify({ event: 'cards_failed', error: message }));
    return NextResponse.json({ error: `Couldn't build DRep cards: ${message}. Try again in a minute.` }, { status: 503 });
  }
}
