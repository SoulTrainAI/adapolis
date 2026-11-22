import { NextResponse } from 'next/server';
import { currentStakeAddress } from '@/lib/auth/current';
import { authConfigured } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({ enabled: authConfigured(), stakeAddress: currentStakeAddress() });
}
