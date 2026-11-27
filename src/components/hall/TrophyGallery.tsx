import { Trophy } from 'lucide-react';
import { getSampleTrophies, getSeasonTrophies, type SeasonTrophies } from '@/lib/season/trophy-data';
import { MEDALS, trophyTitle } from '@/lib/season/trophy';
import { TrophyCard } from './TrophyCard';

/**
 * The six DRep All-Star Season Trophies as they'll be minted. For a season
 * still being played they're previews built from the standings so far.
 * Server component.
 */
export async function TrophyGallery({ season = null }: { season?: number | null }) {
  let data: SeasonTrophies | null = null;
  try {
    data = await getSeasonTrophies(season);
    // Before the first season is played, show what the trophies look like from the Warm-up race.
    if (!data && season === null) data = await getSampleTrophies();
  } catch (error) {
    console.error(JSON.stringify({ event: 'trophy_gallery_failed', season, error: error instanceof Error ? error.message : String(error) }));
  }
  if (!data || data.winners.length === 0) return null;
  const rows: Array<['drep' | 'team', string]> = [
    ['drep', 'DRep Trophies'],
    ['team', 'Team Trophies'],
  ];
  return (
    <section className="space-y-4" aria-labelledby="trophy-gallery">
      <div className="space-y-1">
        <h2 id="trophy-gallery" className="flex items-center gap-2 text-xl font-bold text-white">
          <Trophy className="h-5 w-5 text-brand-gold" aria-hidden /> {trophyTitle(data.label)}
          {data.sample && <span className="rounded-full border border-sky-400/50 px-2 py-0.5 text-xs font-semibold text-sky-300">Sample</span>}
          {!data.final && !data.sample && <span className="rounded-full border border-amber-400/50 px-2 py-0.5 text-xs font-semibold text-amber-300">Preview</span>}
        </h2>
        <p className="max-w-3xl text-sm text-slate-400">
          {data.sample
            ? 'The first race hasn’t started yet, so here’s what the trophies look like, drawn from the Warm-up race so far. Samples are never minted. Team trophies appear once teams are playing.'
            : data.season_number === 0
            ? 'Preseason trophies are a test run of the art: drawn like the real ones, never minted.'
            : data.final
              ? 'Six one-of-one trophies: the season’s race drawn as a flight through space, with the winner’s path lit in their medal’s colour.'
              : 'If the season ended now, these would be the six one-of-one trophies. They change as the race does and are only minted once the season is final.'}{' '}
          Tap a trophy to flip it and see the season’s record.
        </p>
      </div>
      {rows.map(([kind, title]) => {
        const winners = data!.winners.filter((w) => w.kind === kind);
        if (!winners.length) return null;
        return (
          <div key={kind} className="space-y-2">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">{title}</h3>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
              {winners.map((w) => {
                const src = `/api/trophies/${data!.key}/${w.kind}/${w.place}/image`;
                return (
                  <li key={w.place} className="min-w-0">
                    <TrophyCard src={src} label={`${trophyTitle(data!.label)}, ${MEDALS[w.medal].label} ${kind === 'drep' ? 'DRep' : 'Team'}: ${w.name}`} />
                    <p className="mt-2 truncate text-xs text-slate-400">
                      <span className="font-semibold text-slate-200">{MEDALS[w.medal].label}</span> · {w.name}
                    </p>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </section>
  );
}
