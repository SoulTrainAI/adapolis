/**
 * Hot Topics: governance actions open for voting right now, with how DReps
 * are splitting, who has published reasons on each side, and the arguments
 * they made. Everything comes from on-chain votes and DRep-published
 * rationales; nothing is scraped from forums or social media.
 */

import { supabaseAdmin } from '@/lib/sync/supabase-admin';
import { fetchCurrentEpoch } from '@/lib/koios';
import { toDisplayProfile } from '@/lib/metadata/profile-display';
import { publicUrl } from '@/lib/utils/links';
import { loadProposalArguments, type ProposalArguments } from '@/lib/statements/proposal-arguments';

const DB_PAGE_SIZE = 1000;
const MAX_TOPICS = 12;
const VOCAL_PER_SIDE = 8;
const RECENT_MS = 10 * 24 * 60 * 60 * 1000;
const CACHE_TTL_MS = 60 * 60 * 1000;

type Side = 'yes' | 'no' | 'abstain';

export interface VocalDRep {
  drep_id: string;
  name: string | null;
  ada: number;
  rationale_url: string | null;
}

export interface Tally {
  count: Record<Side, number>;
  /** Current delegated ADA of the DReps voting each way */
  ada: Record<Side, number>;
}

export interface HotTopic {
  proposal_id: string;
  title: string;
  abstract: string;
  action_type: string;
  proposed_epoch: number | null;
  voting_ends_epoch: number | null;
  tally: Tally;
  /** Votes cast in the last 10 days; drives the ordering */
  recent_votes: number;
  rationales: number;
  vocal: Record<'yes' | 'no', VocalDRep[]>;
  arguments: ProposalArguments | null;
}

export interface HotTopicsData {
  computed_at: string;
  current_epoch: number;
  topics: HotTopic[];
}

interface ProposalRow {
  proposal_id: string;
  title: string | null;
  abstract: string | null;
  action_type: string;
  proposed_epoch: number | null;
  voting_ends_epoch: number | null;
}

interface VoteRow {
  drep_id: string;
  proposal_id: string;
  vote: string;
  rationale_url: string | null;
  block_time: string;
}

async function loadVotes(ids: string[]): Promise<VoteRow[]> {
  const rows: VoteRow[] = [];
  for (let from = 0; ; from += DB_PAGE_SIZE) {
    const { data, error } = await supabaseAdmin
      .from('votes')
      .select('drep_id, proposal_id, vote, rationale_url, block_time')
      .in('proposal_id', ids)
      .order('vote_id')
      .range(from, from + DB_PAGE_SIZE - 1);
    if (error) throw new Error(`Couldn't load votes for hot topics: ${error.message}. Check Supabase status and the votes table.`);
    rows.push(...((data ?? []) as VoteRow[]));
    if (!data || data.length < DB_PAGE_SIZE) return rows;
  }
}

function plainText(text: string): string {
  return text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*`#>]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function computeHotTopics(): Promise<HotTopicsData> {
  const currentEpoch = await fetchCurrentEpoch();
  const { data: proposalData, error } = await supabaseAdmin
    .from('proposals')
    .select('proposal_id, title, abstract, action_type, proposed_epoch, voting_ends_epoch')
    .eq('status', 'active');
  if (error) throw new Error(`Couldn't load active proposals: ${error.message}. Check Supabase status and the proposals table.`);
  const proposals = ((proposalData ?? []) as ProposalRow[]).filter(
    (p) => p.voting_ends_epoch === null || p.voting_ends_epoch >= currentEpoch
  );
  if (proposals.length === 0) return { computed_at: new Date().toISOString(), current_epoch: currentEpoch, topics: [] };

  const votes = await loadVotes(proposals.map((p) => p.proposal_id));
  const voterIds = Array.from(new Set(votes.map((v) => v.drep_id)));
  const dreps = new Map<string, { ada: number; name: string | null }>();
  for (let i = 0; i < voterIds.length; i += 200) {
    const { data } = await supabaseAdmin
      .from('dreps')
      .select('drep_id, amount_lovelace, metadata, metadata_fetch_status')
      .in('drep_id', voterIds.slice(i, i + 200));
    for (const d of data ?? []) {
      dreps.set(d.drep_id as string, {
        ada: Number(d.amount_lovelace ?? 0) / 1_000_000,
        name: toDisplayProfile(d.metadata, (d.metadata_fetch_status as string | null) ?? null).name,
      });
    }
  }

  const now = Date.now();
  const topics: HotTopic[] = proposals.map((p) => {
    const tally: Tally = { count: { yes: 0, no: 0, abstain: 0 }, ada: { yes: 0, no: 0, abstain: 0 } };
    const vocal: HotTopic['vocal'] = { yes: [], no: [] };
    let recent = 0;
    let rationales = 0;
    for (const v of votes) {
      if (v.proposal_id !== p.proposal_id) continue;
      const side = v.vote.toLowerCase() as Side;
      if (!(side in tally.count)) continue;
      const d = dreps.get(v.drep_id);
      tally.count[side]++;
      tally.ada[side] += d?.ada ?? 0;
      if (now - new Date(v.block_time).getTime() < RECENT_MS) recent++;
      if (v.rationale_url) {
        rationales++;
        if (side !== 'abstain') {
          vocal[side].push({ drep_id: v.drep_id, name: d?.name ?? null, ada: d?.ada ?? 0, rationale_url: publicUrl(v.rationale_url) });
        }
      }
    }
    for (const side of ['yes', 'no'] as const) {
      vocal[side] = vocal[side].sort((a, b) => b.ada - a.ada).slice(0, VOCAL_PER_SIDE);
    }
    return {
      proposal_id: p.proposal_id,
      title: plainText(p.title ?? '') || 'Untitled governance action',
      abstract: plainText(p.abstract ?? '').slice(0, 600),
      action_type: p.action_type,
      proposed_epoch: p.proposed_epoch,
      voting_ends_epoch: p.voting_ends_epoch,
      tally,
      recent_votes: recent,
      rationales,
      vocal,
      arguments: null,
    };
  });

  const top = topics
    .sort((a, b) => b.recent_votes + b.rationales - (a.recent_votes + a.rationales))
    .slice(0, MAX_TOPICS);
  const args = await loadProposalArguments(top.map((t) => t.proposal_id));
  for (const t of top) t.arguments = args.get(t.proposal_id) ?? null;

  return { computed_at: new Date().toISOString(), current_epoch: currentEpoch, topics: top };
}

let cache: { data: HotTopicsData; at: number } | null = null;
let inflight: Promise<HotTopicsData> | null = null;

export async function getHotTopics(options: { force?: boolean } = {}): Promise<HotTopicsData> {
  if (!options.force && cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.data;
  if (inflight) return inflight;
  inflight = computeHotTopics()
    .then((data) => {
      cache = { data, at: Date.now() };
      return data;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}
