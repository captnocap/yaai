import React from 'react';
import { Brain } from 'lucide-react';
import { cn } from '../../lib';
import { Chip, Tooltip, Indicator } from '../atoms';
import type { Memory } from '../../types';

export interface MemoryChipProps {
  memory: Memory;
  onRemove?: () => void;
  onClick?: () => void;
  showRelevance?: boolean;
  className?: string;
}

export function MemoryChip({
  memory,
  onRemove,
  onClick,
  showRelevance = false,
  className,
}: MemoryChipProps) {
  // Truncate summary for chip display
  const displayText = memory.summary.length > 30
    ? memory.summary.slice(0, 30) + '...'
    : memory.summary;

  const relevanceColor = memory.relevance
    ? memory.relevance > 0.8
      ? 'success'
      : memory.relevance > 0.5
      ? 'info'
      : 'neutral'
    : undefined;

  return (
    <Tooltip
      content={
        <div className="max-w-xs space-y-2">
          <p className="font-medium">Memory</p>
          <p className="text-sm">{memory.summary}</p>
          {memory.relevance !== undefined && (
            <p className="text-xs text-[var(--color-text-tertiary)]">
              Relevance: {Math.round(memory.relevance * 100)}%
            </p>
          )}
        </div>
      }
    >
      <div className={cn('animate-pulse-dot', className)}>
        <Chip
          icon={
            <div className="flex items-center gap-1">
              <Brain className="h-3 w-3" />
              {showRelevance && relevanceColor && (
                <Indicator status={relevanceColor} size="sm" />
              )}
            </div>
          }
          onRemove={onRemove}
          onClick={onClick}
          variant="outline"
          color="#8b5cf6" // Purple for memories
        >
          {displayText}
        </Chip>
      </div>
    </Tooltip>
  );
}
