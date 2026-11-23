'use client';

/**
 * Where a DRep claims its card: sign once with the DRep key (CIP-95), then
 * set card art, bio and links. Stats stay as the chain made them.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, LogOut, Plus, Trash2 } from 'lucide-react';
import { TradingCard } from '@/components/cards/TradingCard';
import { useCards } from '@/components/cards/useCards';
import { CARD_QUOTE_MAX, cardQuote } from '@/lib/cards/quote';
import { errorText, walletErrorText } from '@/components/auth/WalletSignIn';

type Link = { label: string; url: string };
interface Profile {
  image: string | null;
  bio: string | null;
  links: Link[] | null;
}
interface Me {
  drepId: string | null;
  override?: Profile | null;
  onchain?: { image: string | null; bio: string | null; links: Link[] } | null;
}

interface Cip95Api {
  cip95?: {
    getPubDRepKey: () => Promise<string>;
    signData: (addr: string, payload: string) => Promise<{ signature: string; key: string }>;
  };
}
type CardanoWindow = Window & {
  cardano?: Record<string, { name?: string; icon?: string; enable: (opts?: { extensions: Array<{ cip: number }> }) => Promise<Cip95Api> }>;
};

const toHex = (s: string) => Array.from(new TextEncoder().encode(s), (b) => b.toString(16).padStart(2, '0')).join('');

export function DrepStudio() {
  const [me, setMe] = useState<Me | null>(null);
  const [wallets, setWallets] = useState<Array<{ id: string; name: string; icon: string }>>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [image, setImage] = useState('');
  const [bio, setBio] = useState('');
  const [links, setLinks] = useState<Link[]>([]);
  const { cards } = useCards();

  const load = useCallback(async () => {
    const res = await fetch('/api/drep/me');
    const body = (await res.json()) as Me;
    setMe(body);
    if (body.drepId) {
      const o = body.override;
      const c = body.onchain;
      setImage(o?.image ?? c?.image ?? '');
      setBio(o?.bio ?? c?.bio ?? '');
      setLinks(o?.links ?? c?.links ?? []);
    }
  }, []);

  useEffect(() => {
    load().catch(() => setMe({ drepId: null }));
    const w = (window as CardanoWindow).cardano ?? {};
    setWallets(
      Object.entries(w)
        .filter(([, v]) => v && typeof v.enable === 'function' && v.name)
        .map(([id, v]) => ({ id, name: v.name ?? id, icon: v.icon ?? '' }))
        .filter((v, i, a) => a.findIndex((x) => x.name === v.name) === i)
    );
  }, [load]);

  async function signIn(walletId: string) {
    setBusy(true);
    setError(null);
    try {
      const api = await (window as CardanoWindow).cardano![walletId].enable({ extensions: [{ cip: 95 }] });
      if (!api.cip95) throw new Error("This wallet doesn't support DRep signing (CIP-95). Eternl, Lace, Yoroi and NuFi do");
      const publicKey = await api.cip95.getPubDRepKey();
      const chRes = await fetch('/api/drep/challenge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ publicKey }) });
      if (!chRes.ok) throw new Error(await errorText(chRes));
      const ch = (await chRes.json()) as { message: string; token: string; drepId: string; keyHash: string; cip105: string };
      // CIP-95 says sign with the DRep key hash; some wallets expect a bech32 DRep ID instead.
      let signed: { signature: string; key: string } | null = null;
      let lastError: unknown = null;
      for (const addr of [ch.keyHash, ch.cip105, ch.drepId]) {
        try {
          signed = await api.cip95.signData(addr, toHex(ch.message));
          break;
        } catch (e) {
          lastError = e;
          if (/declin|reject|cancel|refus/i.test(walletErrorText(e))) throw e;
        }
      }
      if (!signed) throw lastError ?? new Error('The wallet could not sign with the DRep key');
      const vRes = await fetch('/api/drep/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: ch.token, ...signed }) });
      if (!vRes.ok) throw new Error(await errorText(vRes));
      await load();
    } catch (e) {
      setError(walletErrorText(e));
    } finally {
      setBusy(false);
    }
  }

  async function save(reset = false) {
    if (!me?.drepId) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    const on = me.onchain;
    const cleanLinks = links.filter((l) => l.url.trim());
    // Unchanged fields stay null so later on-chain updates still show through.
    const same = (a: Link[], b: Link[] | undefined) => JSON.stringify(a) === JSON.stringify(b ?? []);
    const body = reset
      ? { image: null, bio: null, links: null }
      : {
          image: image.trim() && image.trim() !== on?.image ? image.trim() : null,
          bio: bio.trim() && bio.trim() !== on?.bio ? bio.trim() : null,
          links: same(cleanLinks, on?.links) ? null : cleanLinks,
        };
    try {
      const res = await fetch('/api/drep/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error(await errorText(res));
      setNotice(reset ? 'Back to your on-chain profile.' : 'Saved. Your card updates across ADApolis within a minute.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await fetch('/api/drep/logout', { method: 'POST' });
    setMe({ drepId: null });
  }

  const card = me?.drepId ? cards.get(me.drepId) : undefined;
  const preview = useMemo(() => (card ? { ...card, image: image.trim() || null } : undefined), [card, image]);

  if (!me) {
    return (
      <p className="flex items-center gap-2 text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </p>
    );
  }

  if (!me.drepId) {
    return (
      <div className="max-w-2xl space-y-4">
        <p className="text-slate-300">
          Connect the wallet you registered as a DRep with. It asks you to sign one message with your <strong>DRep key</strong>, which proves the
          card is yours. It doesn&apos;t authorise any transaction or vote.
        </p>
        {wallets.length === 0 ? (
          <p className="text-slate-400">No Cardano wallet found in this browser. Install Eternl, Lace, Yoroi or NuFi.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {wallets.map((w) => (
              <button
                key={w.id}
                type="button"
                disabled={busy}
                onClick={() => signIn(w.id)}
                className="flex items-center gap-2 border border-slate-700 bg-slate-900 px-4 py-2 text-slate-100 hover:border-violet-500 disabled:opacity-50"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- wallet-provided data URI icon */}
                {w.icon && <img src={w.icon} alt="" className="h-5 w-5" />}
                {w.name}
              </button>
            ))}
          </div>
        )}
        {busy && (
          <p className="flex items-center gap-2 text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Waiting for your wallet…
          </p>
        )}
        {error && <p className="text-rose-300">{error}</p>}
        <p className="text-sm text-slate-500">Script-based DReps (multisig or smart contract) have no single key to sign with; contact us in #drep-verify on Discord instead.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <p className="break-all font-mono text-sm text-emerald-300">{me.drepId}</p>
          <button type="button" onClick={signOut} className="flex items-center gap-1 text-sm text-slate-400 hover:text-white">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>

        <label className="block space-y-1">
          <span className="text-sm font-semibold text-white">Card art</span>
          <input
            value={image}
            onChange={(e) => setImage(e.target.value)}
            placeholder="https://… or ipfs://… link to a square-ish picture"
            className="w-full border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500"
          />
          <span className="text-xs text-slate-500">Use art you own or have the right to use: cards may later be minted as collectibles.</span>
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-semibold text-white">Bio</span>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, 1500))}
            rows={6}
            className="w-full border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
          />
          <span className="text-xs text-slate-500">{bio.length}/1500. Your full bio appears on your profile page.</span>
          <span className="block border-l-2 border-amber-400/60 pl-3 text-xs text-slate-300">
            {cardQuote([bio]) ? (
              <>
                <span className="font-semibold text-amber-200">On your card:</span> “{cardQuote([bio])}”
              </>
            ) : (
              <>
                <span className="font-semibold text-amber-200">On your card:</span> nothing yet. The card back fits a complete
                quote of up to {CARD_QUOTE_MAX} characters, so start your bio with a short sentence that sums you up.
              </>
            )}
          </span>
        </label>

        <div className="space-y-2">
          <span className="text-sm font-semibold text-white">Links</span>
          {links.map((l, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={l.label}
                onChange={(e) => setLinks(links.map((x, j) => (j === i ? { ...x, label: e.target.value.slice(0, 40) } : x)))}
                placeholder="Label (e.g. X)"
                className="w-32 border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
              />
              <input
                value={l.url}
                onChange={(e) => setLinks(links.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))}
                placeholder="https://…"
                className="min-w-0 flex-1 border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
              />
              <button type="button" onClick={() => setLinks(links.filter((_, j) => j !== i))} aria-label="Remove link" className="px-2 text-slate-400 hover:text-white">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {links.length < 8 && (
            <button type="button" onClick={() => setLinks([...links, { label: '', url: '' }])} className="flex items-center gap-1 text-sm text-violet-300 hover:text-violet-200">
              <Plus className="h-4 w-4" /> Add a link
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button type="button" disabled={busy} onClick={() => save()} className="flex items-center gap-2 bg-violet-600 px-5 py-2 font-semibold text-white hover:bg-violet-500 disabled:opacity-50">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save card
          </button>
          <button type="button" disabled={busy} onClick={() => save(true)} className="text-sm text-slate-400 hover:text-white">
            Reset to my on-chain profile
          </button>
        </div>
        {notice && <p className="text-emerald-300">{notice}</p>}
        {error && <p className="text-rose-300">{error}</p>}
        <p className="text-xs text-slate-500">
          Changes show on ADApolis only; your on-chain DRep metadata is untouched. Name, scores, stats and abilities always come from the chain.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-white">Preview</p>
        {preview ? <TradingCard card={preview} variant="scoreboard" /> : <p className="text-sm text-slate-400">Loading your card…</p>}
      </div>
    </div>
  );
}
