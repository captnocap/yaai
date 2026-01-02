import React, { useState } from 'react';
import { cn } from '../../../lib';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { CompactMarkerData } from '../../../types/code-session';

export interface CompactMarkerProps {
  marker: CompactMarkerData;
  onToggleExpand?: (expanded: boolean) => void;
  className?: string;
}

export function CompactMarker({
  marker,
  onToggleExpand,
  className,
}: CompactMarkerProps) {
  const [expanded, setExpanded] = useState(false);

  const handleToggle = () => {
    const newExpanded = !expanded;
    setExpanded(newExpanded);
    onToggleExpand?.(newExpanded);
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className={cn('relative py-4', className)}>
      {/* Divider line */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-[var(--color-border)]" />

      {/* Center badge */}
      <div className="relative flex justify-center">
        <button
          onClick={handleToggle}
          className={cn(
            'flex items-center gap-2 px-4 py-1.5',
            'bg-[var(--color-bg)] border border-[var(--color-border)]',
            'rounded-full text-xs text-[var(--color-text-secondary)]',
            'hover:bg-[var(--color-bg-secondary)] transition-colors'
          )}
        >
          {expanded ? (
            <ChevronDown className="w-3 h-3" />
          ) : (
            <ChevronRight className="w-3 h-3" />
          )}
          <span>CONTEXT COMPACTED</span>
          <span className="text-[var(--color-text-tertiary)]">
            ({formatTime(marker.timestamp)})
          </span>
        </button>
      </div>

      {/* Collapsed message count */}
      {!expanded && marker.compactedCount > 0 && (
        <div className="text-center mt-2">
          <span className="text-xs text-[var(--color-text-tertiary)]">
            {marker.compactedCount} earlier messages
          </span>
        </div>
      )}
    </div>
  );
}
