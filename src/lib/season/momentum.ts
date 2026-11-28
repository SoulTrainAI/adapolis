/**
 * Momentum (Jason, 2026-11-28): a Cardanathon bonus for DReps whose backing
 * grows. Each 1% growth in Power (ADA delegated) or Charisma (delegators) since
 * last season adds 1% to their season points, up to +20%:
 *
 *   bonus = min(20%, (Power growth % + Charisma growth %) ÷ 2)
 *
 * Guardrails, so it can't be bought cheaply:
 *  - Season averages, not end-of-season figures: a last-day boost is worth 1/6.
 *  - Growth is measured from at least 1M ADA and 50 delegators, so one friend
 *    can't max out a tiny DRep.
 *  - Charisma counts delegators with 100+ ADA (throwaway wallets don't count).
 *  - Delegation from a wallet to a DRep that wallet drafted is ignored.
 *  - Shrinking backing scores 0, never negative (no penalties).
 *  - A DRep needs at least 2 snapshot epochs last season to have a baseline;
 *    Charisma counts only epochs where delegators were counted.
 *
 * Live during the season, final when it ends. Never in GovScore. It never
 * looks at votes (Cardinal Rule); delegators choose freely.
 */

import { windowEpochs } from './points';

export const MOMENTUM = {
  maxBonus: 0.2,
  adaFloor: 1_000_000,
  delegatorFloor: 50,
  minBaselineEpochs: 2,
  minDelegatorAda: 100,
} as const;

export interface BackingSnapshot {
  drep_id: string;
  epoch: number;
  ada: number;
  /** All live delegators; null when not captured. */
  delegators: number | null;
  /** Delegators with 100+ ADA; null when not counted. */
  qualified: number | null;
}

export interface WalletSnapshot {
  stake_address: string;
  epoch: number;
  drep_id: string | null;
  ada: number;
}

export interface Momentum {
  /** Fraction added to season points (0.08 = +8%). */
  bonus: number;
  /** Power growth as a fraction (0.12 = +12%), floored at 0. */
  power: number;
  /** Charisma growth as a fraction; null when delegator counts aren't available for both seasons. */
  charisma: number | null;
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/** The wallet's delegation at an epoch: the latest snapshot up to it; before the first snapshot, the first one. */
function walletAt(snaps: WalletSnapshot[], epoch: number): WalletSnapshot | undefined {
  let later: WalletSnapshot | undefined;
  let earlier: WalletSnapshot | undefined;
  for (const s of snaps) {
    if (s.epoch === epoch) return s;
    if (s.epoch > epoch && (!later || s.epoch < later.epoch)) later = s;
    if (s.epoch < epoch && (!earlier || s.epoch > earlier.epoch)) earlier = s;
  }
  return earlier ?? later;
}

/**
 * Momentum for every DRep in `window`, compared with the window before.
 * `drafted` maps a team wallet to the DReps it drafted this season.
 */
export function momentumFor(
  snapshots: BackingSnapshot[],
  window: number,
  wallets: WalletSnapshot[] = [],
  drafted: Map<string, Set<string>> = new Map()
): Map<string, Momentum> {
  const cur = windowEpochs(window);
  const prev = windowEpochs(window - 1);
  const inCur = (e: number) => e >= cur.start && e <= cur.end;
  const inPrev = (e: number) => e >= prev.start && e <= prev.end;

  const walletsBy = new Map<string, WalletSnapshot[]>();
  for (const w of wallets) {
    if (!drafted.has(w.stake_address)) continue;
    const list = walletsBy.get(w.stake_address) ?? [];
    list.push(w);
    walletsBy.set(w.stake_address, list);
  }
  // What drafting wallets put behind each DRep at an epoch.
  const teamAt = (drepId: string, epoch: number) => {
    let ada = 0;
    let all = 0;
    let qualified = 0;
    walletsBy.forEach((snaps, address) => {
      if (!drafted.get(address)!.has(drepId)) return;
      const w = walletAt(snaps, epoch);
      if (!w || w.drep_id !== drepId) return;
      ada += w.ada;
      all++;
      if (w.ada >= MOMENTUM.minDelegatorAda) qualified++;
    });
    return { ada, all, qualified };
  };

  const byDRep = new Map<string, BackingSnapshot[]>();
  for (const s of snapshots) {
    if (!inCur(s.epoch) && !inPrev(s.epoch)) continue;
    const list = byDRep.get(s.drep_id) ?? [];
    list.push(s);
    byDRep.set(s.drep_id, list);
  }

  const out = new Map<string, Momentum>();
  byDRep.forEach((rows, drepId) => {
    const before = rows.filter((r) => inPrev(r.epoch));
    const now = rows.filter((r) => inCur(r.epoch));
    if (before.length < MOMENTUM.minBaselineEpochs || now.length === 0) return;
    const adjusted = rows.map((r) => {
      const t = teamAt(drepId, r.epoch);
      return {
        epoch: r.epoch,
        ada: Math.max(0, r.ada - t.ada),
        delegators: r.delegators === null ? null : Math.max(0, r.delegators - t.all),
        qualified: r.qualified === null ? null : Math.max(0, r.qualified - t.qualified),
      };
    });
    const a = adjusted.filter((r) => inPrev(r.epoch));
    const b = adjusted.filter((r) => inCur(r.epoch));

    const growth = (x: number, y: number, floor: number) => Math.max(0, (y - x) / Math.max(x, floor));
    const power = growth(mean(a.map((r) => r.ada)), mean(b.map((r) => r.ada)), MOMENTUM.adaFloor);

    // Prefer delegators with 100+ ADA; fall back to all delegators (DReps too large to count). Epochs without counts are skipped.
    const charismaFrom = (key: 'qualified' | 'delegators') => {
      const x = a.map((r) => r[key]).filter((v): v is number => v !== null);
      const y = b.map((r) => r[key]).filter((v): v is number => v !== null);
      return x.length >= MOMENTUM.minBaselineEpochs && y.length > 0 ? growth(mean(x), mean(y), MOMENTUM.delegatorFloor) : null;
    };
    const charisma = charismaFrom('qualified') ?? charismaFrom('delegators');

    const bonus = Math.min(MOMENTUM.maxBonus, (power + (charisma ?? 0)) / 2);
    out.set(drepId, { bonus: Math.round(bonus * 1000) / 1000, power: Math.round(power * 1000) / 1000, charisma: charisma === null ? null : Math.round(charisma * 1000) / 1000 });
  });
  return out;
}

/** Season points with Momentum applied. */
export function withMomentum(points: number, bonus: number | undefined): number {
  return bonus ? Math.round(points * (1 + bonus)) : points;
}
