import type { Metadata } from 'next';
import { LeaguesView } from '@/components/season/LeaguesView';
import { SeasonTabs } from '@/components/season/SeasonTabs';

export const metadata: Metadata = {
  title: 'Leagues — ADApolis',
  description: 'Public and private leagues for the ADApolis DRep game: play your team against friends and communities. Free, bragging rights only.',
};

export default function LeaguesPage() {
  return (
    <div className="min-h-screen bg-brand-navy px-4 py-12 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <SeasonTabs active="leagues" />
        <LeaguesView />
      </div>
    </div>
  );
}
