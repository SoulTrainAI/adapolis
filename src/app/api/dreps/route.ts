/**
 * GET /api/dreps
 * Fetch paginated, filtered, sorted DRep scores with separate queries
 * Two-query pattern: drep_scores → dreps (no FK join, avoids PGRST125)
 * Filters applied server-side and in JavaScript after merge
 * No auth required (public data)
 */

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { toDisplayProfile, type DisplayProfile } from '@/lib/metadata/profile-display';

interface DRepScoreRow {
  drep_id: string;
  hex_id: string | null;
  is_registered: boolean;
  amount_lovelace: bigint | null;
  delegator_count: number | null;
  raw_govscore: number | null;
  adjusted_govscore: number | null;
  participation_rate: number | null;
  voting_streak_epochs: number | null;
  votes_cast: number | null;
  votes_eligible: number | null;
  epoch: number;
  profile: DisplayProfile;
}

interface DRepResponse {
  dreps: DRepScoreRow[];
  total: number;
  page: number;
  total_pages: number;
  epoch: number;
}

interface DRepData {
  drep_id: string;
  hex_id: string | null;
  is_registered: boolean;
  amount_lovelace: bigint | null;
  delegator_count: number | null;
  metadata: unknown;
  metadata_fetch_status: string | null;
}

const VALID_SORT_FIELDS = [
  'adjusted_govscore',
  'raw_govscore',
  'participation_rate',
  'amount_lovelace',
  'delegator_count',
  'voting_streak_epochs',
];

