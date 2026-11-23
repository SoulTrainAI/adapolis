'use client';

import { useState, useCallback } from 'react';
import { Search, Filter, X, ChevronDown } from 'lucide-react';

export interface FilterState {
  search: string;
  sort: string;
  order: 'asc' | 'desc';
  minParticipation: number;
  minAda: number;
  maxAda: number;
  /** active: registered, has voted, holds delegation. registered: all registered. all: retired too. */
  pool: 'active' | 'registered' | 'all';
}

interface FilterBarProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onSearch: (search: string) => void;
}

const SORT_OPTIONS = [
  { value: 'adjusted_govscore', label: 'GovScore (career)' },
  { value: 'season_points', label: 'Season points' },
  { value: 'projection', label: 'Projected points' },
  { value: 'raw_govscore', label: 'GovScore before ADA dampening' },
  { value: 'participation_rate', label: 'Participation %' },
  { value: 'amount_lovelace', label: 'ADA Delegated' },
  { value: 'delegator_count', label: 'Delegators' },
  { value: 'voting_streak_epochs', label: 'Voting Streak' },
];

export function FilterBar({ filters, onFiltersChange, onSearch }: FilterBarProps) {
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);

  const activeFilterCount = [
    filters.minParticipation > 0 ? 1 : 0,
    filters.minAda > 0 ? 1 : 0,
    filters.maxAda < 999999999 ? 1 : 0,
    filters.pool !== 'active' ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const handleSearchChange = useCallback((value: string) => {
    onFiltersChange({ ...filters, search: value });
    onSearch(value);
  }, [filters, onFiltersChange, onSearch]);

  const handleSortChange = (value: string) => {
    onFiltersChange({ ...filters, sort: value });
    setSortDropdownOpen(false);
  };

  const handleParticipationChange = (value: number) => {
    onFiltersChange({ ...filters, minParticipation: value });
  };

  const handleAdaRangeChange = (minAda: number, maxAda: number) => {
    onFiltersChange({ ...filters, minAda, maxAda });
  };

  const handlePoolChange = (value: FilterState['pool']) => {
    onFiltersChange({ ...filters, pool: value });
  };

  const handleOrderToggle = () => {
    onFiltersChange({ ...filters, order: filters.order === 'asc' ? 'desc' : 'asc' });
  };

  const handleReset = () => {
    const resetFilters: FilterState = {
      search: '',
      sort: 'adjusted_govscore',
      order: 'desc',
      minParticipation: 0,
      minAda: 0,
      maxAda: 999999999,
      pool: 'active',
    };
    onFiltersChange(resetFilters);
    onSearch('');
    setShowFiltersPanel(false);
  };

  const currentSortLabel = SORT_OPTIONS.find(o => o.value === filters.sort)?.label || 'GovScore (career)';

  return (
    <div className="mb-6">
      {/* Desktop: Search + Sort + Filters in one row */}
      <div className="hidden sm:flex gap-3 items-center">
        {/* Search input */}
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search by DRep ID or name..."
            value={filters.search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded text-slate-100 placeholder-slate-500 focus:border-slate-500 focus:outline-none transition-colors"
          />
        </div>

        {/* Sort dropdown */}
        <div className="relative w-48">
          <button
            onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-200 text-sm flex items-center justify-between hover:border-slate-600 transition-colors"
          >
            <span><span className="text-slate-400">Rank by:</span> {currentSortLabel}</span>
            <ChevronDown size={16} className={sortDropdownOpen ? 'rotate-180' : ''} />
          </button>

          {sortDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-slate-700 border border-slate-600 rounded shadow-lg z-20">
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleSortChange(option.value)}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                    filters.sort === option.value
                      ? 'bg-slate-600 text-slate-100 font-semibold'
                      : 'text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Filters button */}
        <button
          onClick={() => setShowFiltersPanel(!showFiltersPanel)}
          className="px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-200 text-sm flex items-center gap-2 hover:border-slate-600 transition-colors relative"
        >
          <Filter size={16} />
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 bg-slate-600 text-slate-100 text-xs font-semibold rounded-full">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Mobile: Full width search + Sort + Filters row */}
      <div className="sm:hidden space-y-3">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search DRep..."
            value={filters.search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded text-slate-100 placeholder-slate-500 focus:border-slate-500 focus:outline-none transition-colors"
          />
        </div>

        <div className="flex gap-2">
          <div className="flex-1 relative">
            <button
              onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-200 text-sm flex items-center justify-between hover:border-slate-600 transition-colors"
            >
              <span className="truncate">{currentSortLabel}</span>
              <ChevronDown size={16} className={sortDropdownOpen ? 'rotate-180' : ''} />
            </button>

            {sortDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-slate-700 border border-slate-600 rounded shadow-lg z-20 max-h-48 overflow-y-auto">
                {SORT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleSortChange(option.value)}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                      filters.sort === option.value
                        ? 'bg-slate-600 text-slate-100 font-semibold'
                        : 'text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => setShowFiltersPanel(!showFiltersPanel)}
            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-200 text-sm flex items-center gap-2 hover:border-slate-600 transition-colors relative"
          >
            <Filter size={16} />
            {activeFilterCount > 0 && (
              <span className="px-1.5 py-0.5 bg-slate-600 text-slate-100 text-xs font-semibold rounded-full">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Active filter chips */}
      {activeFilterCount > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {filters.minParticipation > 0 && (
            <div className="px-3 py-1 bg-slate-700 text-slate-200 text-xs rounded-full flex items-center gap-2">
              <span>Participation: {filters.minParticipation}%+</span>
              <button
                onClick={() => handleParticipationChange(0)}
                className="text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          )}
          {filters.minAda > 0 && (
            <div className="px-3 py-1 bg-slate-700 text-slate-200 text-xs rounded-full flex items-center gap-2">
              <span>Min ADA: {filters.minAda}M</span>
              <button
                onClick={() => handleAdaRangeChange(0, filters.maxAda)}
                className="text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          )}
          {filters.maxAda < 999999999 && (
            <div className="px-3 py-1 bg-slate-700 text-slate-200 text-xs rounded-full flex items-center gap-2">
              <span>Max ADA: {filters.maxAda}M</span>
              <button
                onClick={() => handleAdaRangeChange(filters.minAda, 999999999)}
                className="text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          )}
          {filters.pool !== 'active' && (
            <div className="px-3 py-1 bg-slate-700 text-slate-200 text-xs rounded-full flex items-center gap-2">
              <span>{filters.pool === 'all' ? 'Including retired' : 'All registered'}</span>
              <button
                onClick={() => handlePoolChange('active')}
                className="text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          )}
          <button
            onClick={handleReset}
            className="px-3 py-1 text-slate-400 hover:text-slate-200 text-xs transition-colors underline"
          >
            Reset all
          </button>
        </div>
      )}

      {/* Filter panel */}
      {showFiltersPanel && (
        <div className="mt-4 p-4 bg-slate-800 border border-slate-700 rounded space-y-4">
          {/* Participation threshold */}
          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-2">
              Participation Threshold: {filters.minParticipation}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={filters.minParticipation}
              onChange={(e) => handleParticipationChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <div className="mt-1 flex gap-2 text-xs text-slate-400">
              <span>0%</span>
              <span className="flex-1 text-right">100%</span>
            </div>
          </div>

          {/* ADA range */}
          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-2">ADA Delegated Range (Millions)</label>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Min ADA"
                value={filters.minAda || ''}
                onChange={(e) => handleAdaRangeChange(parseFloat(e.target.value) || 0, filters.maxAda)}
                className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-200 text-sm placeholder-slate-500 focus:border-slate-500 focus:outline-none"
              />
              <input
                type="number"
                placeholder="Max ADA"
                value={filters.maxAda === 999999999 ? '' : filters.maxAda}
                onChange={(e) => handleAdaRangeChange(filters.minAda, parseFloat(e.target.value) || 999999999)}
                className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-200 text-sm placeholder-slate-500 focus:border-slate-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Which DReps count */}
          <div>
            <label htmlFor="pool" className="block text-sm font-semibold text-slate-200 mb-2">Show</label>
            <select
              id="pool"
              value={filters.pool}
              onChange={(e) => handlePoolChange(e.target.value as FilterState['pool'])}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-200 text-sm"
            >
              <option value="active">Active DReps (have voted and hold delegation)</option>
              <option value="registered">All registered DReps</option>
              <option value="all">Everyone, including retired</option>
            </select>
          </div>

          {/* Sort order toggle */}
          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-2">Sort Order</label>
            <div className="flex gap-2">
              <button
                onClick={() => handleOrderToggle()}
                className={`flex-1 px-3 py-2 rounded text-sm font-semibold transition-colors ${
                  filters.order === 'desc'
                    ? 'bg-slate-600 text-slate-100'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                Highest First
              </button>
              <button
                onClick={() => handleOrderToggle()}
                className={`flex-1 px-3 py-2 rounded text-sm font-semibold transition-colors ${
                  filters.order === 'asc'
                    ? 'bg-slate-600 text-slate-100'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                Lowest First
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setShowFiltersPanel(false)}
              className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded transition-colors"
            >
              Apply Filters
            </button>
            <button
              onClick={handleReset}
              className="flex-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-semibold rounded transition-colors"
            >
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
