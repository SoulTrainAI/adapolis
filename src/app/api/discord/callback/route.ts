import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { checkState, completeLink, STATE_COOKIE } from '@/lib/discord/link';
import { currentDrep } from '@/lib/auth/current-drep';
import { currentStakeAddress } from '@/lib/auth/current';
import { SITE_URL } from '@/lib/site/social';

export const dynamic = 'force-dynamic';

/** Discord sends the visitor back here; we hand out roles and show the result on /discord. */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const back = (q: Record<string, string>) => {
    const res = NextResponse.redirect(new URL(`/discord?${new URLSearchParams(q)}`, SITE_URL));
    res.cookies.set(STATE_COOKIE, '', { path: '/', maxAge: 0 });
    return res;
  };
  if (params.get('error')) return back({ error: 'cancelled' });
  const code = params.get('code');
  if (!code || !checkState(params.get('state'), cookies().get(STATE_COOKIE)?.value)) return back({ error: 'expired' });
  try {
    const result = await completeLink(code, { drepId: currentDrep(), stakeAddress: currentStakeAddress() });
    console.log(JSON.stringify({ event: 'discord_linked', roles: result.granted, joined: result.joined }));
    return back({ linked: result.username, roles: result.granted.join(','), joined: result.joined ? '1' : '0' });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(JSON.stringify({ event: 'discord_link_failed', error: message }));
    return back({ error: 'failed', detail: message.slice(0, 300) });
  }
}
