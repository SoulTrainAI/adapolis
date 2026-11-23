import { NextResponse } from 'next/server';
import { getCardDetail, getCards } from '@/lib/cards/data';
import { getJourney } from '@/lib/cards/journey';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: { drepId: string } }) {
  if (!/^drep1[02-9ac-hj-np-z]{20,100}$/.test(params.drepId)) {
    return NextResponse.json({ error: 'Expected a DRep ID (drep1…).' }, { status: 400 });
  }
  try {
    const [detail, cards] = await Promise.all([getCardDetail(params.drepId), getCards()]);
    if (!detail) return NextResponse.json({ error: 'No card for that DRep.' }, { status: 404 });
    const journey = await getJourney(params.drepId, detail.seasons, cards.current_epoch);
    return NextResponse.json({ journey }, { headers: { 'Cache-Control': 'public, max-age=3600' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(JSON.stringify({ event: 'card_journey_failed', drepId: params.drepId, error: message }));
    return NextResponse.json({ error: `Couldn't load this DRep's journey: ${message}. Try again shortly.` }, { status: 503 });
  }
}
