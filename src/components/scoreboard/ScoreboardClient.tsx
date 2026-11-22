'use client';

import { useState, useEffect, useCallback } from 'react';
import { TradingCard } from '@/components/cards/TradingCard';
import { placeholderCard, useCards } from '@/components/cards/useCards';
import type { CardSummary } from '@/lib/cards/types';
import { FilterBar, FilterState } from './FilterBar';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DRepScore {
  drep_id: string;
  hex_id: string | null;
  is_registered: boolean;
  amount_lovelace: string | null;
  delegator_count: number | null;
  raw_govscore: number | null;
  adjusted_govscore: number | null;
  participation_rate: number | null;
  voting_streak_epochs: number | null;
  votes_cast: number | null;
  votes_eligible: number | null;
  epoch: number;
  profile: {
    name: string | null;
    image: string | null;
    bio: string | null;
    links: Array<{ label: string; url: string }>;
    doNotList: boolean;
  };
  vote_summary?: { yes: number; no: number; abstain: number };
}

interface ApiResponse {
  dreps: DRepScore[];
  total: number;
  page: number;
  total_pages: number;
  epoch: number;
}

interface ScoreboardClientProps {
  initialEpoch: number;
}

function SkeletonCard() {
  return (
    <div className="p-4 bg-slate-800 rounded-lg border border-slate-700 animate-pulse">
      <div className="h-8 bg-slate-700 rounded mb-3"></div>
      <div className="h-4 bg-slate-700 rounded mb-2"></div>
      <div className="h-4 bg-slate-700 rounded w-3/4"></div>
    </div>
  );
}

export function ScoreboardClient({ initialEpoch }: ScoreboardClientProps) {
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    sort: 'adjusted_govscore',
    order: 'desc',
    minParticipation: 0,
    minAda: 0,
    maxAda: 999999999,
    pool: 'active',
  });

  const [page, setPage] = useState(1);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { cards } = useCards();

  // Build query string from current filters and page
  const buildQueryString = useCallback(() => {
    const params = new URLSearchParams({
      sort: filters.sort,
      order: filters.order,
      page: page.toString(),
      per_page: '50',
      min_participation: filters.minParticipation.toString(),
      min_ada: filters.minAda.toString(),
      max_ada: filters.maxAda.toString(),
      pool: filters.pool,
    });

    if (filters.search) {
      params.set('search', filters.search);
    }

    return params.toString();
  }, [filters, page]);

  // Fetch data when filters or page changes
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const queryString = buildQueryString();
      const response = await fetch(`/api/dreps?${queryString}`);

      if (!response.ok) {
        throw new Error('Failed to fetch DReps');
      }

      const result: ApiResponse = await response.json();
      setData(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Error fetching DReps:', message);
    } finally {
      setLoading(false);
    }
  }, [buildQueryString]);

  // Fetch on mount and when filters/page changes
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset page to 1 when filters change (but not when only page changes)
  const handleFiltersChange = useCallback((newFilters: FilterState) => {
    setFilters(newFilters);
    setPage(1); // Reset to first page on filter change
  }, []);

  const handleSearch = useCallback(() => {
    // Search is already handled by handleFiltersChange via handleSearchChange
    // This callback is kept for interface compatibility
  }, []);

  // Pagination helpers
  const currentEpoch = data?.epoch || initialEpoch;
  const total = data?.total || 0;
  const totalPages = data?.total_pages || 1;
  const dreps = data?.dreps || [];
  const startIndex = (page - 1) * 50 + 1;
  const endIndex = Math.min(page * 50, total);

  return (
    <div className="w-full">
      {/* Filter bar */}
      <FilterBar filters={filters} onFiltersChange={handleFiltersChange} onSearch={handleSearch} />

      {/* Results info */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-2">
        <p className="text-slate-400 text-sm">
          {total > 0 ? `Showing ${startIndex}–${endIndex} of ${total.toLocaleString()} ${filters.pool === 'active' ? 'active ' : ''}DReps` : 'No DReps found'}
        </p>
        <p className="text-slate-500 text-sm">Epoch {currentEpoch}</p>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-red-700/50 bg-red-900/20 p-4 text-center mb-8">
          <p className="text-red-300">Error: {error}</p>
        </div>
      )}

      {/* Loading state: skeleton cards */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 mb-8">
          {Array.from({ length: 50 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && dreps.length === 0 && !error && (
        <div className="text-center py-12 mb-8">
          <p className="text-slate-400">No DReps match your filters. Try adjusting them.</p>
        </div>
      )}

      {/* Grid of DRep cards */}
      {!loading && dreps.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 mb-8 w-full">
          {dreps.map((drep) => (
            <TradingCard key={drep.drep_id} variant="scoreboard" card={cards.get(drep.drep_id) ?? rowCard(drep)} />
          ))}
        </div>
      )}

      {/* Pagination controls */}
      {!loading && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-slate-800">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed hover:border-slate-600 transition-colors flex items-center gap-2"
          >
            <ChevronLeft size={18} />
            Previous
          </button>

          <div className="flex items-center gap-3">
            <span className="text-slate-400 text-sm">Page {page} of {totalPages}</span>
            <input
              type="number"
              min="1"
              max={totalPages}
              value={page}
              onChange={(e) => {
                const newPage = parseInt(e.target.value, 10);
                if (newPage >= 1 && newPage <= totalPages) {
                  setPage(newPage);
                }
              }}
              className="w-16 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-slate-200 text-sm text-center focus:border-slate-500 focus:outline-none"
            />
          </div>

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed hover:border-slate-600 transition-colors flex items-center gap-2"
          >
            Next
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* Total DReps info */}
      <div className="mt-6 text-center text-slate-500 text-sm">
        {total.toLocaleString()} DReps ranked{filters.pool === 'active' ? ' · active means registered, has voted, and holds delegated ADA' : ''}
      </div>
    </div>
  );
}

/** Card from the scoreboard row alone, used until card stats load and for DReps they don't cover. */
function rowCard(d: DRepScore): CardSummary {
  return {
    ...placeholderCard({
      drep_id: d.drep_id,
      name: d.profile?.name ?? null,
      image: d.profile?.image ?? null,
      ada: Number(d.amount_lovelace ?? 0) / 1_000_000,
      delegators: d.delegator_count ?? 0,
      registered: d.is_registered,
      do_not_list: d.profile?.doNotList ?? false,
    }),
    govscore: d.adjusted_govscore,
    participation: d.participation_rate,
    votes_cast: d.votes_cast ?? 0,
    votes_eligible: d.votes_eligible ?? 0,
    streak: d.voting_streak_epochs ?? 0,
  };
}
