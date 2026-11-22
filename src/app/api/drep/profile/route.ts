import { NextResponse } from 'next/server';
import { currentDrep } from '@/lib/auth/current-drep';
import { isSameOriginJson } from '@/lib/auth/same-origin';
import { OverrideInput, sanitize, saveOverride } from '@/lib/drep-profile/overrides';

export const dynamic = 'force-dynamic';

/** PUT { image, bio, links } → saves the signed-in DRep's card edits. Send all nulls to go back to the on-chain profile. */
export async function PUT(request: Request) {
  if (!isSameOriginJson(request)) return NextResponse.json({ error: 'Send JSON from adapolis.net.' }, { status: 403 });
  const drepId = currentDrep();
  if (!drepId) return NextResponse.json({ error: 'Sign with your DRep key first.' }, { status: 401 });
  const parsed = OverrideInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Expected { image, bio, links }: bio up to 1500 characters, up to 8 links.' }, { status: 400 });
  const clean = sanitize(parsed.data);
  if (!clean.ok) return NextResponse.json({ error: clean.error }, { status: 400 });
  const empty = !clean.value.image && !clean.value.bio && clean.value.links === null;
  try {
    await saveOverride(drepId, empty ? null : clean.value);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 503 });
  }
  console.log(JSON.stringify({ event: 'drep_profile_saved', drep_id: drepId, reset: empty }));
  return NextResponse.json({ saved: true });
}
