/**
 * Scoreboard Page
 * Server-rendered page showing all DReps ranked by adjusted_govscore
 */

import { supabaseAdmin } from '@/lib/sync/supabase-admin';
import { DRepCard } from '@/components/scoreboard/DRepCard';

interface DRepScore {
  drep_id: string;
  hex_id: string | null;
  is_registered: boolean;
  amount_lovelace: bigint | null;
  delegator_count: number | null;
  raw_govscore: number | null;
  adjusted_govscore: number | null;
  participation_rate: number | null;
  epoch: number;
}

async function getDRepScoresForCurrentEpoch(): Promise<{
  dreps: DRepScore[];
  currentEpoch: number;
  lastSyncedAt: string | null;
}> {
  // Get the latest epoch from drep_scores
  const { data: latestEpochData } = await supabaseAdmin
    .from('drep_scores')
    .select('epoch')
    .order('epoch', { ascending: false })
    .limit(1);

  const currentEpoch = latestEpochData?.[0]?.epoch || 0;

  // Get latest sync time
  const { data: syncState } = await supabaseAdmin
    .from('sync_state')
    .select('last_synced_at')
    .eq('entity', 'scores')
    .single();

  // Fetch all DReps with their latest scores for current epoch
  const { data: scores, error } = await supabaseAdmin
    .from('drep_scores')
    .select(
      `
      epoch,
      drep_id,
      raw_govscore,
      adjusted_govscore,
      participation_rate,
      dreps(
        hex_id,
        is_registered,
        amount_lovelace,
        delegator_count
      )
    `
    )
    .eq('epoch', currentEpoch)
    .order('adjusted_govscore', { ascending: false });

  if (error) {
    console.error('Failed to fetch scores:', error);
    return { dreps: [], currentEpoch, lastSyncedAt: syncState?.last_synced_at || null };
  }

  // Map results to DRepScore type
  const dreps: DRepScore[] = (scores || []).map((row) => {
    const drepData = row.dreps as {
      hex_id?: string | null;
      is_registered?: boolean;
      amount_lovelace?: bigint | null;
      delegator_count?: number | null;
    } | null;

    return {
      drep_id: row.drep_id,
      hex_id: drepData?.hex_id || null,
      is_registered: drepData?.is_registered || false,
      amount_lovelace: drepData?.amount_lovelace || null,
      delegator_count: drepData?.delegator_count || null,
      raw_govscore: row.raw_govscore,
      adjusted_govscore: row.adjusted_govscore,
      participation_rate: row.participation_rate,
      epoch: row.epoch,
    };
  });

  return { dreps, currentEpoch, lastSyncedAt: syncState?.last_synced_at || null };
}

function formatADA(lovelace: bigint | null): string {
  if (!lovelace || lovelace === BigInt(0)) return '0 ADA';

  const ada = Number(lovelace) / 1_000_000_000_000;

  if (ada >= 1_000_000) {
    return `${(ada / 1_000_000).toFixed(1)}M ADA`;
  }
  if (ada >= 1_000) {
    return `${(ada / 1_000).toFixed(1)}K ADA`;
  }
  return `${ada.toFixed(1)} ADA`;
}

function formatTime(isoString: string | null): string {
  if (!isoString) return 'Never';

  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

export default async function ScoreboardPage() {
  const { dreps, currentEpoch, lastSyncedAt } = await getDRepScoresForCurrentEpoch();

  const truncateDRepId = (id: string) => id.substring(0, 16) + '...';

  return (
    <div className="min-h-screen bg-slate-950 text-white py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-5xl font-bold mb-3">DRep Scoreboard</h1>
          <p className="text-lg text-slate-300 mb-4">
            Live ranking of every Cardano DRep, scored on participation and adjusted for ADA-power dampening.
          </p>

          {/* Meta info */}
          <div className="flex flex-wrap gap-4 text-sm text-slate-400">
            <div>
              <span className="text-slate-300">Current Epoch:</span> {currentEpoch}
            </div>
            <div>
              <span className="text-slate-300">Updated:</span> {formatTime(lastSyncedAt)}
            </div>
          </div>
        </div>

        {/* Empty state */}
        {dreps.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-400">No DReps scored yet. Run the sync job to populate scores.</p>
          </div>
        )}

        {/* Scoreboard grid with flip-cards */}
        {dreps.length > 0 && (
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 auto-rows-max">
            {dreps.map((drep, index) => {
              const rank = index + 1;
              return (
                <DRepCard
                  key={drep.drep_id}
                  props={{
                    rank,
                    drepId: drep.drep_id,
                    displayName: drep.hex_id ? drep.hex_id : truncateDRepId(drep.drep_id),
                    adjustedScore: drep.adjusted_govscore,
                    rawScore: drep.raw_govscore,
                    participationRate: drep.participation_rate,
                    adaAmount: formatADA(drep.amount_lovelace),
                    delegatorCount: drep.delegator_count,
                    isRegistered: drep.is_registered,
                    votingStreak: 0,
                  }}
                />
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 border-t border-slate-800 pt-6 text-sm text-slate-400">
          <div className="flex flex-wrap gap-6">
            <a href="#methodology" className="hover:text-slate-300 transition-colors">
              Methodology
            </a>
            <a href="#open-data" className="hover:text-slate-300 transition-colors">
              Open Data
            </a>
            <a href="#api" className="hover:text-slate-300 transition-colors">
              API
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
