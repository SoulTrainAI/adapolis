'use client';

import { Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { X_HANDLE, X_URL } from '@/lib/site/social';

const WALLET_ADDRESS = 'addr1q9gajv8k3qvl59z5knpyypecf3s6mhdrpr9xd8jsd5y5fsqpy0t8a58zxqqup43d84ju95m62dqrwvdz7s6t429yx6hs56g2mm';

export function Footer() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(WALLET_ADDRESS);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <footer className="bg-slate-900 border-t border-slate-800 py-6">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <p className="text-sm text-slate-400 mb-2">Support ADApolis — Donate ADA or CNTs:</p>
        <div className="flex items-center justify-center gap-2">
          <code className="text-xs sm:text-sm text-slate-300 font-mono break-all">
            {WALLET_ADDRESS}
          </code>
          <button
            onClick={handleCopy}
            className="flex-shrink-0 p-1 text-slate-400 hover:text-slate-200 transition-colors"
            title="Copy wallet address"
            aria-label="Copy wallet address"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
        </div>
        <a
          href={X_URL}
          target="_blank"
          rel="noopener noreferrer me"
          className="mt-4 inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white transition-colors"
        >
          <span aria-hidden className="text-base font-bold">𝕏</span> Follow {X_HANDLE}
        </a>
      </div>
    </footer>
  );
}
