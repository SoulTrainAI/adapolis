/**
 * Scoreboard Page
 * Server-rendered page showing all DReps ranked by adjusted_govscore
 */

import { createClient } from '@supabase/supabase-js';
import { DRepCard } from '@/components/scoreboard/DRepCard';

export const revalidate = 300;

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
  voteSummary?: { yes: number; no: number; abstain: number };
  recentVotes?: Array<{ proposal_title: string; vote: string; proposal_id: string }>;
  bio?: string | null;
  socialLinks?: { website?: string; twitter?: string; github?: string; forum?: string };
}

interface ErrorState {
  dreps: null;
  currentEpoch: null;
  lastSyncedAt: null;
  error: string;
}

async function getDRepScoresForCurrentEpoch(): Promise<
  { dreps: DRepScore[]; currentEpoch: number; lastSyncedAt: string | null; error?: never } | ErrorState
> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return {
      dreps: null,
      currentEpoch: null,
      lastSyncedAt: null,
      error: 'Database credentials missing',
    };
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  try {
    // Query 1: Get the latest epoch from drep_scores
    const { data: latestEpochData, error: epochError } = await supabaseAdmin
      .from('drep_scores')
      .select('epoch')
      .order('epoch', { ascending: false })
      .limit(1);

    if (epochError) {
      throw new Error(`Failed to fetch latest epoch: ${epochError.message}`);
    }

    const currentEpoch = latestEpochData?.[0]?.epoch || 0;

    // Query 2: Get latest sync time (use dreps entity as proxy for overall sync status)
    const { data: syncStateArray } = await supabaseAdmin
      .from('sync_state')
      .select('last_synced_at')
      .eq('entity', 'dreps')
      .order('last_synced_at', { ascending: false })
      .limit(1);

    const syncState = syncStateArray?.[0];

    // Query 3: Fetch top 100 scores for current epoch
    const { data: scores, error: scoresError } = await supabaseAdmin
      .from('drep_scores')
      .select('epoch, drep_id, raw_govscore, adjusted_govscore, participation_rate')
      .eq('epoch', currentEpoch)
      .order('adjusted_govscore', { ascending: false })
      .limit(100);

    if (scoresError) {
      throw new Error(`Failed to fetch scores: ${scoresError.message}`);
    }

    if (!scores || scores.length === 0) {
      return { dreps: [], currentEpoch, lastSyncedAt: syncState?.last_synced_at || null };
    }

    // Query 4: Fetch DRep details by IDs (separate query to avoid PGRST125)
    const drepIds = scores.map((s) => s.drep_id);
    const { data: drepsData, error: drepsError } = await supabaseAdmin
      .from('dreps')
      .select('drep_id, hex_id, is_registered, amount_lovelace, delegator_count')
      .in('drep_id', drepIds);

    if (drepsError) {
      throw new Error(`Failed to fetch DRep details: ${drepsError.message}`);
    }

    // Query 5: Get vote summaries via database function (avoids 1,000-row PostgREST limit)
    interface VoteSummaryRow {
      drep_id: string;
      yes_count: number | bigint;
      no_count: number | bigint;
      abstain_count: number | bigint;
    }

    const { data: voteSummariesData, error: votesError } = await supabaseAdmin
      .rpc('get_vote_summaries', { drep_ids: drepIds });

    if (votesError) {
      console.warn('Failed to fetch vote summaries:', votesError.message);
    }

    // Build vote summary map from RPC result
    const voteSummaryMap = new Map<string, { yes: number; no: number; abstain: number }>();
    (voteSummariesData || []).forEach((row: unknown) => {
      const summary = row as VoteSummaryRow;
      voteSummaryMap.set(summary.drep_id, {
        yes: Number(summary.yes_count),
        no: Number(summary.no_count),
        abstain: Number(summary.abstain_count),
      });
    });

    // Query 5b: Fetch recent votes (limited to 300 rows)
    const { data: recentVotesData } = await supabaseAdmin
      .from('votes')
      .select('drep_id, vote, proposals(proposal_id, title)')
      .in('drep_id', drepIds)
      .order('block_time', { ascending: false })
      .limit(300);

    // Build recent votes map (keeping last 3 per DRep)
    const recentVotesMap = new Map<string, Array<{ proposal_title: string; vote: string; proposal_id: string }>>();
    (recentVotesData || []).forEach((voteData: unknown) => {
      const vote = voteData as { drep_id: string; vote: string; proposals: { title: string; proposal_id: string } | null };

      if (!recentVotesMap.has(vote.drep_id)) {
        recentVotesMap.set(vote.drep_id, []);
      }
      const recent = recentVotesMap.get(vote.drep_id)!;
      if (recent.length < 3) {
        recent.push({
          proposal_title: vote.proposals?.title || 'Untitled',
          vote: vote.vote,
          proposal_id: vote.proposals?.proposal_id || 'unknown',
        });
      }
    });

    // Create lookup map for DRep data
    const drepMap = new Map(
      (drepsData || []).map((d) => [
        d.drep_id,
        {
          hex_id: d.hex_id,
          is_registered: d.is_registered,
          amount_lovelace: d.amount_lovelace,
          delegator_count: d.delegator_count,
        },
      ])
    );

    // Merge scores with DRep data (preserving score order)
    const dreps: DRepScore[] = scores.map((score) => {
      const drepData = drepMap.get(score.drep_id) || {
        hex_id: null,
        is_registered: false,
        amount_lovelace: null,
        delegator_count: null,
      };

      return {
        drep_id: score.drep_id,
        hex_id: drepData.hex_id,
        is_registered: drepData.is_registered,
        amount_lovelace: drepData.amount_lovelace,
        delegator_count: drepData.delegator_count,
        raw_govscore: score.raw_govscore,
        adjusted_govscore: score.adjusted_govscore,
        participation_rate: score.participation_rate,
        epoch: score.epoch,
        voteSummary: voteSummaryMap.get(score.drep_id) || { yes: 0, no: 0, abstain: 0 },
        recentVotes: recentVotesMap.get(score.drep_id) || [],
        bio: null,
        socialLinks: {},
      };
    });

    return { dreps, currentEpoch, lastSyncedAt: syncState?.last_synced_at || null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Error fetching DRep scores:', message);
    return {
      dreps: null,
      currentEpoch: null,
      lastSyncedAt: null,
      error: `Failed to load scoreboard: ${message}`,
    };
  }
}

