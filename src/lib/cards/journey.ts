/**
 * A DRep's journey over recent seasons: the four card stats (Power, Stamina,
 * XP, Charisma) at the end of each season, for the card-back chart.
 *
 * Stamina and XP come from our own vote data. Power comes from Koios's
 * per-epoch voting-power history. Koios keeps no delegator-count history, so
 * Charisma is estimated from when today's delegators delegated: people who
 * delegated and later left aren't counted, which understates earlier seasons.
 */

import { z } from 'zod';
import { koiosFetch } from '@/lib/koios/client';
import type { SeasonLine } from './types';

export const JOURNEY_SEASONS = 12;
const CACHE_MS = 6 * 60 * 60 * 1000;
const PAGE = 1000;
const MAX_DELEGATOR_PAGES = 20;

export interface JourneyPoint {
  label: string;
  end_epoch: number;
  /** ADA delegated at the season's end */
  power: number | null;
  /** Career participation at the season's end, 0–1 */
  stamina: number | null;
  /** Career votes at the season's end */
  xp: number;
  /** Estimated delegators at the season's end */
  charisma: number | null;
}

const PowerSchema = z.array(z.object({ epoch_no: z.number(), amount: z.string() }));
const DelegatorSchema = z.array(z.object({ epoch_no: z.number().nullable() }));

const cache = new Map<string, { at: number; value: Promise<{ power: Map<number, number>; delegatedAt: number[] } | null> }>();

async function fetchChainHistory(drepId: string): Promise<{ power: Map<number, number>; delegatedAt: number[] } | null> {
  try {
    const rawPower = await koiosFetch<unknown>(`/drep_voting_power_history?_drep_id=${drepId}&select=epoch_no,amount`, { method: 'GET' });
    const power = PowerSchema.parse(rawPower);
    const delegatedAt: number[] = [];
    for (let page = 0; page < MAX_DELEGATOR_PAGES; page++) {
      const raw = await koiosFetch<unknown>(`/drep_delegators?_drep_id=${drepId}&select=epoch_no&offset=${page * PAGE}&limit=${PAGE}`, { method: 'GET' });
      const rows = DelegatorSchema.parse(raw);
      for (const r of rows) if (r.epoch_no !== null) delegatedAt.push(r.epoch_no);
      if (rows.length < PAGE) break;
    }
    delegatedAt.sort((a, b) => a - b);
    return { power: new Map(power.map((p) => [p.epoch_no, Number(p.amount) / 1_000_000])), delegatedAt };
  } catch (error) {
    console.error(
      JSON.stringify({
        event: 'journey_koios_failed',
        drepId,
        error: error instanceof Error ? error.message : String(error),
        hint: 'Power and Charisma lines are left out until Koios answers; check https://api.koios.rest/ status.',
      })
    );
    return null;
  }
}

function chainHistory(drepId: string) {
  const hit = cache.get(drepId);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value;
  const value = fetchChainHistory(drepId);
  cache.set(drepId, { at: Date.now(), value });
  return value;
}

/** Latest known value at or before an epoch. */
function powerAt(power: Map<number, number>, epoch: number): number | null {
  for (let e = epoch; e > epoch - 12; e--) {
    const v = power.get(e);
    if (v !== undefined) return v;
  }
  return null;
}

export function buildJourney(
  seasons: SeasonLine[],
  chain: { power: Map<number, number>; delegatedAt: number[] } | null,
  currentEpoch: number
): JourneyPoint[] {
  return seasons.slice(-JOURNEY_SEASONS).map((s) => {
    const epoch = Math.min(s.end_epoch, currentEpoch);
    let charisma: number | null = null;
    if (chain) {
      charisma = 0;
      while (charisma < chain.delegatedAt.length && chain.delegatedAt[charisma] <= epoch) charisma++;
    }
    return {
      label: s.label,
      end_epoch: s.end_epoch,
      power: chain ? powerAt(chain.power, epoch) : null,
      stamina: s.participation_end,
      xp: s.career_votes_end,
      charisma,
    };
  });
}

export async function getJourney(drepId: string, seasons: SeasonLine[], currentEpoch: number): Promise<JourneyPoint[]> {
  return buildJourney(seasons, await chainHistory(drepId), currentEpoch);
}
