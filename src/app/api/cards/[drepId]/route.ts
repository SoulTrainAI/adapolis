import { NextResponse } from 'next/server';
import { getCardDetail } from '@/lib/cards/data';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: { drepId: string } }) {
  if (!/^drep1[02-9ac-hj-np-z]{20,100}$/.test(params.drepId)) {
    return NextResponse.json({ error: 'Expected a DRep ID (drep1…).' }, { status: 400 });
  }
  try {
    const detail = await getCardDetail(params.drepId);
    if (!detail) return NextResponse.json({ error: 'No card for that DRep.' }, { status: 404 });
    return NextResponse.json(detail, { headers: { 'Cache-Control': 'public, max-age=300' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(JSON.stringify({ event: 'card_detail_failed', error: message }));
    return NextResponse.json({ error: `Couldn't load this card: ${message}.` }, { status: 503 });
  }
}
