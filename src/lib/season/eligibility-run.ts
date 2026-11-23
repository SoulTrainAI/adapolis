/**
 * Cron step: after a season's rosters lock, record which teams' wallets were
 * delegated since before the lock epoch. A few Koios calls per team, so it
 * works through them in batches across runs.
 */

import { supabaseAdmin } from '@/lib/sync/supabase-admin';
import { delegationOf, eligibleAtLock } from './eligibility';
import { liveSeason } from './fantasy';
import { isMissingSchema } from './schema';

const PER_RUN = 120;

export async function recordLockEligibility(): Promise<{ season: number | null; checked: number; eligible: number }> {
  const season = await liveSeason();
  if (!season) return { season: null, checked: 0, eligible: 0 };
  const { data, error } = await supabaseAdmin
    .from('fantasy_rosters')
    .select('roster_id, stake_address')
    .eq('season_number', season.season_number)
    .is('eligible_at_lock', null)
    .limit(PER_RUN);
  if (error) {
    if (isMissingSchema(error)) throw new Error('Prize eligibility needs supabase/migrations/016_prize_eligibility.sql.');
    throw new Error(`Couldn't load teams to check: ${error.message}`);
  }
  let eligible = 0;
  for (const r of data ?? []) {
    const ok = eligibleAtLock(await delegationOf(r.stake_address as string), season.start_epoch);
    if (ok) eligible++;
    const { error: updateError } = await supabaseAdmin.from('fantasy_rosters').update({ eligible_at_lock: ok }).eq('roster_id', r.roster_id);
    if (updateError) throw new Error(`Couldn't record eligibility: ${updateError.message}`);
  }
  return { season: season.season_number, checked: (data ?? []).length, eligible };
}
