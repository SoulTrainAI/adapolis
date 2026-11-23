import { NextResponse } from 'next/server';
import { currentStakeAddress } from '@/lib/auth/current';
import { isSameOriginJson } from '@/lib/auth/same-origin';
import { leaveLeague } from '@/lib/season/leagues';
import { errorResponse } from '@/lib/season/route-errors';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: { leagueId: string } }) {
  if (!isSameOriginJson(request)) return NextResponse.json({ error: 'League changes must come from adapolis.net.' }, { status: 403 });
  const me = currentStakeAddress();
  if (!me) return NextResponse.json({ error: 'Connect your wallet and sign in first.' }, { status: 401 });
  if (!/^[0-9a-f-]{36}$/.test(params.leagueId)) return NextResponse.json({ error: 'Unknown league.' }, { status: 400 });
  try {
    await leaveLeague(me, params.leagueId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error, 'league_leave_failed');
  }
}
