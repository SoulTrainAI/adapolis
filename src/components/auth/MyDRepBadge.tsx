'use client';

import { useEffect, useState } from 'react';
import { BadgeCheck } from 'lucide-react';

export interface Delegation {
  signedIn: boolean;
  drepId: string | null;
}

// One lookup shared by every badge on the page; refetched when the user signs in or out.
let pending: Promise<Delegation> | null = null;
function loadDelegation(): Promise<Delegation> {
  pending ??= fetch('/api/me/delegation')
    .then((r) => r.json() as Promise<{ stakeAddress: string | null; drepId: string | null }>)
    .then((d) => ({ signedIn: d.stakeAddress !== null, drepId: d.drepId }))
    .catch(() => ({ signedIn: false, drepId: null }));
  return pending;
}

/** The signed-in wallet's delegation; null until known. */
export function useDelegation(): Delegation | null {
  const [state, setState] = useState<Delegation | null>(null);
  useEffect(() => {
    let live = true;
    loadDelegation().then((d) => live && setState(d));
    const onAuth = () => {
      pending = null;
      loadDelegation().then((d) => live && setState(d));
    };
    window.addEventListener('adapolis:auth', onAuth);
    return () => {
      live = false;
      window.removeEventListener('adapolis:auth', onAuth);
    };
  }, []);
  return state;
}

export function useMyDRep(): string | null {
  return useDelegation()?.drepId ?? null;
}

/** "Your DRep" pill, shown only on the DRep the signed-in wallet delegates to. */
export function MyDRepBadge({ drepId, className = '' }: { drepId: string; className?: string }) {
  const mine = useMyDRep();
  if (!mine || mine !== drepId) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-sky-700/70 bg-sky-900/50 px-2 py-0.5 text-xs font-medium text-sky-200 ${className}`}
      title="Your connected wallet delegates its voting power to this DRep"
    >
      <BadgeCheck className="h-3.5 w-3.5" /> Your DRep
    </span>
  );
}
