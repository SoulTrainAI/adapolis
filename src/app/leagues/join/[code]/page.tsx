import type { Metadata } from 'next';
import { JoinLeague } from '@/components/season/JoinLeague';

export const metadata: Metadata = {
  title: 'Join a league — ADApolis',
  description: "You've been invited to a league in the ADApolis DRep game. Free to play.",
};

export default function JoinLeaguePage({ params }: { params: { code: string } }) {
  return (
    <div className="min-h-screen bg-brand-navy px-4 py-12 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-xl">
        <JoinLeague code={params.code} />
      </div>
    </div>
  );
}
