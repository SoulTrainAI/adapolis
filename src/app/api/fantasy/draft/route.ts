import { NextResponse } from 'next/server';
import { currentStakeAddress } from '@/lib/auth/current';
import { getDraftData } from '@/lib/season/fantasy';

export const dynamic = 'force-dynamic';

export async function GET() {
  const stakeAddress = currentStakeAddress();
  try {
    const data = await getDraftData(stakeAddress);
    return NextResponse.json({ enabled: data !== null, signed_in: stakeAddress !== null, ...(data ?? {}) });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(JSON.stringify({ event: 'draft_data_failed', error: message }));
    return NextResponse.json(
      { error: `Couldn't load the draft: ${message}. Koios or Supabase may be unreachable; try again in a minute.` },
      { status: 503 }
    );
  }
}
