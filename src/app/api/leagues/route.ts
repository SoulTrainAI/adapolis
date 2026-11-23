import { NextResponse } from 'next/server';
import { z } from 'zod';
import { currentStakeAddress } from '@/lib/auth/current';
import { isSameOriginJson } from '@/lib/auth/same-origin';
import { createLeague, listLeagues } from '@/lib/season/leagues';
import { errorResponse } from '@/lib/season/route-errors';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json(await listLeagues(currentStakeAddress()));
  } catch (error) {
    return errorResponse(error, 'leagues_list_failed');
  }
}

const Body = z.object({ name: z.string().trim().min(3).max(40), visibility: z.enum(['public', 'private']) });

export async function POST(request: Request) {
  if (!isSameOriginJson(request)) return NextResponse.json({ error: 'League changes must come from adapolis.net.' }, { status: 403 });
  const me = currentStakeAddress();
  if (!me) return NextResponse.json({ error: 'Connect your wallet and sign in to create a league.' }, { status: 401 });
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Give the league a name (3–40 characters) and choose public or private.' }, { status: 400 });
  try {
    return NextResponse.json({ league: await createLeague(me, parsed.data.name, parsed.data.visibility) });
  } catch (error) {
    return errorResponse(error, 'league_create_failed');
  }
}
