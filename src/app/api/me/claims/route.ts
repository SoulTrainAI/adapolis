import { NextResponse } from 'next/server';
import { currentStakeAddress } from '@/lib/auth/current';
import { currentDrep } from '@/lib/auth/current-drep';
import { getClaims } from '@/lib/season/champions';
import { errorResponse } from '@/lib/season/route-errors';

export const dynamic = 'force-dynamic';

/** GET → Champion Card copies the signed-in wallet and/or DRep may claim. */
export async function GET() {
  const claimants = [currentStakeAddress(), currentDrep()].filter((c): c is string => c !== null);
  try {
    return NextResponse.json({ claims: await getClaims(claimants), signed_in: claimants.length > 0 });
  } catch (error) {
    return errorResponse(error, 'claims_failed');
  }
}
