import React from 'react';
import { cn } from '../../../lib';
import { History, Plus } from 'lucide-react';
import { RestorePointCard } from './RestorePointCard';
import type { RestorePoint } from '../../../types/snapshot';

export interface RestoreTimelineProps {
  restorePoints: RestorePoint[];
  currentPointId?: string;
  onRestore: (restorePointId: string) => void;
  onPreview?: (restorePointId: string) => void;
  onCreateManual?: () => void;
  loading?: boolean;
  className?: string;
}

export function RestoreTimeline({
  restorePoints,
  currentPointId,
  onRestore,
  onPreview,
  onCreateManual,
  loading = false,
  className,
}: RestoreTimelineProps) {
  if (loading) {
    return (
      <div className={cn('p-4', className)}>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-[var(--color-bg-secondary)] rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-[var(--color-text-secondary)]" />
          <h3 className="text-sm font-medium text-[var(--color-text)]">
            History
          </h3>
        </div>
        {onCreateManual && (
          <button
            onClick={onCreateManual}
            className={cn(
              'flex items-center gap-1 py-1 px-2 rounded',
              'text-xs text-[var(--color-text-secondary)]',
              'hover:bg-[var(--color-bg-secondary)] transition-colors'
            )}
          >
            <Plus className="w-3 h-3" />
            Checkpoint
          </button>
        )}
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto p-4">
        {restorePoints.length === 0 ? (
          <div className="text-center py-8">
            <History className="w-8 h-8 mx-auto mb-2 text-[var(--color-text-tertiary)]" />
            <p className="text-sm text-[var(--color-text-secondary)]">
              No restore points yet
            </p>
            <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
              Restore points are created automatically before file edits
            </p>
          </div>
        ) : (
          <div className="space-y-3 relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-px bg-[var(--color-border)]" />

            {restorePoints.map((point, index) => (
              <div key={point.id} className="relative pl-8">
                {/* Timeline dot */}
                <div className={cn(
                  'absolute left-3 top-4 w-2 h-2 rounded-full',
                  '-translate-x-1/2',
                  point.id === currentPointId
                    ? 'bg-[var(--color-accent)]'
                    : 'bg-[var(--color-border)]'
                )} />

                <RestorePointCard
                  restorePoint={point}
                  isActive={point.id === currentPointId}
                  onRestore={() => onRestore(point.id)}
                  onPreview={onPreview ? () => onPreview(point.id) : undefined}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
