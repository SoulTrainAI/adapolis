/**
 * Wallets the Get Started guide suggests. Links go only to each wallet's
 * official site as listed on cardano.org/wallets (2026-11-25): fake wallet
 * apps in the app stores are a common scam, so we never link to a store
 * listing we can't vouch for. Order is alphabetical; ADApolis endorses none.
 */

export type Device = 'ios' | 'android' | 'desktop';

export interface WalletOption {
  id: string;
  name: string;
  site: string;
  mobile: boolean;
  extension: boolean;
  /** Implements CIP-158: a web+cardano://browse link opens a site in the wallet's own browser. */
  opensLinks: boolean;
}

export const WALLETS: WalletOption[] = [
  { id: 'begin', name: 'Begin', site: 'https://begin.is', mobile: true, extension: true, opensLinks: true },
  { id: 'eternl', name: 'Eternl', site: 'https://eternl.io', mobile: true, extension: true, opensLinks: false },
  { id: 'gero', name: 'GeroWallet', site: 'https://gerowallet.io', mobile: false, extension: true, opensLinks: false },
  { id: 'lace', name: 'Lace', site: 'https://www.lace.io/', mobile: true, extension: true, opensLinks: false },
  { id: 'typhon', name: 'Typhon', site: 'https://typhonwallet.io', mobile: false, extension: true, opensLinks: false },
  { id: 'vespr', name: 'VESPR', site: 'https://vespr.xyz', mobile: true, extension: true, opensLinks: true },
  { id: 'yoroi', name: 'Yoroi', site: 'https://yoroi-wallet.com', mobile: true, extension: true, opensLinks: false },
];

export function walletsFor(device: Device): WalletOption[] {
  // On phones, wallets that can open ADApolis in one tap come first.
  if (device === 'desktop') return WALLETS.filter((w) => w.extension);
  return WALLETS.filter((w) => w.mobile).sort((a, b) => Number(b.opensLinks) - Number(a.opensLinks));
}

export function detectDevice(userAgent: string, maxTouchPoints: number): Device {
  if (/iPhone|iPad|iPod/i.test(userAgent) || (/Macintosh/i.test(userAgent) && maxTouchPoints > 1)) return 'ios';
  if (/Android/i.test(userAgent)) return 'android';
  return 'desktop';
}

/** CIP-158 link that opens `url` inside a wallet app's own browser (VESPR, Begin). */
export function openInWalletLink(url: string): string {
  return `web+cardano://browse/v1?uri=${encodeURIComponent(url)}`;
}
