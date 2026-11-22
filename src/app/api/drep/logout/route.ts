import { NextResponse } from 'next/server';
import { DREP_COOKIE } from '@/lib/auth/drep';

export const dynamic = 'force-dynamic';

export function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(DREP_COOKIE, '', { path: '/', maxAge: 0 });
  return response;
}
