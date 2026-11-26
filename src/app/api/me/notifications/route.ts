import { NextResponse } from 'next/server';
import { z } from 'zod';
import { currentStakeAddress } from '@/lib/auth/current';
import { isSameOriginJson } from '@/lib/auth/same-origin';
import { getPrefs, listNotifications, markRead, savePrefs } from '@/lib/notifications/store';
import { NOTIFICATION_TYPES, type NotificationType, type Prefs } from '@/lib/notifications/types';

export const dynamic = 'force-dynamic';

/** GET → { signed_in, items, unread, prefs } for the signed-in wallet. */
export async function GET() {
  const stake = currentStakeAddress();
  if (!stake) return NextResponse.json({ signed_in: false, items: [], unread: 0, prefs: {} });
  const [{ items, unread }, prefs] = await Promise.all([listNotifications(stake), getPrefs(stake)]);
  return NextResponse.json({ signed_in: true, items, unread, prefs });
}

const PrefSchema = z.object({ inapp: z.boolean().optional(), email: z.boolean().optional() });
const Body = z.union([
  z.object({ read: z.union([z.literal('all'), z.number().int().positive()]) }),
  z.object({ prefs: z.record(z.string(), PrefSchema) }),
]);

export async function POST(request: Request) {
  if (!isSameOriginJson(request)) return NextResponse.json({ error: 'Bad request origin.' }, { status: 400 });
  const stake = currentStakeAddress();
  if (!stake) return NextResponse.json({ error: 'Sign in with your wallet first.' }, { status: 401 });
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  try {
    if ('read' in parsed.data) await markRead(stake, parsed.data.read);
    else {
      const prefs: Prefs = {};
      for (const [k, v] of Object.entries(parsed.data.prefs)) if (k in NOTIFICATION_TYPES) prefs[k as NotificationType] = v;
      await savePrefs(stake, prefs);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
