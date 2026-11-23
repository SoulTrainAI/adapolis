import { NextResponse } from 'next/server';
import { z } from 'zod';
import { currentStakeAddress } from '@/lib/auth/current';
import { isSameOriginJson } from '@/lib/auth/same-origin';
import { DraftError, ROSTER_SIZE, saveRoster } from '@/lib/season/fantasy';

export const dynamic = 'force-dynamic';

const Body = z.object({
  team_name: z
    .string()
    .trim()
    .max(40)
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .default(null),
  drep_ids: z.array(z.string().regex(/^drep1[02-9ac-hj-np-z]{20,80}$/)).length(ROSTER_SIZE),
  in_global: z.boolean().optional(),
});

export async function POST(request: Request) {
  if (!isSameOriginJson(request)) {
    return NextResponse.json({ error: 'Roster changes must come from adapolis.net.' }, { status: 403 });
  }
  const stakeAddress = currentStakeAddress();
  if (!stakeAddress) {
    return NextResponse.json({ error: 'Connect your wallet and sign in to save a team.' }, { status: 401 });
  }
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: `Send a team name (up to 40 characters) and exactly ${ROSTER_SIZE} DRep IDs.` },
      { status: 400 }
    );
  }
  try {
    const roster = await saveRoster(stakeAddress, parsed.data);
    return NextResponse.json({ roster });
  } catch (error) {
    if (error instanceof DraftError) return NextResponse.json({ error: error.message }, { status: error.status });
    const message = error instanceof Error ? error.message : String(error);
    console.error(JSON.stringify({ event: 'roster_save_failed', error: message }));
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
