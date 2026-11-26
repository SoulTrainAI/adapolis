import { NextResponse } from 'next/server';
import { z } from 'zod';
import { adminConfig, currentAdmin } from '@/lib/admin/auth';
import { isSameOriginJson } from '@/lib/auth/same-origin';
import {
  editUnclaimedProfile,
  logAction,
  getProfileRow,
  moderateProfile,
  recentActions,
  renameLeague,
  renameTeam,
  searchLeagues,
  searchTeams,
} from '@/lib/admin/actions';

export const dynamic = 'force-dynamic';

const forbidden = () => NextResponse.json({ error: 'Admins only. Sign in with a wallet listed in ADMIN_STAKE_ADDRESSES.' }, { status: 403 });

/** GET ?view=me|teams|leagues|profile|log&q=… */
export async function GET(request: Request) {
  const admin = currentAdmin();
  const params = new URL(request.url).searchParams;
  const view = params.get('view') ?? 'me';
  if (view === 'me') return NextResponse.json({ admin: admin !== null, config: adminConfig() });
  if (!admin) return forbidden();
  const q = (params.get('q') ?? '').trim().slice(0, 100);
  try {
    if (view === 'teams') return NextResponse.json({ teams: q.length >= 2 ? await searchTeams(q) : [] });
    if (view === 'leagues') return NextResponse.json({ leagues: q.length >= 2 ? await searchLeagues(q) : [] });
    if (view === 'profile') return NextResponse.json({ profile: await getProfileRow(q) });
    if (view === 'log') return NextResponse.json({ log: await recentActions() });
    return NextResponse.json({ error: 'Unknown view.' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

const Body = z.discriminatedUnion('action', [
  z.object({ action: z.literal('rename_team'), roster_id: z.string().uuid(), name: z.string().max(40).nullable(), reason: z.string().max(300) }),
  z.object({ action: z.literal('rename_league'), league_id: z.string().uuid(), name: z.string().min(3).max(40), reason: z.string().max(300) }),
  z.object({
    action: z.literal('moderate_profile'),
    drep_id: z.string(),
    hide_image: z.boolean().optional(),
    hide_bio: z.boolean().optional(),
    note: z.string().max(300),
  }),
  z.object({ action: z.literal('edit_unclaimed_profile'), drep_id: z.string(), profile: z.unknown() }),
  z.object({ action: z.literal('run_job'), job: z.enum(['full', 'votes']) }),
]);

export async function POST(request: Request) {
  if (!isSameOriginJson(request)) return NextResponse.json({ error: 'Bad request origin.' }, { status: 400 });
  const admin = currentAdmin();
  if (!admin) return forbidden();
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  const b = parsed.data;
  try {
    if (b.action === 'rename_team') await renameTeam(admin, b.roster_id, b.name?.trim() || null, b.reason);
    else if (b.action === 'rename_league') await renameLeague(admin, b.league_id, b.name.trim(), b.reason);
    else if (b.action === 'moderate_profile') await moderateProfile(admin, b.drep_id, { hide_image: b.hide_image, hide_bio: b.hide_bio, note: b.note });
    else if (b.action === 'edit_unclaimed_profile') await editUnclaimedProfile(admin, b.drep_id, b.profile);
    else if (b.action === 'run_job') {
      const secret = process.env.CRON_SECRET?.trim();
      if (!secret) throw new Error('CRON_SECRET is not set in Railway.');
      const path = b.job === 'full' ? '/api/cron' : '/api/cron/votes';
      await logAction(admin, 'run_job', path, {});
      // Runs the same endpoint Railway's cron calls, server to server; the secret never reaches the browser.
      const res = await fetch(new URL(path, request.url), { method: 'POST', headers: { Authorization: `Bearer ${secret}` } });
      if (!res.ok && res.status !== 202) throw new Error(`${path} returned HTTP ${res.status}.`);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 });
  }
}
