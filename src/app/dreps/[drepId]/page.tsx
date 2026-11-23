import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DrepProfile } from '@/components/cards/DrepProfile';

const DREP_ID = /^drep1[02-9ac-hj-np-z]{20,100}$/;

export function generateMetadata({ params }: { params: { drepId: string } }): Metadata {
  const description = `Trading card, GovScore, season history and voting record for Cardano DRep ${params.drepId.slice(0, 20)}…`;
  // Shared links preview as the DRep's card.
  const images = [{ url: `/api/cards/${params.drepId}/image`, width: 500, height: 700 }];
  return {
    title: 'DRep profile — ADApolis',
    description,
    openGraph: { title: 'DRep card — ADApolis', description, images },
    twitter: { card: 'summary_large_image', images: images.map((i) => i.url) },
  };
}

export default function DrepProfilePage({ params }: { params: { drepId: string } }) {
  if (!DREP_ID.test(params.drepId)) notFound();
  return (
    <div className="min-h-screen bg-brand-navy px-4 py-12 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <DrepProfile drepId={params.drepId} />
      </div>
    </div>
  );
}
