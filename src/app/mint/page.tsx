import type { Metadata } from 'next';
import { Gem } from 'lucide-react';
import { MintView } from '@/components/mint/MintView';

export const metadata: Metadata = {
  title: 'Mint NFTs — ADApolis',
  description: 'Claim the DRep All-Star cards and trophies you won in the Cardanathon.',
};

const RULES: Array<[string, string]> = [
  ['Who wins', 'At each season’s end the top 10 DReps become DRep All-Stars. Each gets 5 copies of their own card, and each of the top 25 prize-eligible teams that drafted them gets 1. The top 3 DReps and top 3 teams win a one-of-one DRep All-Star Season Trophy.'],
  ['When', 'The mint window opens 48 hours after the season ends (so the ADApolis team can test-mint and check every card) and closes 3 epochs (about 15 days) after the season ends. Unclaimed copies are never minted, so supply is fixed forever.'],
  ['Cost', 'You pay only the Cardano network fee and the minimum ADA that travels with the NFT (about 1.5–2 ADA, most of which stays with it). ADApolis charges nothing.'],
  ['Team Test Mint', 'The first pressing of each card is minted by the ADApolis team to ensure quality. Test Pressing cards may be used or distributed for promotion or other business needs at the team’s discretion.'],
  ['Royalty', 'Resales carry a 5% creator royalty (CIP-27) to the ADApolis project wallet. Marketplaces honour it voluntarily.'],
];

export default function MintPage() {
  return (
    <div className="min-h-screen bg-brand-navy px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1200px] space-y-8">
        <header className="space-y-2">
          <h1 className="flex items-center gap-3 text-4xl font-bold">
            <Gem className="h-9 w-9 text-brand-gold" aria-hidden /> Mint NFTs
          </h1>
          <p className="max-w-3xl text-slate-300">Won a DRep All-Star or a trophy? Claim it here while the mint window is open.</p>
        </header>
        <MintView />
        <section className="space-y-3">
          <h2 className="text-xl font-bold">How minting works</h2>
          <dl className="grid gap-3 md:grid-cols-2">
            {RULES.map(([t, d]) => (
              <div key={t} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <dt className="font-semibold text-white">{t}</dt>
                <dd className="mt-1 text-sm text-slate-300">{d}</dd>
              </div>
            ))}
          </dl>
          <p className="text-xs text-slate-500">
            DRep All-Star NFTs are digital collectibles only: no yield, no revenue share, no votes, and no promise of value.
          </p>
        </section>
      </div>
    </div>
  );
}
