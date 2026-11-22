'use client';

import { useEffect, useState } from 'react';
import { BadgeCheck } from 'lucide-react';

// One lookup shared by every badge on the page; refetched when the user signs in or out.
let pending: Promise<string | null> | null = null;
function loadMyDRep(): Promise<string | null> {
  pending ??= fetch('/api/me/delegation')
    .then((r) => r.json() as Promise<{ drepId: string | null }>)
    .then((d) => d.drepId)
    .catch(() => null);
  return pending;
}

export function useMyDRep(): string | null {
  const [drepId, setDrepId] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    loadMyDRep().then((id) => live && setDrepId(id));
    const onAuth = () => {
      pending = null;
      loadMyDRep().then((id) => live && setDrepId(id));
    };
    window.addEventListener('adapolis:auth', onAuth);
    return () => {
      live = false;
      window.removeEventListener('adapolis:auth', onAuth);
    };
  }, []);
  return drepId;
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
