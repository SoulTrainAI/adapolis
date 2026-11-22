'use client';

import { useEffect, useRef, useState } from 'react';
import { Wallet, LogOut, Loader2 } from 'lucide-react';

interface InstalledWallet {
  id: string;
  name: string;
  icon: string;
}

type Status = 'loading' | 'disabled' | 'signed-out' | 'choosing' | 'signing' | 'signed-in';

function short(stakeAddress: string): string {
  return `${stakeAddress.slice(0, 10)}…${stakeAddress.slice(-4)}`;
}

async function errorText(res: Response): Promise<string> {
  const body: unknown = await res.json().catch(() => null);
  if (typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string') return body.error;
  return `Server returned HTTP ${res.status}. Try again in a minute.`;
}

function walletErrorText(error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'info' in error && typeof error.info === 'string'
        ? error.info
        : String(error);
  if (/declin|reject|cancel|refus/i.test(raw)) return 'Signing was cancelled in the wallet.';
  return `Wallet error: ${raw}. Some hardware-wallet setups can't sign messages (CIP-8); try a software wallet account.`;
}

export function WalletSignIn() {
  const [status, setStatus] = useState<Status>('loading');
  const [stakeAddress, setStakeAddress] = useState<string | null>(null);
  const [wallets, setWallets] = useState<InstalledWallet[]>([]);
  const [error, setError] = useState<string | null>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json() as Promise<{ enabled: boolean; stakeAddress: string | null }>)
      .then((me) => {
        if (!me.enabled) return setStatus('disabled');
        setStakeAddress(me.stakeAddress);
        setStatus(me.stakeAddress ? 'signed-in' : 'signed-out');
      })
      .catch(() => setStatus('signed-out'));
  }, []);

  useEffect(() => {
    if (status !== 'choosing') return;
    const close = (e: MouseEvent) => {
      if (panel.current && !panel.current.contains(e.target as Node)) setStatus('signed-out');
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [status]);

  async function choose() {
    setError(null);
    // Mesh is loaded on demand so its WASM isn't shipped with every page.
    const { BrowserWallet } = await import('@meshsdk/core');
    setWallets(BrowserWallet.getInstalledWallets().map((w) => ({ id: w.id, name: w.name, icon: w.icon })));
    setStatus('choosing');
  }

  async function signIn(walletId: string) {
    setStatus('signing');
    setError(null);
    try {
      const { BrowserWallet } = await import('@meshsdk/core');
      const wallet = await BrowserWallet.enable(walletId);
      if ((await wallet.getNetworkId()) !== 1) {
        throw new Error('Switch the wallet to Cardano mainnet and try again');
      }
      const [stake] = await wallet.getRewardAddresses();
      if (!stake) throw new Error('This wallet account has no stake address');

      const challengeRes = await fetch('/api/auth/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stakeAddress: stake }),
      });
      if (!challengeRes.ok) throw new Error(await errorText(challengeRes));
      const { message, token } = (await challengeRes.json()) as { message: string; token: string };

      const { signature, key } = await wallet.signData(message, stake);

      const verifyRes = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, signature, key }),
      });
      if (!verifyRes.ok) throw new Error(await errorText(verifyRes));
      setStakeAddress(stake);
      setStatus('signed-in');
      window.dispatchEvent(new CustomEvent('adapolis:auth', { detail: stake }));
    } catch (e) {
      setError(walletErrorText(e));
      setStatus('signed-out');
    }
  }

  async function signOut() {
    await fetch('/api/auth/logout', { method: 'POST' });
    setStakeAddress(null);
    setStatus('signed-out');
    window.dispatchEvent(new CustomEvent('adapolis:auth', { detail: null }));
  }

  if (status === 'disabled') return null;
  if (status === 'loading') return <div className="w-32" aria-hidden />;

  if (status === 'signed-in' && stakeAddress) {
    return (
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm text-emerald-300" title={stakeAddress}>
          {short(stakeAddress)}
        </span>
        <button
          onClick={signOut}
          className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800"
          title="Sign out"
          aria-label="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative" ref={panel}>
      <button
        onClick={choose}
        disabled={status === 'signing'}
        className="flex items-center gap-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white text-sm font-medium px-3 py-1.5"
      >
        {status === 'signing' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
        {status === 'signing' ? 'Check your wallet…' : 'Connect wallet'}
      </button>
      {status === 'choosing' && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-700 bg-slate-900 p-2 shadow-xl">
          {wallets.length === 0 ? (
            <p className="p-2 text-sm text-slate-300">
              No Cardano wallet found. Install a CIP-30 wallet such as Eternl, Lace or Typhon, then reload.
            </p>
          ) : (
            wallets.map((w) => (
              <button
                key={w.id}
                onClick={() => signIn(w.id)}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm text-slate-200 hover:bg-slate-800"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={w.icon} alt="" className="w-6 h-6" />
                {w.name}
              </button>
            ))
          )}
          <p className="px-2 pt-2 text-[11px] text-slate-500">
            You&apos;ll sign a message to prove you own the wallet. No transaction, no fee.
          </p>
        </div>
      )}
      {error && status === 'signed-out' && (
        <p className="absolute right-0 mt-2 w-72 rounded-lg border border-rose-800 bg-rose-950/90 p-2 text-xs text-rose-200">
          {error}
        </p>
      )}
    </div>
  );
}
