/**
 * Admin access: wallets listed in the Railway variable ADMIN_STAKE_ADDRESSES
 * (comma-separated stake addresses). The admin signs in like anyone else, with
 * a wallet signature, so the list itself grants nothing without the wallet.
 */

import { currentStakeAddress } from '@/lib/auth/current';

export function adminList(): Set<string> {
  // Pull every stake address out of the value, so quotes, spaces, newlines or a pasted "NAME=" prefix don't matter.
  return new Set((process.env.ADMIN_STAKE_ADDRESSES ?? '').match(/stake1u[02-9ac-hj-np-z]{52}/g) ?? []);
}

/** For the admin page's diagnostics: whether the variable is set, and how many addresses it holds (never which). */
export function adminConfig(): { variable_set: boolean; addresses: number } {
  return { variable_set: (process.env.ADMIN_STAKE_ADDRESSES ?? '').trim() !== '', addresses: adminList().size };
}

/** The signed-in admin's stake address, or null if the visitor isn't an admin. */
export function currentAdmin(): string | null {
  const stake = currentStakeAddress();
  return stake && adminList().has(stake) ? stake : null;
}
