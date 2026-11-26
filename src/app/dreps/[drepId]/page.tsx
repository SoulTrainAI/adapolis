import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DrepProfile } from '@/components/cards/DrepProfile';
import { getOverride } from '@/lib/drep-profile/overrides';
import { DrepOverview } from '@/components/overview/DrepOverview';

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

export const dynamic = 'force-dynamic';

export default async function DrepProfilePage({ params }: { params: { drepId: string } }) {
  if (!DREP_ID.test(params.drepId)) notFound();
  const override = await getOverride(params.drepId).catch(() => null);
  return (
    <div className="min-h-screen bg-brand-navy px-4 py-12 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {override?.moderated_at && (
          <p role="note" className="mb-4 rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs text-slate-400">
            {override.edited_by_admin
              ? 'This profile was filled in by ADApolis because the DRep hasn’t claimed it yet.'
              : `Moderated by ADApolis${override.moderation_note ? `: ${override.moderation_note}` : ''}. Every moderation action is logged publicly.`}
          </p>
        )}
        <DrepProfile drepId={params.drepId} />
        <DrepOverview drepId={params.drepId} />
      </div>
    </div>
  );
}
