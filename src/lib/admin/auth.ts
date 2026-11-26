/**
 * Admin access: wallets listed in the Railway variable ADMIN_STAKE_ADDRESSES
 * (comma-separated stake addresses). The admin signs in like anyone else, with
 * a wallet signature, so the list itself grants nothing without the wallet.
 */

import { currentStakeAddress } from '@/lib/auth/current';

export function adminList(): Set<string> {
  return new Set(
    (process.env.ADMIN_STAKE_ADDRESSES ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter((s) => /^stake1u[02-9ac-hj-np-z]{52}$/.test(s))
  );
}

/** The signed-in admin's stake address, or null if the visitor isn't an admin. */
export function currentAdmin(): string | null {
  const stake = currentStakeAddress();
  return stake && adminList().has(stake) ? stake : null;
}
