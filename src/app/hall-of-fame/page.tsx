import type { Metadata } from 'next';
import Link from 'next/link';
import { Award } from 'lucide-react';
import { getHallOfFame, type HallOfFame } from '@/lib/season/hall-of-fame';
import { seasonLabel } from '@/lib/season/points';
import { SeasonTabs } from '@/components/season/SeasonTabs';
import { HallOfFameView } from '@/components/hall/HallOfFameView';
import { TrophyGallery } from '@/components/hall/TrophyGallery';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Hall of Fame — ADApolis',
  description: "Last season's top 10 DReps, the DRep All-Stars, and the DRep and Team trophy winners.",
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
      <div className="mx-auto max-w-[1440px] space-y-8">
        <SeasonTabs active="hall" />
        <header className="space-y-2">
          <h1 className="flex items-center gap-3 text-4xl font-bold">
            <Award className="h-9 w-9 text-brand-gold" aria-hidden /> Hall of Fame
          </h1>
          <p className="max-w-3xl text-slate-300">
            {hall
              ? `${name}'s final standings, frozen at the last whistle.${hall.season_number === 0 ? ' Preseason cards are tests and are never minted.' : ''} Updated when each season ends.`
              : 'The first Hall of Fame appears when the Preseason ends on 4 January. Draft a team now to be part of it.'}
          </p>
        </header>
        {hall ? (
          <>
            <HallOfFameView hall={hall} seasonName={name} />
            <TrophyGallery season={hall.season_number} />
          </>
        ) : (
          <Link href="/draft" className="inline-flex min-h-[44px] items-center rounded-lg bg-violet-600 px-5 py-2.5 font-semibold text-white hover:bg-violet-500">
            Draft your team
          </Link>
        )}
      </div>
    </div>
  );
}
