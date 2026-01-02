import React from 'react';
import { cn } from '../../../lib';
import { Clock, FileText, RotateCcw } from 'lucide-react';
import type { RestorePoint } from '../../../types/snapshot';

export interface RestorePointCardProps {
  restorePoint: RestorePoint;
  isActive?: boolean;
  onRestore?: () => void;
  onPreview?: () => void;
  className?: string;
}

export function RestorePointCard({
  restorePoint,
  isActive = false,
  onRestore,
  onPreview,
  className,
}: RestorePointCardProps) {
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div
      className={cn(
        'p-3 rounded-lg',
        'bg-[var(--color-bg-secondary)]',
        'border border-[var(--color-border)]',
        isActive && 'border-[var(--color-accent)]',
        'hover:bg-[var(--color-bg-tertiary)] transition-colors',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
          <Clock className="w-3 h-3" />
          <span>{formatTime(restorePoint.timestamp)}</span>
        </div>
        {isActive && (
          <span className="text-xs text-[var(--color-accent)] font-medium">
            Current
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-sm text-[var(--color-text)] mb-2 line-clamp-2">
        {restorePoint.description}
      </p>

      {/* Stats */}
      <div className="flex items-center gap-3 text-xs text-[var(--color-text-tertiary)] mb-3">
        <span className="flex items-center gap-1">
          <FileText className="w-3 h-3" />
          {restorePoint.fileCount} files
        </span>
        <span>{formatSize(restorePoint.totalSize)}</span>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {onPreview && (
          <button
            onClick={onPreview}
            className={cn(
              'flex-1 py-1.5 px-3 rounded',
              'text-xs',
              'bg-[var(--color-bg)]',
              'border border-[var(--color-border)]',
              'hover:bg-[var(--color-bg-secondary)] transition-colors'
            )}
          >
            Preview
          </button>
        )}
        {onRestore && !isActive && (
          <button
            onClick={onRestore}
            className={cn(
              'flex-1 py-1.5 px-3 rounded',
              'text-xs',
              'bg-[var(--color-accent)] text-white',
              'hover:opacity-90 transition-opacity',
              'flex items-center justify-center gap-1'
            )}
          >
            <RotateCcw className="w-3 h-3" />
            Restore
          </button>
        )}
      </div>
    </div>
  );
}
