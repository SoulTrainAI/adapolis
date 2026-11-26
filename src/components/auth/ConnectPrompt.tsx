'use client';

import { useEffect, useState } from 'react';
import { Wallet } from 'lucide-react';
import { openGetStarted } from './GetStartedGuide';

/** Inline sign-in prompt for pages that need a wallet; opens the Get Started guide, which handles every device. */
export function ConnectPrompt({ reason }: { reason: string }) {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json() as Promise<{ stakeAddress: string | null }>)
      .then((me) => setSignedIn(Boolean(me.stakeAddress)))
      .catch(() => setSignedIn(false));
    const onAuth = (e: Event) => setSignedIn(Boolean((e as CustomEvent<string | null>).detail));
    window.addEventListener('adapolis:auth', onAuth);
    return () => window.removeEventListener('adapolis:auth', onAuth);
  }, []);

  if (signedIn !== false) return null;
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={() => openGetStarted()}
        className="flex min-h-[44px] items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500"
      >
        <Wallet className="h-4 w-4" aria-hidden /> Connect wallet
      </button>
      <p className="text-sm text-slate-400">{reason} Free: it only asks you to sign a message. New to Cardano? We&apos;ll walk you through it.</p>
    </div>
  );
}
