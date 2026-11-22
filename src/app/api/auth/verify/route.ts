import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  AuthConfigError,
  createSessionToken,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  verifyChallenge,
} from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

const hex = z.string().regex(/^[0-9a-fA-F]+$/).max(4096);
const Body = z.object({ token: z.string().max(1024), signature: hex, key: hex });

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Expected { token, signature, key } from the challenge and the wallet signData result.' },
      { status: 400 }
    );
  }
  try {
    const result = await verifyChallenge(parsed.data);
    if (!result.ok) {
      console.log(JSON.stringify({ event: 'auth_verify_rejected', reason: result.reason }));
      return NextResponse.json({ error: result.reason }, { status: 401 });
    }
    const response = NextResponse.json({ stakeAddress: result.stakeAddress });
    response.cookies.set(SESSION_COOKIE, createSessionToken(result.stakeAddress), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_TTL_SECONDS,
    });
    console.log(JSON.stringify({ event: 'auth_signed_in', stake_address: result.stakeAddress }));
    return response;
  } catch (error) {
    if (error instanceof AuthConfigError) {
      console.error(JSON.stringify({ event: 'auth_config_missing', error: error.message }));
      return NextResponse.json({ error: 'Sign-in is not configured on the server yet.' }, { status: 503 });
    }
    throw error;
  }
}
