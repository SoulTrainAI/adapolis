import type { Metadata } from 'next';
import { MatchQuiz } from '@/components/match/MatchQuiz';

export const metadata: Metadata = {
  title: 'Find My DRep — ADApolis',
  description:
    'Answer a few questions about the Cardano you want and see which DReps have actually voted that way on-chain.',
};

export default function MatchPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white py-12 px-4 sm:px-6 lg:px-8">
      <MatchQuiz />
    </div>
  );
}
