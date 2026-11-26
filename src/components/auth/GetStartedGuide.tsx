'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Check, Copy, ExternalLink, KeyRound, ShieldCheck, Smartphone, Sparkles, Wallet, X } from 'lucide-react';
import { detectDevice, openInWalletLink, walletsFor, type Device } from '@/lib/wallets/catalog';

/** Fired by any page to open the guide; WalletSignIn listens. */
export const GET_STARTED_EVENT = 'adapolis:get-started';

export function openGetStarted(step?: Step) {
  window.dispatchEvent(new CustomEvent(GET_STARTED_EVENT, { detail: step ?? null }));
}

export type Step = 'welcome' | 'choose' | 'secure' | 'open' | 'sign' | 'delegate';
const ORDER: Step[] = ['welcome', 'choose', 'secure', 'open', 'sign', 'delegate'];
const STORAGE_KEY = 'adapolis:get-started-step';

function remembered(): Step | null {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v && (ORDER as string[]).includes(v) ? (v as Step) : null;
  } catch {
    return null;
  }
}

function remember(step: Step) {
  try {
    window.localStorage.setItem(STORAGE_KEY, step);
  } catch {
    // Private browsing: progress just isn't kept.
  }
}

interface Props {
  open: boolean;
  initialStep: Step | null;
  /** Wallets injected into this browser (extensions, or a wallet app's own browser). */
  walletsFound: number;
  signedIn: boolean;
  onConnect: () => void;
  onClose: () => void;
}

