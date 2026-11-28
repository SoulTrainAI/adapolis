/**
 * Hall of Fame: every DRep's card in one place (formerly the Scoreboard), opening
 * on last season's finishing order, with the trophy winners and trophy NFTs.
 */
import type { Metadata } from 'next';
import { Award } from 'lucide-react';
import { getHallOfFame, type HallOfFame } from '@/lib/season/hall-of-fame';
import { seasonLabel } from '@/lib/season/points';
import { SeasonTabs } from '@/components/season/SeasonTabs';
import { HallOfFameView } from '@/components/hall/HallOfFameView';
import { TrophyGallery } from '@/components/hall/TrophyGallery';
import { ScoreboardClient } from '@/components/scoreboard/ScoreboardClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Hall of Fame — ADApolis',
  description: "Every Cardano DRep's card, opening on last season's top finishers, with the DRep and Team trophy winners. Re-sort by GovScore or any stat.",
};

export default async function HallOfFamePage() {
  let hall: HallOfFame | null = null;
  try {
    hall = await getHallOfFame();
  } catch {
    hall = null;
  }
  const name = hall ? seasonLabel(hall.season_number) : '';
  return (
    <div className="min-h-screen bg-brand-navy px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-8">
        <SeasonTabs active="hall" />
        <header className="space-y-2">
          <h1 className="flex items-center gap-3 text-4xl font-bold">
            <Award className="h-9 w-9 text-brand-gold" aria-hidden /> Hall of Fame
          </h1>
          <p className="max-w-3xl text-slate-300">
            Every DRep&apos;s card, ranked by last season&apos;s points so the top finishers come first. Sort by GovScore,
            this season, or any other stat to explore the rest.
          </p>
        </header>
        {hall && <HallOfFameView hall={hall} seasonName={name} trophiesOnly />}
        <ScoreboardClient initialEpoch={0} initialSort="last_points" />
        {hall && <TrophyGallery season={hall.season_number} />}
      </div>
    </div>
  );
}
