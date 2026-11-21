/**
 * GET /api/match — public, read-only data for the Find My DRep quiz: eligible
 * DReps' measured positions and the current real-vote questions. Matching
 * itself happens in the browser, so quiz answers are never sent here.
 */

import { NextResponse } from 'next/server';
import { getMatchData } from '@/lib/match/profiles';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  try {
    const data = await getMatchData();
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600' },
    });
  } catch (error) {
    console.error(
      JSON.stringify({ event: 'match_data_error', error: error instanceof Error ? error.message : String(error) })
    );
    return NextResponse.json(
      { error: 'DRep matching data is temporarily unavailable. Please try again in a few minutes.' },
      { status: 503 }
    );
  }
}
