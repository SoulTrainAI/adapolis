'use client';

import { Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { DISCORD_URL, X_HANDLE, X_URL } from '@/lib/site/social';
import { LogoMark } from '@/components/brand/Logo';

const WALLET_ADDRESS = 'addr1q9gajv8k3qvl59z5knpyypecf3s6mhdrpr9xd8jsd5y5fsqpy0t8a58zxqqup43d84ju95m62dqrwvdz7s6t429yx6hs56g2mm';

/** One row: mark, donation address (copyable), community links. Wraps only on small screens. */
export function Footer() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(WALLET_ADDRESS);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const link = 'text-slate-400 transition-colors hover:text-white';
  return (
    <footer className="bg-brand-navy">
      <div className="brand-hairline h-px w-full opacity-60" />
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-6 gap-y-2 px-4 py-4 text-sm sm:px-6 lg:px-8">
        <span className="flex items-center gap-2 text-slate-300">
          <LogoMark size={22} />© ADApolis
        </span>
        <span className="flex items-center gap-1.5 text-slate-400">
          Donate ADA or CNTs:
          <button type="button" onClick={handleCopy} className="flex items-center gap-1 font-mono text-slate-300 hover:text-white" title="Copy the full donation address">
            {WALLET_ADDRESS.slice(0, 12)}…{WALLET_ADDRESS.slice(-6)}
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
          </button>
        </span>
        <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer" className={link} title="Governance feeds, season recaps, Ask a DRep and newcomer guides">
          Join On Discord
        </a>
        <a href={X_URL} target="_blank" rel="noopener noreferrer me" className={link} title="Updates, card of the day and season news">
          Follow On X {X_HANDLE}
        </a>
        <a href="/drep" className={link}>
          DReps: Claim your profile
        </a>
        <a href="/terms" className={link}>
          Terms
        </a>
        <a href="/privacy" className={link}>
          Privacy
        </a>
      </div>
      <p className="mx-auto max-w-4xl px-4 pb-5 text-center text-xs leading-relaxed text-slate-500">
        <strong className="text-slate-400">Collectibles only. Not financial instruments.</strong> DRep All-Star NFTs and DRep All-Star Season
        Trophies are digital collectibles. They pay nothing, share no revenue or royalties, carry no votes or say over ADApolis, and come with no
        promise of value. Nothing here is financial advice.
      </p>
    </footer>
  );
}
