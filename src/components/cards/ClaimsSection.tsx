'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Award } from 'lucide-react';
import type { Claim } from '@/lib/season/champions';
import { seasonLabel } from '@/lib/season/points';

const WHY: Record<Claim['claimant_type'], string> = {
  drep: 'it is your own card (DRep copies)',
  team: 'you drafted them',
  delegator: 'you delegated to them',
  house: 'it is the ADApolis full-set copy',
};

const EDITION: Record<string, string> = { gold: 'Gold', silver: 'Silver', bronze: 'Bronze', holo: 'Holographic' };

/** DRep All-Star copies this wallet (or signed-in DRep) has earned. Minting isn't open yet. */
export function ClaimsSection() {
  const [claims, setClaims] = useState<Claim[] | null>(null);

  useEffect(() => {
    const load = () =>
      fetch('/api/me/claims')
        .then((r) => r.json() as Promise<{ claims?: Claim[] }>)
        .then((b) => setClaims(b.claims ?? []))
        .catch(() => setClaims([]));
    load();
    window.addEventListener('adapolis:auth', load);
    return () => window.removeEventListener('adapolis:auth', load);
  }, []);

  return (
    <section className="space-y-4">
      <h2 className="flex items-center gap-2 font-display text-xl font-bold text-white">
        <Award className="h-5 w-5 text-brand-gold-light" /> Season cards you&apos;ve earned
      </h2>
      {claims && claims.length > 0 ? (
        <ul className="space-y-2">
          {claims.map((c) => (
            <li key={`${c.season_number}-${c.drep_id}-${c.claimant_type}`} className="flex flex-wrap items-center gap-3 border border-brand-gold/30 bg-amber-500/5 px-4 py-3">
              <span className="font-semibold text-white">
                {seasonLabel(c.season_number)} · {c.name ?? `${c.drep_id.slice(0, 14)}…`}
              </span>
              <span className="text-sm text-amber-200">{c.edition ? `DRep All-Star · ${EDITION[c.edition]}` : 'Season Card'}</span>
              <span className="text-sm text-slate-400">
                {c.copies} cop{c.copies === 1 ? 'y' : 'ies'}, because {WHY[c.claimant_type]}
              </span>
              <span className="ml-auto text-xs text-slate-400">
                {c.season_number === 0
                  ? 'Preseason test card: shows how claiming will work, never minted'
                  : c.claimed_at
                  ? 'Claimed'
                  : c.claim_closes_at
                    ? `Claim by ${format(new Date(c.claim_closes_at), 'PP')} once claiming opens`
                    : 'Claiming opens soon'}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-slate-700 bg-slate-900/40 p-5 text-sm text-slate-400">
          When a season ends, its top 10 DReps become DRep All-Stars. If you drafted one or are one, your copies show up
          here and on the Mint NFTs page. You pay only the network fee.
        </p>
      )}
    </section>
  );
}
