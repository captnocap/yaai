// =============================================================================
// SOURCE FEED
// =============================================================================
// Scrollable list of discovered sources with filtering and grouping.

import { useState, useMemo, useCallback } from 'react';
import { Search, Filter, ChevronDown } from 'lucide-react';
import type { Source, SourceState } from '../../../../shared/research-types';
import { SourceCard } from './SourceCard';
import { SourceCardSkeletonList } from './SourceCardSkeleton';

interface SourceFeedProps {
  sources: Source[];
  loading?: boolean;
  onApprove?: (sourceId: string) => void;
  onReject?: (sourceId: string) => void;
  onSourceClick?: (source: Source) => void;
}

type FilterMode = 'all' | 'pending' | 'reading' | 'complete' | 'rejected';

const filterOptions: { value: FilterMode; label: string; count?: (sources: Source[]) => number }[] = [
  { value: 'all', label: 'All Sources' },
  { value: 'pending', label: 'Pending', count: (s) => s.filter((x) => x.state === 'pending').length },
  { value: 'reading', label: 'Reading', count: (s) => s.filter((x) => x.state === 'reading' || x.state === 'approved').length },
  { value: 'complete', label: 'Complete', count: (s) => s.filter((x) => x.state === 'complete').length },
  { value: 'rejected', label: 'Skipped', count: (s) => s.filter((x) => x.state === 'rejected').length },
];

