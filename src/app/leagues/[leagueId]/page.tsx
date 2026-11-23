import type { Metadata } from 'next';
import { LeagueBoard } from '@/components/season/LeagueBoard';
import { SeasonTabs } from '@/components/season/SeasonTabs';

export const metadata: Metadata = { title: 'League — ADApolis', description: 'A league leaderboard in the ADApolis DRep game.' };

export default function LeaguePage({ params, searchParams }: { params: { leagueId: string }; searchParams: { code?: string } }) {
  return (
    <div className="min-h-screen bg-brand-navy px-4 py-12 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <SeasonTabs active="leagues" />
        <LeagueBoard leagueId={params.leagueId} code={searchParams.code ?? null} />
      </div>
    </div>
  );
}
