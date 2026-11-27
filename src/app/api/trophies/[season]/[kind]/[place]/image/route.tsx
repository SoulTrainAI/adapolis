import { getSeasonTrophies } from '@/lib/season/trophy-data';
import { renderTrophyImage } from '@/lib/season/trophy-render';
import { findTrophy } from '../../../../params';

export const dynamic = 'force-dynamic';

/**
 * GET /api/trophies/<season|current>/<drep|team>/<1|2|3>/image → the trophy as
 * a 1000×1250 PNG. ?download=1 saves it as a file. A season still in play
 * gives a preview from the standings so far.
 */
export async function GET(request: Request, { params }: { params: { season: string; kind: string; place: string } }) {
  const found = await findTrophy(params, getSeasonTrophies);
  if ('error' in found) return new Response(found.error, { status: found.status });
  const { season, winner } = found;
  try {
    const image = await renderTrophyImage(season, winner);
    const headers = new Headers(image.headers);
    headers.set('Cache-Control', season.final ? 'public, max-age=86400' : 'public, max-age=600');
    if (new URL(request.url).searchParams.get('download') === '1') {
      headers.set('Content-Disposition', `attachment; filename="adapolis-${season.label.toLowerCase().replace(/\s+/g, '-')}-${winner.kind}-${winner.medal}-trophy.png"`);
    }
    return new Response(image.body, { status: 200, headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(JSON.stringify({ event: 'trophy_image_failed', season: params.season, kind: params.kind, place: params.place, error: message }));
    return new Response(`Couldn't draw this trophy: ${message}. Try again in a minute; if it keeps failing, check the server logs for trophy_image_failed.`, { status: 500 });
  }
}
