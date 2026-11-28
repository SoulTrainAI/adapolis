import type { Metadata } from 'next';
import Link from 'next/link';
import { Images } from 'lucide-react';

export const metadata: Metadata = {
  title: 'The Official Collection — ADApolis',
  description: 'Every DRep All-Star card and DRep All-Star Season Trophy ever minted.',
};

/** Set once the Season 1 policy exists; until then the page explains when the collection starts. */
const WAYUP_COLLECTION_URL: string | null = process.env.NEXT_PUBLIC_WAYUP_COLLECTION_URL || null;

export default function NftsPage() {
  return (
    <div className="min-h-screen bg-brand-navy px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="flex items-center gap-3 text-4xl font-bold">
          <Images className="h-9 w-9 text-brand-gold" aria-hidden /> The Official Collection
        </h1>
        <p className="text-slate-300">
          Every DRep has a card showing real-time stats that update daily. At the end of each season, the top 10 DReps’ cards become
          mintable as official DRep All-Star NFTs, digital collectibles that commemorate the historic victory. The top 3 winning DReps and
          Teams can also mint the exclusive DRep All-Star Season Trophy NFT to showcase their success.
        </p>
        {WAYUP_COLLECTION_URL ? (
          <a
            href={WAYUP_COLLECTION_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] items-center rounded-lg bg-violet-600 px-5 py-2.5 font-semibold text-white hover:bg-violet-500"
          >
            Browse the collection on WayUp ↗
          </a>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-6">
            <p className="font-semibold text-white">The collection starts with Season 1 (the Genesis set).</p>
            <p className="mt-1 text-sm text-slate-400">
              Season 1 runs from 4 January 2027. Its DRep All-Stars and trophies are minted after it ends, and the full collection will be
              listed here. Until then, see last season’s winners in the Hall of Fame.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/hall-of-fame" className="inline-flex min-h-[44px] items-center rounded-lg border border-slate-600 px-4 py-2 font-semibold hover:bg-slate-800">
                Hall of Fame
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
