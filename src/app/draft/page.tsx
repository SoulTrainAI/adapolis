import type { Metadata } from 'next';
import { DraftBoard } from '@/components/season/DraftBoard';

export const metadata: Metadata = {
  title: 'Draft — ADApolis Fantasy DRep League',
  description:
    'Draft 5 DReps for the season. Your team scores points for voting, explaining votes and voting on time, never for how they vote.',
};

export default function DraftPage() {
  return (
    <div className="min-h-screen bg-brand-navy text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <DraftBoard />
      </div>
    </div>
  );
}
