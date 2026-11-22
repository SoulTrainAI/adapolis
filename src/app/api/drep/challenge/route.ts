import { NextResponse } from 'next/server';
import { z } from 'zod';
import { issueDrepChallenge } from '@/lib/auth/drep';
import { AuthConfigError } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/sync/supabase-admin';

export const dynamic = 'force-dynamic';

const Body = z.object({ publicKey: z.string().regex(/^[0-9a-fA-F]{64}$/) });

/** POST { publicKey }: the wallet's DRep public key (CIP-95 getPubDRepKey) → a message to sign. */
export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Expected { publicKey }: the 32-byte DRep public key from the wallet, in hex.' }, { status: 400 });
  try {
    const challenge = issueDrepChallenge(parsed.data.publicKey);
    const { data, error } = await supabaseAdmin.from('dreps').select('is_registered').eq('drep_id', challenge.drepId).maybeSingle();
    if (error) return NextResponse.json({ error: `Couldn't look up the DRep: ${error.message}` }, { status: 503 });
    if (!data) {
      return NextResponse.json(
        { error: `This wallet's DRep key (${challenge.drepId.slice(0, 16)}…) isn't a DRep we know. Register it as a DRep first, or switch to the wallet account you registered with.` },
        { status: 404 }
      );
    }
    if (!(data as { is_registered: boolean }).is_registered) return NextResponse.json({ error: 'This DRep is retired. Only registered DReps can edit their card.' }, { status: 403 });
    return NextResponse.json(challenge);
  } catch (error) {
    if (error instanceof AuthConfigError) return NextResponse.json({ error: 'Sign-in is not configured on the server yet.' }, { status: 503 });
    throw error;
  }
}
