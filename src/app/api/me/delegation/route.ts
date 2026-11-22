import { NextResponse } from 'next/server';
import { currentStakeAddress } from '@/lib/auth/current';
import { lookupDelegation } from '@/lib/koios/delegation';

export const dynamic = 'force-dynamic';

// Delegation changes rarely; a short cache keeps page loads from each hitting Koios (1 req/s).
const cache = new Map<string, { drep: string | null; at: number }>();
const TTL_MS = 10 * 60 * 1000;

export async function GET() {
  const stakeAddress = currentStakeAddress();
  if (!stakeAddress) return NextResponse.json({ stakeAddress: null, drepId: null });

  const hit = cache.get(stakeAddress);
  if (hit && Date.now() - hit.at < TTL_MS) return NextResponse.json({ stakeAddress, drepId: hit.drep });

  try {
    const drep = await lookupDelegation(stakeAddress);
    cache.set(stakeAddress, { drep, at: Date.now() });
    return NextResponse.json({ stakeAddress, drepId: drep });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(JSON.stringify({ event: 'delegation_lookup_failed', error: message }));
    return NextResponse.json(
      { stakeAddress, drepId: null, error: `Couldn't look up your delegation on Koios: ${message}. Try again in a minute.` },
      { status: 503 }
    );
  }
}
