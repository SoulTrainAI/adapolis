import { NextResponse } from 'next/server';
import { leagueByCode } from '@/lib/season/leagues';
import { errorResponse } from '@/lib/season/route-errors';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: { code: string } }) {
  if (!/^[A-Za-z0-9]{10}$/.test(params.code)) return NextResponse.json({ error: 'That invite link isn’t valid.' }, { status: 400 });
  try {
    const league = await leagueByCode(params.code);
    if (!league) return NextResponse.json({ error: 'That invite link isn’t valid any more.' }, { status: 404 });
    return NextResponse.json({ league });
  } catch (error) {
    return errorResponse(error, 'league_code_failed');
  }
}
