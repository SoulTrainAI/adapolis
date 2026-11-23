'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Award } from 'lucide-react';
import type { Claim } from '@/lib/season/champions';
import { seasonLabel } from '@/lib/season/points';
import { CollectiblesNotice } from './CollectiblesNotice';

const WHY: Record<Claim['claimant_type'], string> = {
  drep: 'your own Champion Card (DRep copies)',
  team: 'you drafted them',
  delegator: 'you delegated to them',
};

const EDITION: Record<string, string> = { gold: 'Gold Champion', silver: 'Silver', bronze: 'Bronze', holo: 'Holo' };

/** Champion Card copies this wallet (or signed-in DRep) has earned. Minting isn't open yet. */
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
        <Award className="h-5 w-5 text-brand-gold-light" /> Champion Cards you&apos;ve earned
      </h2>
      <CollectiblesNotice compact />
      {claims && claims.length > 0 ? (
        <ul className="space-y-2">
          {claims.map((c) => (
            <li key={`${c.season_number}-${c.drep_id}-${c.claimant_type}`} className="flex flex-wrap items-center gap-3 border border-brand-gold/30 bg-amber-500/5 px-4 py-3">
              <span className="font-semibold text-white">
                {seasonLabel(c.season_number)} · {c.name ?? `${c.drep_id.slice(0, 14)}…`}
              </span>
              {c.edition && <span className="text-sm text-amber-200">{EDITION[c.edition]}</span>}
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
          When a season ends, its top 10 DReps become Champion Cards. If you drafted one, delegate to one, or are one, your
          copies show up here. Claiming opens after the first cards are tested and reviewed; you&apos;ll pay only the
          network fee.
        </p>
      )}
    </section>
  );
}
