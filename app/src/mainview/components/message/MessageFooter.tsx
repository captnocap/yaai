import React from 'react';
import { cn, formatCompact, formatDuration } from '../../lib';

export interface MessageFooterProps {
  tokenCount?: number;
  generationTime?: number;
  className?: string;
}

export function MessageFooter({
  tokenCount,
  generationTime,
  className,
}: MessageFooterProps) {
  if (!tokenCount && !generationTime) return null;

  const stats = [
    tokenCount && `${formatCompact(tokenCount)} tokens`,
    generationTime && formatDuration(generationTime),
  ].filter(Boolean);

  return (
    <div
      className={cn(
        'flex items-center gap-2 mt-2 text-xs text-[var(--color-text-tertiary)]',
        'animate-fade-in',
        className
      )}
    >
      {stats.join(' • ')}
    </div>
  );
}