export function SourceFeed({
  sources,
  loading = false,
  onApprove,
  onReject,
  onSourceClick,
}: SourceFeedProps) {
  const [filter, setFilter] = useState<FilterMode>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Filter sources based on current filter and search
  const filteredSources = useMemo(() => {
    let result = sources;

    // Apply state filter
    if (filter !== 'all') {
      if (filter === 'reading') {
        result = result.filter((s) => s.state === 'reading' || s.state === 'approved');
      } else {
        result = result.filter((s) => s.state === filter);
      }
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.title.toLowerCase().includes(query) ||
          s.domain.toLowerCase().includes(query) ||
          s.snippet?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [sources, filter, searchQuery]);

  // Group sources by state for display
  const groupedSources = useMemo(() => {
    const groups: Record<string, Source[]> = {
      reading: [],
      pending: [],
      approved: [],
      complete: [],
      rejected: [],
      failed: [],
    };

    filteredSources.forEach((source) => {
      groups[source.state]?.push(source);
    });

    return groups;
  }, [filteredSources]);

  // Sort order: reading > pending > approved > complete > rejected > failed
  const sortedSources = useMemo(() => {
    return [
      ...groupedSources.reading,
      ...groupedSources.pending,
      ...groupedSources.approved,
      ...groupedSources.complete,
      ...groupedSources.rejected,
      ...groupedSources.failed,
    ];
  }, [groupedSources]);

  // Counts for filter badges
  const pendingCount = sources.filter((s) => s.state === 'pending').length;
  const readingCount = sources.filter((s) => s.state === 'reading' || s.state === 'approved').length;

  return (
    <div className="flex flex-col h-full">
      {/* Header with search and filters */}
      <div className="flex-shrink-0 p-3 border-b border-[var(--color-border)]">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search sources..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-[var(--color-bg-tertiary)] border border-transparent text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-border)] focus:outline-none transition-colors"
          />
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 mt-2 overflow-x-auto">
          {filterOptions.map((option) => {
            const count = option.count?.(sources);
            const isActive = filter === option.value;

            return (
              <button
                key={option.value}
                onClick={() => setFilter(option.value)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-[var(--color-accent)] text-white'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-tertiary)]'
                }`}
              >
                {option.label}
                {count !== undefined && count > 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                      isActive
                        ? 'bg-white/20'
                        : 'bg-[var(--color-bg-tertiary)]'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Source list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading && sources.length === 0 ? (
          <SourceCardSkeletonList count={5} />
        ) : sortedSources.length === 0 ? (
          <EmptyState filter={filter} searchQuery={searchQuery} />
        ) : (
          <>
            {/* Pending approval section */}
            {pendingCount > 0 && filter === 'all' && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-amber-400 uppercase tracking-wide">
                    Awaiting Review
                  </span>
                  <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-medium">
                    {pendingCount}
                  </span>
                </div>
                <div className="space-y-2">
                  {groupedSources.pending.map((source) => (
                    <SourceCard
                      key={source.id}
                      source={source}
                      onApprove={onApprove}
                      onReject={onReject}
                      onClick={onSourceClick}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Currently reading section */}
            {readingCount > 0 && filter === 'all' && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-purple-400 uppercase tracking-wide">
                    Reading
                  </span>
                  <span className="px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-[10px] font-medium animate-pulse">
                    {readingCount}
                  </span>
                </div>
                <div className="space-y-2">
                  {[...groupedSources.reading, ...groupedSources.approved].map((source) => (
                    <SourceCard
                      key={source.id}
                      source={source}
                      onApprove={onApprove}
                      onReject={onReject}
                      onClick={onSourceClick}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Completed section */}
            {groupedSources.complete.length > 0 && filter === 'all' && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-emerald-400 uppercase tracking-wide">
                    Extracted
                  </span>
                  <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-medium">
                    {groupedSources.complete.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {groupedSources.complete.map((source) => (
                    <SourceCard
                      key={source.id}
                      source={source}
                      onApprove={onApprove}
                      onReject={onReject}
                      onClick={onSourceClick}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Rejected section (collapsed by default) */}
            {groupedSources.rejected.length > 0 && filter === 'all' && (
              <CollapsibleSection
                title="Skipped"
                count={groupedSources.rejected.length}
                color="gray"
                defaultOpen={false}
              >
                {groupedSources.rejected.map((source) => (
                  <SourceCard
                    key={source.id}
                    source={source}
                    compact
                    onClick={onSourceClick}
                  />
                ))}
              </CollapsibleSection>
            )}

            {/* Filtered view (no grouping) */}
            {filter !== 'all' && (
              <div className="space-y-2">
                {sortedSources.map((source) => (
                  <SourceCard
                    key={source.id}
                    source={source}
                    onApprove={onApprove}
                    onReject={onReject}
                    onClick={onSourceClick}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// SUB-COMPONENTS
// -----------------------------------------------------------------------------

function EmptyState({ filter, searchQuery }: { filter: FilterMode; searchQuery: string }) {
  if (searchQuery) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Search className="w-10 h-10 text-[var(--color-text-tertiary)] mb-3" />
        <p className="text-sm text-[var(--color-text-secondary)]">
          No sources matching "{searchQuery}"
        </p>
      </div>
    );
  }

  const messages: Record<FilterMode, { title: string; subtitle: string }> = {
    all: {
      title: 'No sources yet',
      subtitle: 'Sources will appear here as scouts discover them',
    },
    pending: {
      title: 'No pending sources',
      subtitle: 'All sources have been reviewed',
    },
    reading: {
      title: 'Nothing being read',
      subtitle: 'Approve pending sources to start reading',
    },
    complete: {
      title: 'No completed sources',
      subtitle: 'Sources will appear here after being read',
    },
    rejected: {
      title: 'No skipped sources',
      subtitle: 'Rejected sources will appear here',
    },
  };

  const msg = messages[filter];

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <p className="text-sm font-medium text-[var(--color-text-secondary)]">
        {msg.title}
      </p>
      <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
        {msg.subtitle}
      </p>
    </div>
  );
}

function CollapsibleSection({
  title,
  count,
  color,
  defaultOpen = true,
  children,
}: {
  title: string;
  count: number;
  color: 'gray' | 'amber' | 'purple' | 'emerald';
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const colorClasses = {
    gray: 'text-gray-400 bg-gray-500/20',
    amber: 'text-amber-400 bg-amber-500/20',
    purple: 'text-purple-400 bg-purple-500/20',
    emerald: 'text-emerald-400 bg-emerald-500/20',
  };

  return (
    <div className="mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 mb-2 w-full group"
      >
        <ChevronDown
          className={`w-4 h-4 text-[var(--color-text-tertiary)] transition-transform ${
            isOpen ? '' : '-rotate-90'
          }`}
        />
        <span className={`text-xs font-medium uppercase tracking-wide ${colorClasses[color].split(' ')[0]}`}>
          {title}
        </span>
        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${colorClasses[color]}`}>
          {count}
        </span>
      </button>
      {isOpen && <div className="space-y-2">{children}</div>}
    </div>
  );
}

export default SourceFeed;
