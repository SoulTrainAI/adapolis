import type { Metadata } from 'next';
import { MatchQuiz } from '@/components/match/MatchQuiz';
import { DRepCheckup } from '@/components/cards/DRepCheckup';

export const metadata: Metadata = {
  title: 'Find My DRep — ADApolis',
  description:
    'Answer a few questions about the Cardano you want and see which DReps have actually voted that way on-chain.',
};

export default function MatchPage() {
  return (
    <div className="min-h-screen bg-brand-navy text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto mb-6 max-w-2xl">
        <DRepCheckup findHref="#quiz" findLabel="Take the quiz below to find one who shows up" />
      </div>
      <div id="quiz" className="scroll-mt-24">
        <MatchQuiz />
      </div>
    </div>
  );
}
