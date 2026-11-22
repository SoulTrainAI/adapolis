import { z } from 'zod';
import { koiosFetch } from './client';

const AccountSchema = z.array(z.object({ stake_address: z.string(), delegated_drep: z.string().nullable() }));

/** The DRep a stake address delegates its vote to (drep1…, or drep_always_abstain / drep_always_no_confidence), or null. */
export async function lookupDelegation(stakeAddress: string): Promise<string | null> {
  const raw = await koiosFetch<unknown>('/account_info', { method: 'POST', body: { _stake_addresses: [stakeAddress] } });
  const parsed = AccountSchema.safeParse(raw);
  if (!parsed.success) throw new Error(`unexpected Koios /account_info shape: ${parsed.error.message}`);
  return parsed.data[0]?.delegated_drep ?? null;
}
