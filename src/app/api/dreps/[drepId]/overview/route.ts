import { NextResponse } from 'next/server';
import { z } from 'zod';
import { currentStakeAddress } from '@/lib/auth/current';
import { currentDrep } from '@/lib/auth/current-drep';
import { isSameOriginJson } from '@/lib/auth/same-origin';
import { getOverview, reportError, saveReply } from '@/lib/overview/data';

export const dynamic = 'force-dynamic';

const DREP = /^drep1[02-9ac-hj-np-z]{20,100}$/;

export async function GET(_request: Request, { params }: { params: { drepId: string } }) {
  if (!DREP.test(params.drepId)) return NextResponse.json({ error: 'Expected a DRep ID (drep1…).' }, { status: 400 });
  const overview = await getOverview(params.drepId);
  return NextResponse.json({ overview, is_this_drep: currentDrep() === params.drepId }, { headers: { 'Cache-Control': 'private, max-age=60' } });
}

const Body = z.union([z.object({ report: z.string().trim().min(5).max(1500) }), z.object({ reply: z.string().trim().max(1500) })]);

/** { report } from any signed-in wallet or DRep; { reply } only from the DRep this overview is about (DRep-key session). */
export async function POST(request: Request, { params }: { params: { drepId: string } }) {
  if (!isSameOriginJson(request)) return NextResponse.json({ error: 'Bad request origin.' }, { status: 400 });
  if (!DREP.test(params.drepId)) return NextResponse.json({ error: 'Expected a DRep ID (drep1…).' }, { status: 400 });
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Write at least a few words (up to 1,500 characters).' }, { status: 400 });
  const stake = currentStakeAddress();
  const drep = currentDrep();
  try {
    if ('reply' in parsed.data) {
      if (drep !== params.drepId) return NextResponse.json({ error: 'Only this DRep can respond. Sign in with your DRep key on the Claim Profile page.' }, { status: 403 });
      await saveReply(params.drepId, parsed.data.reply || null);
    } else {
      if (!stake && !drep) return NextResponse.json({ error: 'Connect a wallet to report an error (it keeps spam out).' }, { status: 401 });
      await reportError(params.drepId, parsed.data.report, { stake, drep });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
