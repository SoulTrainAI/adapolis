import { NextResponse } from 'next/server';
import { currentStakeAddress } from '@/lib/auth/current';
import { getLeague } from '@/lib/season/leagues';
import { publicBoard } from '@/lib/season/leaderboard';
import { errorResponse } from '@/lib/season/route-errors';

export const dynamic = 'force-dynamic';

/** GET ?code=…&season=N → the league and its leaderboard (private leagues: members or invite code only). */
export async function GET(request: Request, { params }: { params: { leagueId: string } }) {
  if (!/^[0-9a-f-]{36}$/.test(params.leagueId)) return NextResponse.json({ error: 'Unknown league.' }, { status: 400 });
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const rawSeason = url.searchParams.get('season');
  try {
    const result = await getLeague(params.leagueId, currentStakeAddress(), {
      code: code && /^[A-Za-z0-9]{10}$/.test(code) ? code : null,
      season: rawSeason && /^\d{1,3}$/.test(rawSeason) ? Number(rawSeason) : null,
    });
    if (!result) return NextResponse.json({ error: 'League not found, or it is private.' }, { status: 404 });
    return NextResponse.json({ ...result, board: result.board ? publicBoard(result.board) : null });
  } catch (error) {
    return errorResponse(error, 'league_load_failed');
  }
}
