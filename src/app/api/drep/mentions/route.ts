import { NextResponse } from 'next/server';
import { z } from 'zod';
import { currentDrep } from '@/lib/auth/current-drep';
import { isSameOriginJson } from '@/lib/auth/same-origin';
import { allowsTags, setAllowsTags } from '@/lib/drep-profile/mentions';

export const dynamic = 'force-dynamic';

/** GET → whether the signed-in DRep may be tagged in commentary posts. */
export async function GET() {
  const drepId = currentDrep();
  if (!drepId) return NextResponse.json({ allow: null });
  return NextResponse.json({ allow: await allowsTags(drepId) });
}

/** PUT { allow } → the signed-in DRep's choice. */
export async function PUT(request: Request) {
  if (!isSameOriginJson(request)) return NextResponse.json({ error: 'Send JSON from adapolis.net.' }, { status: 403 });
  const drepId = currentDrep();
  if (!drepId) return NextResponse.json({ error: 'Sign with your DRep key first.' }, { status: 401 });
  const parsed = z.object({ allow: z.boolean() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Expected { allow: true | false }.' }, { status: 400 });
  try {
    await setAllowsTags(drepId, parsed.data.allow);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 503 });
  }
  return NextResponse.json({ allow: parsed.data.allow });
}
