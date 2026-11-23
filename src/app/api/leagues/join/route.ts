import { NextResponse } from 'next/server';
import { z } from 'zod';
import { currentStakeAddress } from '@/lib/auth/current';
import { isSameOriginJson } from '@/lib/auth/same-origin';
import { joinLeague } from '@/lib/season/leagues';
import { errorResponse } from '@/lib/season/route-errors';

export const dynamic = 'force-dynamic';

const Body = z.union([z.object({ code: z.string().regex(/^[A-Za-z0-9]{10}$/) }), z.object({ league_id: z.string().uuid() })]);

export async function POST(request: Request) {
  if (!isSameOriginJson(request)) return NextResponse.json({ error: 'League changes must come from adapolis.net.' }, { status: 403 });
  const me = currentStakeAddress();
  if (!me) return NextResponse.json({ error: 'Connect your wallet and sign in to join a league.' }, { status: 401 });
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Send an invite code or a public league id.' }, { status: 400 });
  try {
    return NextResponse.json({ league_id: await joinLeague(me, parsed.data) });
  } catch (error) {
    return errorResponse(error, 'league_join_failed');
  }
}
