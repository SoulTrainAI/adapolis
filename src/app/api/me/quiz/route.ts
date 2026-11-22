import { NextResponse } from 'next/server';
import { z } from 'zod';
import { currentStakeAddress } from '@/lib/auth/current';
import { isSameOriginJson } from '@/lib/auth/same-origin';
import { supabaseAdmin } from '@/lib/sync/supabase-admin';

export const dynamic = 'force-dynamic';

const KEY = /^[a-z0-9_]{1,64}$/;
const ACTION = /^gov_action1[02-9ac-hj-np-z]{20,100}$/;

const Answers = z.object({
  topics: z
    .record(z.string().regex(KEY), z.object({ agree: z.number().int().min(0).max(10), importance: z.number().int().min(0).max(3) }))
    .refine((r) => Object.keys(r).length <= 50),
  realVotes: z.record(z.string().regex(ACTION), z.number().int().min(1).max(10)).refine((r) => Object.keys(r).length <= 50),
});
const Body = z.object({ answers: Answers, include_deeper: z.boolean() });

function signedOut() {
  return NextResponse.json({ error: 'Connect your wallet and sign in to save answers to it.' }, { status: 401 });
}

function storageError(message: string) {
  console.error(JSON.stringify({ event: 'quiz_profile_failed', error: message }));
  return NextResponse.json(
    { error: `Couldn't reach saved answers: ${message}. If this persists, run supabase/migrations/011_quiz_profiles.sql.` },
    { status: 503 }
  );
}

export async function GET() {
  const stakeAddress = currentStakeAddress();
  if (!stakeAddress) return NextResponse.json({ saved: null });
  const { data, error } = await supabaseAdmin
    .from('quiz_profiles')
    .select('answers, include_deeper, updated_at')
    .eq('stake_address', stakeAddress)
    .maybeSingle();
  if (error) return storageError(error.message);
  return NextResponse.json({ saved: data ?? null });
}

export async function PUT(request: Request) {
  if (!isSameOriginJson(request)) return NextResponse.json({ error: 'Saves must come from adapolis.net.' }, { status: 403 });
  const stakeAddress = currentStakeAddress();
  if (!stakeAddress) return signedOut();
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Those answers are not in the expected format.' }, { status: 400 });
  const updated_at = new Date().toISOString();
  const { error } = await supabaseAdmin
    .from('quiz_profiles')
    .upsert({ stake_address: stakeAddress, answers: parsed.data.answers, include_deeper: parsed.data.include_deeper, updated_at });
  if (error) return storageError(error.message);
  return NextResponse.json({ saved: { ...parsed.data, updated_at } });
}

export async function DELETE(request: Request) {
  if (!isSameOriginJson(request)) return NextResponse.json({ error: 'Requests must come from adapolis.net.' }, { status: 403 });
  const stakeAddress = currentStakeAddress();
  if (!stakeAddress) return signedOut();
  const { error } = await supabaseAdmin.from('quiz_profiles').delete().eq('stake_address', stakeAddress);
  if (error) return storageError(error.message);
  return NextResponse.json({ saved: null });
}
