import { loadAll, proposalWindow } from '@/lib/scoring/govscore-v1';
import { blockTimeToEpoch, fetchDRepRegistrationPeriods } from '@/lib/koios/drep-registrations';
import { fetchCurrentEpoch } from '@/lib/koios';
import { toDisplayProfile, type DisplayProfile } from '@/lib/metadata/profile-display';
import {
  computeSeasonPoints,
  seasonNumber,
  windowEpochs,
  windowForEpoch,
  underdogMultipliers,
  type PointBreakdown,
} from './points';

export interface SeasonStanding {
  rank: number;
  drep_id: string;
  profile: DisplayProfile;
  points: number;
  breakdown: PointBreakdown;
  votes_cast: number;
  actions_missed: number;
  /** Points per epoch, for scoring a slot whose DRep was swapped mid-season. */
  by_epoch: Record<number, number>;
  underdog: number;
  amount_lovelace: number;
  delegator_count: number;
}

export interface SeasonData {
  computed_at: string;
  window: number;
  /** null while this window is a preview (Season 1 not launched yet). */
  season: number | null;
  start_epoch: number;
  end_epoch: number;
  current_epoch: number;
  standings: SeasonStanding[];
}

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const cache = new Map<string, { data: SeasonData; at: number }>();
const inflight = new Map<string, Promise<SeasonData>>();

async function computeSeason(requested: number | null): Promise<SeasonData> {
  const [currentEpoch, dreps, proposalRows, voteRows, periods] = await Promise.all([
    fetchCurrentEpoch(),
    loadAll<{
      drep_id: string;
      is_registered: boolean | null;
      amount_lovelace: number | string | null;
      delegator_count: number | null;
      metadata: unknown;
      metadata_fetch_status: string | null;
    }>('dreps', 'drep_id, is_registered, amount_lovelace, delegator_count, metadata, metadata_fetch_status'),
    loadAll<{
      proposal_id: string;
      proposed_epoch: number;
      status: string;
      ratified_epoch: number | null;
      expired_epoch: number | null;
      voting_ends_epoch: number | null;
    }>('proposals', 'proposal_id, proposed_epoch, status, ratified_epoch, expired_epoch, voting_ends_epoch'),
    loadAll<{
      drep_id: string;
      proposal_id: string;
      block_time: string;
      rationale_url: string | null;
      rationale_hash: string | null;
    }>('votes', 'drep_id, proposal_id, block_time, rationale_url, rationale_hash'),
    fetchDRepRegistrationPeriods(),
  ]);

  const window = requested ?? windowForEpoch(currentEpoch);
  const { start, end } = windowEpochs(window);
  const to = Math.min(end, currentEpoch);

  const proposals = proposalRows.map((p) => ({ ...proposalWindow(p), expiration: p.voting_ends_epoch }));
  const votes = voteRows.map((v) => ({
    drep_id: v.drep_id,
    proposal_id: v.proposal_id,
    epoch: blockTimeToEpoch(Math.floor(new Date(v.block_time).getTime() / 1000)),
    rationale_url: v.rationale_url,
    rationale_hash: v.rationale_hash,
  }));

  const registered = dreps.filter((d) => d.is_registered !== false);
  const points = computeSeasonPoints(
    registered.map((d) => d.drep_id),
    proposals,
    votes,
    periods,
    { from: start, to }
  );

  // Only DReps that took part this season are ranked, and the underdog scale is
  // relative to them, so long-inactive tiny DReps don't distort it.
  const active = points.filter((p) => p.votes_cast > 0);
  const byId = new Map(registered.map((d) => [d.drep_id, d]));
  const sizes = active.map((p) => {
    const d = byId.get(p.drep_id);
    return { drep_id: p.drep_id, amount_lovelace: Number(d?.amount_lovelace ?? 0), delegator_count: d?.delegator_count ?? 0 };
  });
  const underdog = underdogMultipliers(sizes);
  const sizeById = new Map(sizes.map((s) => [s.drep_id, s]));

  const standings = active
    .sort((a, b) => b.points - a.points || b.votes_cast - a.votes_cast)
    .map((p, i) => {
      const d = byId.get(p.drep_id);
      const s = sizeById.get(p.drep_id);
      return {
        rank: i + 1,
        drep_id: p.drep_id,
        profile: toDisplayProfile(d?.metadata ?? null, d?.metadata_fetch_status ?? null, p.drep_id),
        points: p.points,
        breakdown: p.breakdown,
        votes_cast: p.votes_cast,
        actions_missed: p.actions_missed,
        by_epoch: p.by_epoch,
        underdog: underdog.get(p.drep_id) ?? 1,
        amount_lovelace: s?.amount_lovelace ?? 0,
        delegator_count: s?.delegator_count ?? 0,
      };
    });

  return {
    computed_at: new Date().toISOString(),
    window,
    season: seasonNumber(window),
    start_epoch: start,
    end_epoch: end,
    current_epoch: currentEpoch,
    standings,
  };
}

/** Cached per season for 6 hours; the cron pipeline refreshes the current one. */
export async function getSeasonData(options: { window?: number; force?: boolean } = {}): Promise<SeasonData> {
  // Windows can be negative (before the grid start), so "current" gets its own key.
  const key = options.window === undefined ? 'current' : String(options.window);
  const hit = cache.get(key);
  if (!options.force && hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data;
  const running = inflight.get(key);
  if (running) return running;
  const p = computeSeason(options.window ?? null)
    .then((data) => {
      cache.set(key, { data, at: Date.now() });
      return data;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}
