import { NextResponse } from 'next/server';
import { z } from 'zod';
import { currentStakeAddress } from '@/lib/auth/current';
import { isSameOriginJson } from '@/lib/auth/same-origin';
import { getSwapState, swapRetired } from '@/lib/season/fantasy';
import { errorResponse } from '@/lib/season/route-errors';

export const dynamic = 'force-dynamic';

/** GET → the signed-in player's live team and which picks have retired. */
export async function GET() {
  const me = currentStakeAddress();
  if (!me) return NextResponse.json({ state: null });
  try {
    return NextResponse.json({ state: await getSwapState(me) });
  } catch (error) {
    return errorResponse(error, 'swap_state_failed');
  }
}

const Body = z.object({ slot: z.number().int().min(1).max(5), drep_id: z.string().regex(/^drep1[02-9ac-hj-np-z]{20,80}$/) });

export async function POST(request: Request) {
  if (!isSameOriginJson(request)) return NextResponse.json({ error: 'Team changes must come from adapolis.net.' }, { status: 403 });
  const me = currentStakeAddress();
  if (!me) return NextResponse.json({ error: 'Connect your wallet and sign in first.' }, { status: 401 });
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Send the slot (1–5) and the replacement DRep ID.' }, { status: 400 });
  try {
    return NextResponse.json({ roster: await swapRetired(me, parsed.data.slot, parsed.data.drep_id) });
  } catch (error) {
    return errorResponse(error, 'swap_failed');
  }
}
