import { NextResponse } from 'next/server';
import { currentStakeAddress } from '@/lib/auth/current';
import { describeEligibility, delegationOf } from '@/lib/season/eligibility';
import { draftSeason } from '@/lib/season/fantasy';
import { fetchCurrentEpoch } from '@/lib/koios';
import { errorResponse } from '@/lib/season/route-errors';

export const dynamic = 'force-dynamic';

/** GET → whether the signed-in wallet would compete for prizes in the season being drafted. */
export async function GET() {
  const me = currentStakeAddress();
  if (!me) return NextResponse.json({ status: null });
  try {
    const [season, epoch, delegation] = await Promise.all([draftSeason(), fetchCurrentEpoch(), delegationOf(me)]);
    if (!season) return NextResponse.json({ status: null });
    return NextResponse.json({ status: describeEligibility(delegation, season.start_epoch, epoch) });
  } catch (error) {
    return errorResponse(error, 'eligibility_failed');
  }
}
