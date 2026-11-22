import { NextResponse } from 'next/server';
import { z } from 'zod';
import { currentStakeAddress } from '@/lib/auth/current';
import { koiosFetch } from '@/lib/koios/client';

export const dynamic = 'force-dynamic';

const AccountSchema = z.array(z.object({ stake_address: z.string(), delegated_drep: z.string().nullable() }));

// Delegation changes rarely; a short cache keeps page loads from each hitting Koios (1 req/s).
const cache = new Map<string, { drep: string | null; at: number }>();
const TTL_MS = 10 * 60 * 1000;

export async function GET() {
  const stakeAddress = currentStakeAddress();
  if (!stakeAddress) return NextResponse.json({ stakeAddress: null, drepId: null });

  const hit = cache.get(stakeAddress);
  if (hit && Date.now() - hit.at < TTL_MS) return NextResponse.json({ stakeAddress, drepId: hit.drep });

  try {
    const raw = await koiosFetch<unknown>('/account_info', { method: 'POST', body: { _stake_addresses: [stakeAddress] } });
    const parsed = AccountSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error(`unexpected Koios /account_info shape: ${parsed.error.message}`);
    }
    const drep = parsed.data[0]?.delegated_drep ?? null;
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
