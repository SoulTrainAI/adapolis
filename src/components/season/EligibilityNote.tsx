'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Trophy } from 'lucide-react';
import type { EligibilityStatus } from '@/lib/season/eligibility';

/** Tells a signed-in player whether their team competes for prizes, and how to qualify. */
export function EligibilityNote() {
  const [status, setStatus] = useState<EligibilityStatus | null>(null);
  useEffect(() => {
    const load = () =>
      fetch('/api/fantasy/eligibility')
        .then((r) => r.json() as Promise<{ status?: EligibilityStatus | null }>)
        .then((b) => setStatus(b.status ?? null))
        .catch(() => setStatus(null));
    load();
    window.addEventListener('adapolis:auth', load);
    return () => window.removeEventListener('adapolis:auth', load);
  }, []);
  if (!status) return null;
  return (
    <div
      className={`flex flex-wrap items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
        status.eligible_now ? 'border-emerald-700/50 bg-emerald-950/30 text-emerald-100' : 'border-amber-700/50 bg-amber-950/30 text-amber-100'
      }`}
    >
      <Trophy className={`mt-0.5 h-4 w-4 flex-shrink-0 ${status.eligible_now ? 'text-emerald-300' : 'text-amber-300'}`} />
      <p className="min-w-0 flex-1">{status.message}</p>
      {!status.delegation.drep && (
        <span className="flex flex-wrap gap-3">
          <Link href="/match" className="font-semibold text-white underline-offset-2 hover:underline">
            Find a DRep →
          </Link>
          <a href="https://gov.tools/" target="_blank" rel="noopener noreferrer" className="font-semibold text-white underline-offset-2 hover:underline">
            How to delegate (GovTool) →
          </a>
        </span>
      )}
    </div>
  );
}
