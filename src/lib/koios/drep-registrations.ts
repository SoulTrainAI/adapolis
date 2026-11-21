/**
 * DRep registration periods from Koios /drep_updates
 * Each DRep has one or more [from, to] epoch periods during which it was
 * registered. A DRep that deregisters and later re-registers gets two periods.
 * @see https://api.koios.rest/#/Governance/drep_updates
 */

import { z } from 'zod';
import { koiosFetch } from './client';

const PAGE_SIZE = 1000;

// Mainnet Shelley era began at epoch 208 (unix 1596059091); epochs are 5 days.
const SHELLEY_START_EPOCH = 208;
const SHELLEY_START_UNIX = 1596059091;
const EPOCH_SECONDS = 432000;

export function blockTimeToEpoch(unixSeconds: number): number {
  return SHELLEY_START_EPOCH + Math.floor((unixSeconds - SHELLEY_START_UNIX) / EPOCH_SECONDS);
}

const DRepUpdateSchema = z.object({
  drep_id: z.string(),
  action: z.enum(['registered', 'updated', 'deregistered']),
  block_time: z.number().int(),
});

export interface RegistrationPeriod {
  from: number;
  /** null while the DRep is still registered */
  to: number | null;
}

export async function fetchDRepRegistrationPeriods(): Promise<Map<string, RegistrationPeriod[]>> {
  const events: Array<z.infer<typeof DRepUpdateSchema>> = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const raw = await koiosFetch<unknown>(
      `/drep_updates?select=drep_id,action,block_time&order=block_time.asc,drep_id.asc,action.desc&offset=${offset}&limit=${PAGE_SIZE}`,
      { method: 'GET' }
    );
    const parsed = z.array(DRepUpdateSchema).safeParse(raw);
    if (!parsed.success) {
      throw new Error(
        `Koios /drep_updates returned an unexpected shape at offset ${offset}: ${parsed.error.message}. Check https://api.koios.rest/#/Governance/drep_updates for schema changes.`
      );
    }
    events.push(...parsed.data);
    if (parsed.data.length < PAGE_SIZE) break;
  }

  const periods = new Map<string, RegistrationPeriod[]>();
  for (const e of events) {
    const list = periods.get(e.drep_id) ?? [];
    const open = list.length > 0 && list[list.length - 1].to === null ? list[list.length - 1] : null;
    const epoch = blockTimeToEpoch(e.block_time);
    if (e.action === 'registered' && !open) list.push({ from: epoch, to: null });
    if (e.action === 'deregistered' && open) open.to = epoch;
    periods.set(e.drep_id, list);
  }
  return periods;
}