export function GetStartedGuide({ open, initialStep, walletsFound, signedIn, onConnect, onClose }: Props) {
  const [step, setStep] = useState<Step>('welcome');
  const [device, setDevice] = useState<Device>('desktop');
  const [copied, setCopied] = useState(false);
  const dialog = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setDevice(detectDevice(navigator.userAgent, navigator.maxTouchPoints));
    setStep(signedIn ? 'delegate' : walletsFound > 0 ? 'sign' : (initialStep ?? remembered() ?? 'welcome'));
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, initialStep, walletsFound, signedIn, onClose]);

  if (!open) return null;

  const go = (s: Step) => {
    setStep(s);
    remember(s);
    dialog.current?.scrollTo({ top: 0 });
  };
  const index = ORDER.indexOf(step);
  const back = index > 0 ? ORDER[index - 1] : null;
  const mobile = device !== 'desktop';
  const wallets = walletsFor(device);
  const here = typeof window === 'undefined' ? 'https://www.adapolis.net' : window.location.href;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(here);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  // Portalled to <body>: the navbar's backdrop blur would otherwise trap a fixed dialog inside the bar.
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="get-started-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl border border-slate-700 bg-slate-900 p-5 text-slate-200 shadow-2xl outline-none sm:max-w-lg sm:rounded-2xl sm:p-6"
      >
        <div className="mb-4 flex items-center gap-2">
          {back && step !== 'welcome' ? (
            <button
              onClick={() => go(back)}
              className="-ml-2 flex h-11 w-11 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
              aria-label="Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          ) : (
            <span className="w-9" />
          )}
          <ol className="flex flex-1 justify-center gap-1.5" aria-label={`Step ${index + 1} of ${ORDER.length}`}>
            {ORDER.map((s, i) => (
              <li key={s} className={`h-1.5 w-6 rounded-full ${i <= index ? 'bg-brand-gold' : 'bg-slate-700'}`} />
            ))}
          </ol>
          <button
            onClick={onClose}
            className="-mr-2 flex h-11 w-11 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {step === 'welcome' && (
          <section className="space-y-4">
            <Sparkles className="h-8 w-8 text-brand-gold" aria-hidden />
            <h2 id="get-started-title" className="text-2xl font-bold text-white">
              Play in about 5 minutes
            </h2>
            <p>
              ADApolis uses a <strong>Cardano wallet</strong> as your free login. It&apos;s an app that holds your ADA and proves who you are. Nobody
              can see your password, and ADApolis never touches your funds.
            </p>
            <ul className="space-y-2 text-sm text-slate-300">
              <li className="flex gap-2">
                <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" /> Free: signing in costs nothing.
              </li>
              <li className="flex gap-2">
                <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" /> Works on your phone or computer.
              </li>
              <li className="flex gap-2">
                <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" /> You don&apos;t need any ADA to play.
              </li>
            </ul>
            <div className="grid gap-2 pt-2 sm:grid-cols-2">
              <button
                onClick={() => go('choose')}
                className="min-h-[44px] rounded-lg bg-violet-600 px-4 py-2.5 font-semibold text-white hover:bg-violet-500"
              >
                I&apos;m new: help me get a wallet
              </button>
              <button
                onClick={() => go('open')}
                className="min-h-[44px] rounded-lg border border-slate-600 px-4 py-2.5 font-semibold text-slate-100 hover:bg-slate-800"
              >
                I already have a wallet
              </button>
            </div>
          </section>
        )}

        {step === 'choose' && (
          <section className="space-y-4">
            <Wallet className="h-8 w-8 text-brand-gold" aria-hidden />
            <h2 id="get-started-title" className="text-2xl font-bold text-white">
              1. Get a wallet {mobile ? 'app' : 'extension'}
            </h2>
            <p className="text-sm text-slate-300">
              {mobile
                ? `Pick one and install it from its official website, which links to the ${device === 'ios' ? 'App Store' : 'Google Play'} listing.`
                : 'Pick one and install its browser extension from its official website. Chrome, Brave and Edge all work.'}{' '}
              Any of these works with ADApolis.
            </p>
            <ul className="space-y-2">
              {wallets.map((w) => (
                <li key={w.id}>
                  <a
                    href={w.site}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-h-[52px] items-center justify-between gap-3 rounded-xl border border-slate-700 px-4 py-3 hover:border-violet-500 hover:bg-slate-800"
                  >
                    <span>
                      <span className="font-semibold text-white">{w.name}</span>
                      {mobile && w.opensLinks && <span className="block text-xs text-emerald-300">Opens ADApolis in one tap</span>}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      {new URL(w.site).hostname.replace(/^www\./, '')} <ExternalLink className="h-3.5 w-3.5" />
                    </span>
                  </a>
                </li>
              ))}
            </ul>
            <p className="flex gap-2 rounded-lg bg-amber-500/10 p-3 text-xs text-amber-100">
              <ShieldCheck className="h-4 w-4 flex-shrink-0 text-amber-300" aria-hidden />
              Only install from these official sites. Copycat wallet apps exist and steal funds.
            </p>
            <button
              onClick={() => go('secure')}
              className="min-h-[44px] w-full rounded-lg bg-violet-600 px-4 py-2.5 font-semibold text-white hover:bg-violet-500"
            >
              I&apos;ve installed it
            </button>
          </section>
        )}

        {step === 'secure' && (
          <section className="space-y-4">
            <KeyRound className="h-8 w-8 text-brand-gold" aria-hidden />
            <h2 id="get-started-title" className="text-2xl font-bold text-white">
              2. Create your wallet safely
            </h2>
            <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-300">
              <li>
                Open the wallet and choose <strong>Create a new wallet</strong>.
              </li>
              <li>
                It shows a <strong>recovery phrase</strong> (12, 15 or 24 words). Write them on paper, in order, and keep it somewhere safe. Those
                words are the only way back in if you lose your device.
              </li>
              <li>Confirm the words when asked, then set a spending password you&apos;ll remember.</li>
            </ol>
            <div className="space-y-1 rounded-lg border border-rose-800/60 bg-rose-950/40 p-3 text-sm text-rose-100">
              <p className="font-semibold">Never type your recovery phrase into a website or share it with anyone.</p>
              <p className="text-xs text-rose-200/80">ADApolis will never ask for it. Anyone who has those words owns your wallet.</p>
            </div>
            <button
              onClick={() => go('open')}
              className="min-h-[44px] w-full rounded-lg bg-violet-600 px-4 py-2.5 font-semibold text-white hover:bg-violet-500"
            >
              My wallet is ready
            </button>
          </section>
        )}

        {step === 'open' && (
          <section className="space-y-4">
            <Smartphone className="h-8 w-8 text-brand-gold" aria-hidden />
            <h2 id="get-started-title" className="text-2xl font-bold text-white">
              3. {mobile ? 'Open ADApolis in your wallet' : 'Connect your wallet'}
            </h2>
            {mobile ? (
              <>
                <p className="text-sm text-slate-300">
                  Phone browsers can&apos;t talk to wallet apps, so ADApolis has to be opened <em>inside</em> the wallet&apos;s own browser. Your
                  team, leagues and quiz all work there.
                </p>
                <a
                  href={openInWalletLink(here)}
                  className="flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 font-semibold text-white hover:bg-violet-500"
                >
                  Open in VESPR or Begin
                </a>
                <div className="space-y-2 rounded-xl border border-slate-700 p-4 text-sm text-slate-300">
                  <p className="font-semibold text-white">Using Eternl, Lace, Yoroi or another wallet?</p>
                  <ol className="list-decimal space-y-1 pl-5">
                    <li>Copy this page&apos;s address.</li>
                    <li>
                      Open your wallet and find its browser (often a tab called <strong>Browser</strong>, <strong>dApps</strong> or{' '}
                      <strong>Discover</strong>).
                    </li>
                    <li>Paste the address there and come back to this guide.</li>
                  </ol>
                  <button
                    onClick={copyLink}
                    className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-slate-600 px-4 py-2 font-medium text-slate-100 hover:bg-slate-800"
                  >
                    {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                    {copied ? 'Copied' : 'Copy address'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-slate-300">
                  {walletsFound > 0
                    ? 'Your wallet extension is installed. Next, sign in with it.'
                    : 'Just installed an extension? Reload this page so your browser picks it up. If you set the wallet up on your phone, install the same wallet’s extension here and restore it with your recovery phrase inside the extension (never on a website).'}
                </p>
                {walletsFound > 0 ? (
                  <button
                    onClick={() => go('sign')}
                    className="min-h-[44px] w-full rounded-lg bg-violet-600 px-4 py-2.5 font-semibold text-white hover:bg-violet-500"
                  >
                    Continue
                  </button>
                ) : (
                  <button
                    onClick={() => window.location.reload()}
                    className="min-h-[44px] w-full rounded-lg bg-violet-600 px-4 py-2.5 font-semibold text-white hover:bg-violet-500"
                  >
                    Reload page
                  </button>
                )}
                <p className="text-xs text-slate-500">On a phone instead? Open adapolis.net there and this guide will show the phone steps.</p>
              </>
            )}
          </section>
        )}

        {step === 'sign' && (
          <section className="space-y-4">
            <ShieldCheck className="h-8 w-8 text-brand-gold" aria-hidden />
            <h2 id="get-started-title" className="text-2xl font-bold text-white">
              4. Sign in (free)
            </h2>
            <p className="text-sm text-slate-300">
              Your wallet will ask you to <strong>sign a message</strong>. That proves the wallet is yours. It is not a transaction: nothing is sent,
              nothing is spent, and there is no fee.
            </p>
            {walletsFound > 0 ? (
              <button
                onClick={() => {
                  remember('delegate');
                  onConnect();
                }}
                className="min-h-[44px] w-full rounded-lg bg-violet-600 px-4 py-2.5 font-semibold text-white hover:bg-violet-500"
              >
                Choose my wallet and sign
              </button>
            ) : (
              <p className="rounded-lg bg-slate-800 p-3 text-sm text-slate-300">
                No wallet is connected to this browser yet. Go back a step to open ADApolis{' '}
                {mobile ? 'inside your wallet app' : 'with your extension installed'}.
              </p>
            )}
          </section>
        )}

        {step === 'delegate' && (
          <section className="space-y-4">
            <Sparkles className="h-8 w-8 text-brand-gold" aria-hidden />
            <h2 id="get-started-title" className="text-2xl font-bold text-white">
              {signedIn ? "You're in!" : '5. Want to win prizes?'}
            </h2>
            <p className="text-sm text-slate-300">
              {signedIn ? 'You can draft a team, join leagues and save your quiz now. ' : ''}
              Playing is free for everyone. To compete for the season&apos;s NFT prizes, your wallet also needs:
            </p>
            <ul className="space-y-2 text-sm text-slate-300">
              <li className="flex gap-2">
                <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" /> At least 100 ADA in it at the season&apos;s end.
              </li>
              <li className="flex gap-2">
                <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" /> Its vote delegated (to any DRep, Abstain or No Confidence) before
                the season starts.
              </li>
            </ul>
            <p className="text-xs text-slate-500">
              To get ADA, buy it on an exchange you trust and send it to your wallet&apos;s receive address. Delegating is done in your wallet and
              keeps your ADA in your wallet.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <a
                href="/match"
                className="flex min-h-[44px] items-center justify-center rounded-lg border border-slate-600 px-4 py-2.5 font-semibold text-slate-100 hover:bg-slate-800"
              >
                Find a DRep for me
              </a>
              <a
                href="/draft"
                className="flex min-h-[44px] items-center justify-center rounded-lg bg-violet-600 px-4 py-2.5 font-semibold text-white hover:bg-violet-500"
              >
                Draft my team
              </a>
            </div>
          </section>
        )}
      </div>
    </div>,
    document.body,
  );
}
