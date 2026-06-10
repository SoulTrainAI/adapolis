/**
 * GET /api/dreps
 * Fetch paginated, filtered, sorted DRep scores
 * Accepts query parameters for filtering, sorting, and pagination
 * No auth required (public data)
 */

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

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
  epoch: number;
}

interface DRepResponse {
  dreps: DRepScoreRow[];
  total: number;
  page: number;
  total_pages: number;
  epoch: number;
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
    const search = searchParams.get('search')?.trim() || '';
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

    // Step 2: Build query for drep_scores + dreps join
    let query = supabase
      .from('drep_scores')
      .select(
        `
        epoch,
        drep_id,
        raw_govscore,
        adjusted_govscore,
        participation_rate,
        voting_streak_epochs,
        dreps (
          hex_id,
          is_registered,
          amount_lovelace,
          delegator_count
        )
      `,
        { count: 'exact' }
      )
      .eq('epoch', currentEpoch);

    // Apply filters
    if (registered) {
      query = query.eq('dreps.is_registered', true);
    }

    if (minParticipation > 0) {
      query = query.gte('participation_rate', minParticipation / 100);
    }

    // Convert ADA to lovelace (millions of ADA * 1M lovelace per ADA)
    const minLovelace = BigInt(Math.floor(minAda * 1_000_000_000_000));
    const maxLovelace = BigInt(Math.floor(maxAda * 1_000_000_000_000));

    if (minAda > 0) {
      query = query.gte('dreps.amount_lovelace', minLovelace.toString());
    }

    if (maxAda < 999999999) {
      query = query.lte('dreps.amount_lovelace', maxLovelace.toString());
    }

    // Apply search (DRep ID or hex ID prefix matching)
    if (search) {
      const searchLower = search.toLowerCase();
      query = query.or(
        `drep_id.ilike.%${searchLower}%,dreps.hex_id.ilike.%${searchLower}%`
      );
    }

    // Apply sorting and pagination
    query = query.order(sort, { ascending: order === 'asc' });
    const offset = (page - 1) * perPage;
    query = query.range(offset, offset + perPage - 1);

    const { data: scores, count, error: queryError } = await query;

    if (queryError) {
      console.error('Supabase query error:', queryError);
      return NextResponse.json({ error: 'Failed to fetch DRep scores' }, { status: 500 });
    }

    // Step 3: Flatten response (Supabase returns nested data)
    const dreps: DRepScoreRow[] = (scores || []).map((score: unknown) => {
      const row = score as {
        epoch: number;
        drep_id: string;
        raw_govscore: number | null;
        adjusted_govscore: number | null;
        participation_rate: number | null;
        voting_streak_epochs: number | null;
        dreps: {
          hex_id: string | null;
          is_registered: boolean;
          amount_lovelace: bigint | null;
          delegator_count: number | null;
        };
      };

      return {
        epoch: row.epoch,
        drep_id: row.drep_id,
        hex_id: row.dreps.hex_id,
        is_registered: row.dreps.is_registered,
        amount_lovelace: row.dreps.amount_lovelace,
        delegator_count: row.dreps.delegator_count,
        raw_govscore: row.raw_govscore,
        adjusted_govscore: row.adjusted_govscore,
        participation_rate: row.participation_rate,
        voting_streak_epochs: row.voting_streak_epochs,
      };
    });

    const total = count || 0;
    const totalPages = Math.ceil(total / perPage);

    return NextResponse.json({
      dreps,
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
