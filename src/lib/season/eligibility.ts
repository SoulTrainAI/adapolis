/**
 * Prize eligibility (docs/GAME.md). Anyone can play; to compete for Champion
 * Cards and Season Trophies a wallet must:
 *  - delegate its vote (to any DRep, or Abstain / No Confidence) since before
 *    the season's roster-lock epoch, and
 *  - have at least 100 ADA counted in Cardano's per-epoch stake snapshot at
 *    the season's end.
 * Snapshots make it impossible to count the same ADA for two wallets, so fake
 * wallets cost real, idle capital. Never depends on WHICH DRep (Cardinal Rule:
 * the game doesn't reward delegating to anyone in particular).
 */

import { z } from 'zod';
import { koiosFetch } from '@/lib/koios/client';

export const MIN_PRIZE_ADA = 100;

const AccountSchema = z.array(z.object({ stake_address: z.string(), delegated_drep: z.string().nullable() }));
const DelegatorSchema = z.array(z.object({ stake_address: z.string(), epoch_no: z.number().nullable(), amount: z.string() }));

export interface Delegation {
  /** drep1…, drep_always_abstain, drep_always_no_confidence, or null */
  drep: string | null;
  /** Epoch this delegation started */
  since_epoch: number | null;
  /** ADA counted for this wallet in the latest stake snapshot */
  snapshot_ada: number;
}

export async function delegationOf(stakeAddress: string): Promise<Delegation> {
  const info = AccountSchema.parse(await koiosFetch<unknown>('/account_info', { method: 'POST', body: { _stake_addresses: [stakeAddress] } }));
  const drep = info[0]?.delegated_drep ?? null;
  if (!drep) return { drep: null, since_epoch: null, snapshot_ada: 0 };
  const rows = DelegatorSchema.parse(
    await koiosFetch<unknown>(`/drep_delegators?_drep_id=${encodeURIComponent(drep)}&stake_address=eq.${stakeAddress}`, { method: 'GET' })
  );
  const row = rows[0];
  return { drep, since_epoch: row?.epoch_no ?? null, snapshot_ada: row ? Number(row.amount) / 1_000_000 : 0 };
}

/** Pure: delegated since before the lock epoch. */
export function eligibleAtLock(d: Delegation, lockEpoch: number): boolean {
  return d.drep !== null && d.since_epoch !== null && d.since_epoch < lockEpoch;
}

/** Pure: still delegated with enough ADA in the snapshot at the season's end. */
export function eligibleAtEnd(d: Delegation): boolean {
  return d.drep !== null && d.snapshot_ada >= MIN_PRIZE_ADA;
}

export interface EligibilityStatus {
  delegation: Delegation;
  lock_epoch: number;
  /** Would qualify if the season ended now */
  eligible_now: boolean;
  message: string;
}

/** What the draft page tells a player about prize eligibility. */
export function describeEligibility(d: Delegation, lockEpoch: number, currentEpoch: number): EligibilityStatus {
  const before = eligibleAtLock(d, lockEpoch) || (d.drep !== null && d.since_epoch !== null && currentEpoch < lockEpoch);
  const enough = d.snapshot_ada >= MIN_PRIZE_ADA;
  const eligible_now = d.drep !== null && before && enough;
  let message: string;
  if (!d.drep) {
    message = `Playing for fun. To compete for Champion Cards and Season Trophies, delegate your wallet's vote with at least ${MIN_PRIZE_ADA} ADA before epoch ${lockEpoch}. Any DRep counts, or Abstain.`;
  } else if (!before) {
    message = `Playing for fun this season: your delegation started in epoch ${d.since_epoch}, after this season's roster lock (epoch ${lockEpoch}). You'll be eligible next season.`;
  } else if (!enough) {
    message = `Almost: ${Math.floor(d.snapshot_ada)} ADA counted in the latest snapshot. Hold at least ${MIN_PRIZE_ADA} ADA in this wallet through the season's end to compete for prizes. New ADA counts from the next epoch's snapshot.`;
  } else {
    message = `Eligible for prizes: delegated since epoch ${d.since_epoch} with ${Math.floor(d.snapshot_ada).toLocaleString()} ADA. Keep it delegated with ${MIN_PRIZE_ADA}+ ADA to the season's end.`;
  }
  return { delegation: d, lock_epoch: lockEpoch, eligible_now, message };
}
