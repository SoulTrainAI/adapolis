import type { Metadata } from 'next';
import { CollectionView } from '@/components/cards/CollectionView';

export const metadata: Metadata = {
  title: 'My Collection — ADApolis',
  description: 'Your ADApolis DRep trading cards, your game team and your DRep, in one place.',
};

export default function CollectionPage() {
  return (
    <div className="min-h-screen bg-brand-navy px-4 py-12 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <CollectionView />
      </div>
    </div>
  );
}
