import type { Metadata } from 'next';
import { LeaderboardView } from '@/components/season/LeaderboardView';
import { SeasonTabs } from '@/components/season/SeasonTabs';

export const metadata: Metadata = {
  title: 'Fantasy Leaderboard — ADApolis',
  description: 'ADApolis fantasy DRep league: every team ranked by the season points its DReps earn for showing up, explaining and voting on time.',
};

export default function LeaderboardPage() {
  return (
    <div className="min-h-screen bg-brand-navy px-4 py-12 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <SeasonTabs active="leaderboard" />
        <LeaderboardView />
      </div>
    </div>
  );
}
