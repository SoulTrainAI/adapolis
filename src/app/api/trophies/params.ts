import type { SeasonTrophies, TrophyWinner } from '@/lib/season/trophy-data';

type Found = { season: SeasonTrophies; winner: TrophyWinner } | { error: string; status: number };

/** Reads /api/trophies/<season|current>/<drep|team>/<1|2|3> and finds that trophy. */
export async function findTrophy(
  params: { season: string; kind: string; place: string },
  load: (season: number | null) => Promise<SeasonTrophies | null>
): Promise<Found> {
  const season = params.season === 'current' ? null : /^\d{1,3}$/.test(params.season) ? Number(params.season) : NaN;
  if (Number.isNaN(season)) return { error: 'Season must be a number or "current", e.g. /api/trophies/1/drep/1.', status: 400 };
  if (params.kind !== 'drep' && params.kind !== 'team') return { error: 'Trophy kind must be "drep" or "team".', status: 400 };
  if (!/^[123]$/.test(params.place)) return { error: 'Place must be 1, 2 or 3 (Gold, Silver, Bronze).', status: 400 };
  const data = await load(season);
  if (!data) return { error: 'No trophies for that season yet: it hasn’t started, or the game is off.', status: 404 };
  const winner = data.winners.find((w) => w.kind === params.kind && w.place === Number(params.place));
  if (!winner) return { error: `No ${params.kind === 'drep' ? 'DRep' : 'team'} in place ${params.place} yet.`, status: 404 };
  return { season: data, winner };
}