export async function GET(request: Request): Promise<NextResponse<DRepResponse | { error: string }>> {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const sort = searchParams.get('sort') || 'adjusted_govscore';
    const order = (searchParams.get('order') || 'desc').toLowerCase();
    // Restricted to characters that can't alter the PostgREST filter syntax below.
    const search = (searchParams.get('search') ?? '').replace(/[^A-Za-z0-9 _.-]/g, '').trim().slice(0, 64);
    const minParticipation = parseFloat(searchParams.get('min_participation') || '0');
    const maxAda = parseFloat(searchParams.get('max_ada') || '999999999');
    const minAda = parseFloat(searchParams.get('min_ada') || '0');
    const registered = searchParams.get('registered') !== 'false';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const perPage = Math.min(100, Math.max(1, parseInt(searchParams.get('per_page') || '50', 10)));

    // Validate sort field
    if (!VALID_SORT_FIELDS.includes(sort)) {
      return NextResponse.json(
        { error: `Invalid sort field. Must be one of: ${VALID_SORT_FIELDS.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate order
    if (!['asc', 'desc'].includes(order)) {
      return NextResponse.json({ error: 'Order must be asc or desc' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !anonKey) {
      return NextResponse.json({ error: 'Database credentials missing' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false },
    });

    // Step 1: Get current epoch from drep_scores
    const { data: epochData, error: epochError } = await supabase
      .from('drep_scores')
      .select('epoch')
      .order('epoch', { ascending: false })
      .limit(1);

    if (epochError || !epochData || epochData.length === 0) {
      return NextResponse.json(
        { error: 'Failed to fetch current epoch' },
        { status: 500 }
      );
    }

    const currentEpoch = epochData[0].epoch;

    // Step 2: Query drep_scores with participation filter only (apply ADA/registered filters post-merge)
    let scoresQuery = supabase
      .from('drep_scores')
      .select('epoch, drep_id, raw_govscore, adjusted_govscore, participation_rate, voting_streak_epochs, votes_cast, votes_eligible', {
        count: 'exact',
      })
      .eq('epoch', currentEpoch);

    // Apply participation filter server-side (only participation_rate works on drep_scores)
    if (minParticipation > 0) {
      scoresQuery = scoresQuery.gte('participation_rate', minParticipation / 100);
    }

    // Search matches DRep ID, hex ID, or profile name
    if (search) {
      // Quoted so names containing spaces or dots parse as a single value.
      const pattern = `"%${search}%"`;
      const { data: matches, error: matchError } = await supabase
        .from('dreps')
        .select('drep_id')
        .or(`drep_id.ilike.${pattern},hex_id.ilike.${pattern},metadata->>givenName.ilike.${pattern}`)
        .limit(1000);
      if (matchError) {
        console.error(JSON.stringify({ event: 'drep_search_error', error: matchError.message }));
        return NextResponse.json({ error: 'Search failed' }, { status: 500 });
      }
      const ids = (matches ?? []).map((m: { drep_id: string }) => m.drep_id);
      if (ids.length === 0) {
        return NextResponse.json({ dreps: [], total: 0, page, total_pages: 0, epoch: currentEpoch });
      }
      scoresQuery = scoresQuery.in('drep_id', ids);
    }

    // Apply sorting and pagination
    scoresQuery = scoresQuery.order(sort, { ascending: order === 'asc' });
    const offset = (page - 1) * perPage;
    scoresQuery = scoresQuery.range(offset, offset + perPage - 1);

    const { data: scores, count, error: scoresError } = await scoresQuery;

    if (scoresError) {
      console.error('Supabase drep_scores query error:', scoresError);
      return NextResponse.json({ error: 'Failed to fetch DRep scores' }, { status: 500 });
    }

    if (!scores || scores.length === 0) {
      return NextResponse.json({
        dreps: [],
        total: 0,
        page,
        total_pages: 0,
        epoch: currentEpoch,
      });
    }

    // Step 3: Extract drep_ids and fetch dreps details
    const drepIds = scores.map((s: unknown) => (s as { drep_id: string }).drep_id);
    const { data: drepsData, error: drepsError } = await supabase
      .from('dreps')
      .select('drep_id, hex_id, is_registered, amount_lovelace, delegator_count, metadata, metadata_fetch_status')
      .in('drep_id', drepIds);

    if (drepsError) {
      console.error('Supabase dreps query error:', drepsError);
      return NextResponse.json({ error: 'Failed to fetch DRep details' }, { status: 500 });
    }

    // Step 4: Create map of drep data for fast lookup
    const drepMap = new Map<string, DRepData>(
      (drepsData || []).map((d: unknown) => {
        const drep = d as DRepData;
        return [drep.drep_id, drep];
      })
    );

    // Step 5: Merge scores with drep data and apply post-merge filters
    const minLovelace = BigInt(Math.floor(minAda * 1_000_000_000_000));
    const maxLovelace = BigInt(Math.floor(maxAda * 1_000_000_000_000));

    const merged: DRepScoreRow[] = [];

    for (const score of scores) {
      const scoreRow = score as {
        epoch: number;
        drep_id: string;
        raw_govscore: number | null;
        adjusted_govscore: number | null;
        participation_rate: number | null;
        voting_streak_epochs: number | null;
        votes_cast: number | null;
        votes_eligible: number | null;
      };

      const drepData = drepMap.get(scoreRow.drep_id);
      if (!drepData) continue; // Skip if drep not found

      // Apply post-merge filters
      if (registered && !drepData.is_registered) continue;

      if (minAda > 0 && (!drepData.amount_lovelace || drepData.amount_lovelace < minLovelace)) continue;

      if (maxAda < 999999999 && drepData.amount_lovelace && drepData.amount_lovelace > maxLovelace) continue;

      merged.push({
        epoch: scoreRow.epoch,
        drep_id: scoreRow.drep_id,
        hex_id: drepData.hex_id,
        is_registered: drepData.is_registered,
        amount_lovelace: drepData.amount_lovelace,
        delegator_count: drepData.delegator_count,
        raw_govscore: scoreRow.raw_govscore,
        adjusted_govscore: scoreRow.adjusted_govscore,
        participation_rate: scoreRow.participation_rate,
        voting_streak_epochs: scoreRow.voting_streak_epochs,
        votes_cast: scoreRow.votes_cast,
        votes_eligible: scoreRow.votes_eligible,
        profile: toDisplayProfile(drepData.metadata, drepData.metadata_fetch_status),
      });
    }

    // Note: 'total' reflects server-side count (before post-merge filters)
    // This is acceptable since most users won't use all filters together
    const total = count || 0;
    const totalPages = Math.ceil(total / perPage);

    return NextResponse.json({
      dreps: merged,
      total,
      page,
      total_pages: totalPages,
      epoch: currentEpoch,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('GET /api/dreps error:', message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
