import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthConfigError, isStakeAddress, issueChallenge } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

const Body = z.object({ stakeAddress: z.string().refine(isStakeAddress) });

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Expected a mainnet stake address (stake1u…). Testnet and script stake addresses are not supported.' },
      { status: 400 }
    );
  }
  try {
    return NextResponse.json(issueChallenge(parsed.data.stakeAddress));
  } catch (error) {
    if (error instanceof AuthConfigError) {
      console.error(JSON.stringify({ event: 'auth_config_missing', error: error.message }));
      return NextResponse.json({ error: 'Sign-in is not configured on the server yet.' }, { status: 503 });
    }
    throw error;
  }
}