function formatADA(lovelace: bigint | null): string {
  if (!lovelace || lovelace === BigInt(0)) return '0 ADA';

  const ada = Number(lovelace) / 1_000_000;

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
  const result = await getDRepScoresForCurrentEpoch();

  const truncateDRepId = (id: string) => id.substring(0, 16) + '...';

  // Handle error state
  if ('error' in result && result.error) {
    return (
      <div className="min-h-screen bg-slate-950 text-white py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="rounded-lg border border-yellow-700/50 bg-yellow-900/20 p-6 text-center">
            <h2 className="text-2xl font-bold text-yellow-300 mb-2">Maintenance Mode</h2>
            <p className="text-yellow-200 mb-4">{result.error}</p>
            <p className="text-sm text-yellow-200/70">
              Please check back shortly. Our infrastructure team has been notified.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // TypeScript: result is guaranteed to have dreps, currentEpoch, lastSyncedAt after error check
  const { dreps, currentEpoch, lastSyncedAt } = result as {
    dreps: DRepScore[];
    currentEpoch: number;
    lastSyncedAt: string | null;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl font-bold mb-4">DRep Scoreboard</h1>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 w-full">
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
                    voteSummary: drep.voteSummary,
                    recentVotes: drep.recentVotes,
                    bio: drep.bio,
                    socialLinks: drep.socialLinks,
                  }}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
