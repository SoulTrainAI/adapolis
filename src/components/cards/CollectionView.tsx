'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Gem, Loader2, ShoppingBag } from 'lucide-react';
import type { DraftData } from '@/lib/season/fantasy';
import { useMyDRep } from '@/components/auth/MyDRepBadge';
import { TradingCard } from './TradingCard';
import { placeholderCard, useCards } from './useCards';
import { DRepCheckup } from './DRepCheckup';
import { ClaimsSection } from './ClaimsSection';
import { ConnectPrompt } from '@/components/auth/ConnectPrompt';

type DraftResponse = (({ enabled: true } & DraftData) | { enabled: false }) & { signed_in?: boolean };

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="flex items-center gap-2 font-display text-xl font-bold text-white">
        {icon} {title}
      </h2>
      {children}
    </section>
  );
}

export function CollectionView() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [draft, setDraft] = useState<DraftResponse | null>(null);
  const { cards } = useCards();
  const myDRep = useMyDRep();

  const load = useCallback(() => {
    fetch('/api/auth/me')
      .then((r) => r.json() as Promise<{ stakeAddress: string | null }>)
      .then((b) => setSignedIn(b.stakeAddress !== null))
      .catch(() => setSignedIn(false));
    fetch('/api/fantasy/draft')
      .then((r) => (r.ok ? (r.json() as Promise<DraftResponse>) : null))
      .then(setDraft)
      .catch(() => setDraft(null));
  }, []);

  useEffect(() => {
    load();
    window.addEventListener('adapolis:auth', load);
    return () => window.removeEventListener('adapolis:auth', load);
  }, [load]);

  const roster = draft?.enabled ? draft.roster : null;
  const mine = myDRep ? cards.get(myDRep) : undefined;
  const pool = new Map((draft?.enabled ? draft.pool : []).map((d) => [d.drep_id, d]));

  return (
    <div className="space-y-12">
      <header className="space-y-3">
        <p className="text-sm uppercase tracking-wider text-violet-300">My Collection</p>
        <h1 className="font-display text-4xl font-bold">Your cards</h1>
        <p className="max-w-3xl text-slate-300">
          Every DRep has a card showing real-time stats that update daily. At the end of each season, the top 10 DReps&apos; cards become
          mintable as official DRep All-Star NFTs, digital collectibles that commemorate the historic victory. The top 3 winning DReps
          and Teams can also mint the exclusive DRep All-Star Season Trophy NFT to showcase their success.
        </p>
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="button"
            disabled
            className="flex cursor-not-allowed items-center gap-2 rounded-lg border border-brand-gold/40 bg-brand-gold/10 px-4 py-2 font-semibold text-brand-gold-light opacity-80"
            title="The official collection isn't minted yet"
          >
            <ShoppingBag className="h-4 w-4" /> Shop the official collection on WayUp
            <span className="rounded-full bg-brand-gold/20 px-2 py-0.5 text-[10px] uppercase tracking-wider">Coming soon</span>
          </button>
        </div>
      </header>

      <Section title="NFTs in your wallet" icon={<Gem className="h-5 w-5 text-brand-gold-light" />}>
        {signedIn === null ? (
          <p className="flex items-center gap-2 text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Checking your wallet…
          </p>
        ) : !signedIn ? (
          <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-5">
            <ConnectPrompt reason="Connect a wallet to see your team, your DRep and the ADApolis cards you hold." />
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-brand-gold/30 bg-slate-900/40 p-6 text-center">
            <p className="font-semibold text-white">No ADApolis cards yet</p>
            <p className="mt-1 text-sm text-slate-400">
              None have been minted. When the Genesis set drops, the cards in your wallet will show up here automatically.
            </p>
          </div>
        )}
      </Section>

      <ClaimsSection />

      <Section title="Your game team" icon={<span className="text-brand-gold-light">★</span>}>
        {!draft ? (
          <p className="flex items-center gap-2 text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </p>
        ) : !roster ? (
          <p className="text-slate-300">
            No team this season yet.{' '}
            <Link href="/draft" className="text-violet-300 hover:text-violet-200">
              Draft 5 DReps
            </Link>{' '}
            to start your collection.
          </p>
        ) : (
          <>
            <p className="text-slate-300">
              {roster.team_name && <strong className="text-white">{roster.team_name} · </strong>}
              <Link href="/leaderboard" className="text-violet-300 hover:text-violet-200">
                See where you rank →
              </Link>
            </p>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5 xl:gap-5">
              {roster.picks.map((p) => {
                const d = pool.get(p.drep_id);
                const card =
                  cards.get(p.drep_id) ??
                  placeholderCard({ drep_id: p.drep_id, name: d?.name ?? null, image: d?.image ?? null, ada: d?.ada, delegators: d?.delegators });
                return <TradingCard key={p.drep_id} variant="season" card={card} />;
              })}
            </div>
          </>
        )}
      </Section>

      {signedIn && (
        <Section title="Your DRep" icon={<span className="text-sky-300">●</span>}>
          <DRepCheckup />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5 xl:gap-5">
            {mine && <TradingCard variant="scoreboard" card={mine} />}
          </div>
        </Section>
      )}
    </div>
  );
}
