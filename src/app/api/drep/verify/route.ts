import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createDrepSession, DREP_COOKIE, DREP_SESSION_TTL_SECONDS, verifyDrepChallenge } from '@/lib/auth/drep';
import { AuthConfigError } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

const hex = z.string().regex(/^[0-9a-fA-F]+$/).max(4096);
const Body = z.object({ token: z.string().max(1024), signature: hex, key: hex });

/** POST { token, signature, key } from the challenge and the wallet's CIP-95 signData → DRep session cookie. */
export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Expected { token, signature, key }.' }, { status: 400 });
  try {
    const result = verifyDrepChallenge(parsed.data);
    if (!result.ok) {
      console.log(JSON.stringify({ event: 'drep_verify_rejected', reason: result.reason }));
      return NextResponse.json({ error: result.reason }, { status: 401 });
    }
    const response = NextResponse.json({ drepId: result.drepId });
    response.cookies.set(DREP_COOKIE, createDrepSession(result.drepId), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: DREP_SESSION_TTL_SECONDS,
    });
    console.log(JSON.stringify({ event: 'drep_signed_in', drep_id: result.drepId }));
    return response;
  } catch (error) {
    if (error instanceof AuthConfigError) return NextResponse.json({ error: 'Sign-in is not configured on the server yet.' }, { status: 503 });
    throw error;
  }
}
