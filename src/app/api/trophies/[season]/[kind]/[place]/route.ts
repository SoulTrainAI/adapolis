import { NextResponse } from 'next/server';
import { getSeasonTrophies } from '@/lib/season/trophy-data';
import { trophyMetadata } from '@/lib/season/trophy';
import { findTrophy } from '../../../params';

export const dynamic = 'force-dynamic';

/**
 * GET /api/trophies/<season|current>/<drep|team>/<1|2|3> → who holds the
 * trophy, its traits (the minted metadata) and the image URL.
 */
export async function GET(_request: Request, { params }: { params: { season: string; kind: string; place: string } }) {
  const found = await findTrophy(params, getSeasonTrophies);
  if ('error' in found) return NextResponse.json({ error: found.error }, { status: found.status });
  const { season, winner } = found;
  const metadata = trophyMetadata({
    season_number: season.season_number,
    season_label: season.label,
    kind: winner.kind,
    medal: winner.medal,
    winner_name: winner.name,
    points: winner.points,
    drep_id: winner.drep_id,
    picks: winner.picks,
    start_epoch: season.start_epoch,
    end_epoch: season.end_epoch,
  });
  return NextResponse.json(
    {
      season: season.season_number,
      label: season.label,
      final: season.final,
      kind: winner.kind,
      place: winner.place,
      medal: winner.medal,
      name: winner.name,
      points: winner.points,
      drep_id: winner.drep_id ?? null,
      picks: winner.picks ?? null,
      metadata,
      image: `/api/trophies/${season.season_number}/${winner.kind}/${winner.place}/image`,
    },
    { headers: { 'Cache-Control': 'public, max-age=600' } }
  );
}
