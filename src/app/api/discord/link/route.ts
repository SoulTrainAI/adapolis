import { NextResponse } from 'next/server';
import { authorizeUrl, linkConfigured, STATE_COOKIE } from '@/lib/discord/link';
import { SITE_URL } from '@/lib/site/social';

export const dynamic = 'force-dynamic';

/** GET → redirect to Discord sign-in. */
export function GET() {
  if (!linkConfigured()) return NextResponse.redirect(new URL('/discord?error=not-configured', SITE_URL));
  const { url, nonce } = authorizeUrl();
  const response = NextResponse.redirect(url);
  response.cookies.set(STATE_COOKIE, nonce, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 600 });
  return response;
}
