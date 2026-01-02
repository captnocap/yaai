import React, { useRef, useEffect, useState } from 'react';
import { cn } from '../../lib';
import { TranscriptEntry, CompactMarker } from './transcript';
import type { TranscriptEntry as TranscriptEntryType, CompactMarkerData } from '../../types/code-session';

export interface CodeTranscriptProps {
  entries: TranscriptEntry[];
  isStreaming?: boolean;
  showCompactedMessages?: boolean;
  onRestorePointClick?: (restorePointId: string) => void;
  onPlanItemClick?: (planItemId: string) => void;
  className?: string;
}

export function CodeTranscript({
  entries,
  isStreaming = false,
  showCompactedMessages: initialShowCompacted = false,
  onRestorePointClick,
  onPlanItemClick,
  className,
}: CodeTranscriptProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showCompacted, setShowCompacted] = useState(initialShowCompacted);
  const [autoScroll, setAutoScroll] = useState(true);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [entries, autoScroll]);

  // Detect manual scroll to disable auto-scroll
  const handleScroll = () => {
    if (!containerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
    setAutoScroll(isAtBottom);
  };

  // Group entries by compact markers
  const groupedEntries = groupEntriesByCompact(entries);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={cn(
        'flex-1 overflow-y-auto',
        'scroll-smooth',
        className
      )}
    >
      {groupedEntries.map((group, groupIndex) => (
        <div key={groupIndex}>
          {/* Compacted entries section */}
          {group.compactedEntries.length > 0 && (
            <div className={cn(!showCompacted && 'hidden')}>
              {group.compactedEntries.map((entry) => (
                <TranscriptEntry
                  key={entry.id}
                  entry={entry}
                  isCompacted
                  onRestorePointClick={onRestorePointClick}
                  onPlanItemClick={onPlanItemClick}
                />
              ))}
            </div>
          )}

          {/* Compact marker */}
          {group.marker && (
            <CompactMarker
              marker={group.marker}
              onToggleExpand={(expanded) => setShowCompacted(expanded)}
            />
          )}

          {/* Current entries */}
          {group.currentEntries.map((entry) => (
            <TranscriptEntry
              key={entry.id}
              entry={entry}
              onRestorePointClick={onRestorePointClick}
              onPlanItemClick={onPlanItemClick}
            />
          ))}
        </div>
      ))}

      {/* Streaming indicator */}
      {isStreaming && (
        <div className="py-3 px-4">
          <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
            <span className="flex gap-1">
              <span className="w-2 h-2 rounded-full bg-[var(--color-accent)] animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 rounded-full bg-[var(--color-accent)] animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 rounded-full bg-[var(--color-accent)] animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
            <span>Claude is working...</span>
          </div>
        </div>
      )}

      {/* Empty state */}
      {entries.length === 0 && !isStreaming && (
        <div className="flex items-center justify-center h-full">
          <div className="text-center py-12">
            <p className="text-[var(--color-text-secondary)]">
              Start a conversation with Claude Code
            </p>
            <p className="text-sm text-[var(--color-text-tertiary)] mt-1">
              Send a message to begin
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper to group entries by compact markers
interface EntryGroup {
  compactedEntries: TranscriptEntryType[];
  marker: CompactMarkerData | null;
  currentEntries: TranscriptEntryType[];
}

function groupEntriesByCompact(entries: TranscriptEntryType[]): EntryGroup[] {
  const groups: EntryGroup[] = [];
  let currentGroup: EntryGroup = {
    compactedEntries: [],
    marker: null,
    currentEntries: [],
  };

  for (const entry of entries) {
    if (entry.type === 'compact_marker' && entry.compactMarker) {
      // Move current entries to compacted
      currentGroup.compactedEntries = currentGroup.currentEntries;
      currentGroup.marker = entry.compactMarker;
      currentGroup.currentEntries = [];
      groups.push(currentGroup);

      // Start new group
      currentGroup = {
        compactedEntries: [],
        marker: null,
        currentEntries: [],
      };
    } else if (entry.isCompacted) {
      currentGroup.compactedEntries.push(entry);
    } else {
      currentGroup.currentEntries.push(entry);
    }
  }

  // Add final group if has entries
  if (currentGroup.currentEntries.length > 0 || currentGroup.compactedEntries.length > 0) {
    groups.push(currentGroup);
  }

  return groups.length > 0 ? groups : [{ compactedEntries: [], marker: null, currentEntries: [] }];
}
