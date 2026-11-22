import { NextResponse } from 'next/server';
import { currentDrep } from '@/lib/auth/current-drep';
import { getOverride } from '@/lib/drep-profile/overrides';
import { getOnchainProfile } from '@/lib/cards/data';

export const dynamic = 'force-dynamic';

/** GET → { drepId, override, onchain } for the signed-in DRep, or { drepId: null }. */
export async function GET() {
  const drepId = currentDrep();
  if (!drepId) return NextResponse.json({ drepId: null });
  const [override, onchain] = await Promise.all([getOverride(drepId), getOnchainProfile(drepId)]);
  return NextResponse.json({ drepId, override, onchain });
}
