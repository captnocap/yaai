// =============================================================================
// MEMORY STREAM
// =============================================================================
// Live memory feed that shows relevant memories as user types.
// Scrollable list with click-to-inject functionality.

import React from 'react';
import { Brain, Loader2, ChevronDown } from 'lucide-react';
import { cn } from '../../../lib';
import { MemoryStreamItem } from './MemoryStreamItem';
import { useMemorySearch } from './useMemorySearch';
import type { MemoryResult } from '../../../types/memory';

// =============================================================================
// TYPES
// =============================================================================

export interface MemoryStreamProps {
  chatId: string | null;
  query: string;
  onSelect: (memory: MemoryResult) => void;
  attachedMemoryIds: string[];
  /** Horizontal strip layout instead of vertical list */
  horizontal?: boolean;
  className?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function MemoryStream({
  chatId,
  query,
  onSelect,
  attachedMemoryIds,
  horizontal = false,
  className,
}: MemoryStreamProps) {
  const { results, isSearching, error } = useMemorySearch(query, chatId);

  const hasQuery = query.length >= 3;
  const hasResults = results.length > 0;

  // Horizontal strip layout - compact inline display
  if (horizontal) {
    if (!hasResults && !isSearching) return null;

    return (
      <div
        className={cn(
          'flex items-center gap-2 px-2 py-1.5 rounded-lg',
          'bg-[var(--color-bg-secondary)] border border-[var(--color-border)]',
          className
        )}
      >
        <Brain size={12} className="text-[var(--color-text-tertiary)] flex-shrink-0" />

        {isSearching && (
          <Loader2 size={12} className="animate-spin text-[var(--color-accent)]" />
        )}

        {hasResults && (
          <div className="flex gap-1.5 overflow-x-auto custom-scrollbar py-0.5">
            {results.slice(0, 5).map((memory) => (
              <button
                key={memory.id}
                onClick={() => onSelect(memory)}
                className={cn(
                  'flex-shrink-0 px-2 py-1 rounded text-[11px]',
                  'border transition-colors',
                  attachedMemoryIds.includes(memory.id)
                    ? 'bg-[var(--color-accent-subtle)] border-[var(--color-accent)] text-[var(--color-accent)]'
                    : 'bg-[var(--color-bg)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-text)]'
                )}
              >
                {memory.content.slice(0, 40)}{memory.content.length > 40 ? '...' : ''}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Vertical list layout (original)
  return (
    <div
      className={cn(
        'flex flex-col rounded-lg',
        'border border-[var(--color-border)]',
        'bg-[var(--color-bg-secondary)]',
        'overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--color-border)] bg-[var(--color-bg)]">
        <Brain size={14} className="text-[var(--color-text-tertiary)]" />
        <span className="text-xs font-medium text-[var(--color-text-secondary)]">
          Memory Stream
        </span>
        {isSearching && (
          <Loader2 size={12} className="animate-spin text-[var(--color-accent)] ml-auto" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar" style={{ maxHeight: '180px' }}>
        {/* Empty state - no query */}
        {!hasQuery && !hasResults && (
          <div className="px-3 py-4 text-center">
            <p className="text-[11px] text-[var(--color-text-tertiary)] italic">
              Type to search memories...
            </p>
          </div>
        )}

        {/* Searching state */}
        {hasQuery && isSearching && !hasResults && (
          <div className="px-3 py-4 text-center">
            <p className="text-[11px] text-[var(--color-text-tertiary)]">
              Searching memories...
            </p>
          </div>
        )}

        {/* No results */}
        {hasQuery && !isSearching && !hasResults && !error && (
          <div className="px-3 py-4 text-center">
            <p className="text-[11px] text-[var(--color-text-tertiary)]">
              No matching memories
            </p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="px-3 py-4 text-center">
            <p className="text-[11px] text-red-400">
              {error}
            </p>
          </div>
        )}

        {/* Results */}
        {hasResults && (
          <div className="p-1 space-y-0.5">
            {results.map((memory) => (
              <MemoryStreamItem
                key={memory.id}
                memory={memory}
                onClick={() => onSelect(memory)}
                isAttached={attachedMemoryIds.includes(memory.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer - expand link */}
      {hasResults && (
        <button
          className={cn(
            'flex items-center justify-center gap-1 px-3 py-1.5',
            'border-t border-[var(--color-border)]',
            'text-[10px] text-[var(--color-text-tertiary)]',
            'hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)]',
            'transition-colors'
          )}
        >
          <ChevronDown size={10} />
          <span>expand full log</span>
        </button>
      )}
    </div>
  );
}
