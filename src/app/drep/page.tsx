import type { Metadata } from 'next';
import { DrepStudio } from '@/components/drep/DrepStudio';

export const metadata: Metadata = {
  title: 'DReps: Claim your profile — ADApolis',
  description: 'DReps: sign with your DRep key to set your own card art, bio and links on ADApolis.',
};

export default function DrepPage() {
  return (
    <div className="min-h-screen bg-brand-navy px-4 py-12 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="space-y-2">
          <p className="text-sm uppercase tracking-wider text-violet-300">For DReps</p>
          <h1 className="text-4xl font-bold">DReps: Claim your profile</h1>
          <p className="max-w-2xl text-slate-300">
            Every DRep has an ADApolis trading card. Sign with your DRep key to choose your card&apos;s art and update your bio and links. Your scores and
            stats come from the chain, so nobody can edit those, including you.
          </p>
        </header>
        <DrepStudio />
      </div>
    </div>
  );
}
