import React from 'react';
import { cn, formatCompact } from '../../lib';
import { Counter, ProgressRing, Tooltip } from '../atoms';

export interface TokenBreakdown {
  system: number;
  memories: number;
  history: number;
  input: number;
}

export interface TokenMeterProps {
  used: number;
  limit: number;
  breakdown?: TokenBreakdown;
  size?: 'sm' | 'md';
  showLabel?: boolean;
  className?: string;
}

export function TokenMeter({
  used,
  limit,
  breakdown,
  size = 'md',
  showLabel = false,
  className,
}: TokenMeterProps) {
  const percentage = Math.round((used / limit) * 100);

  const tooltipContent = breakdown ? (
    <div className="space-y-1 text-xs">
      <div className="font-medium mb-2">Token Breakdown</div>
      <div className="flex justify-between gap-4">
        <span className="text-[var(--color-text-secondary)]">System</span>
        <span>{formatCompact(breakdown.system)}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-[var(--color-text-secondary)]">Memories</span>
        <span>{formatCompact(breakdown.memories)}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-[var(--color-text-secondary)]">History</span>
        <span>{formatCompact(breakdown.history)}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-[var(--color-text-secondary)]">Input</span>
        <span>{formatCompact(breakdown.input)}</span>
      </div>
      <div className="border-t border-[var(--color-border)] pt-1 mt-1 flex justify-between gap-4 font-medium">
        <span>Total</span>
        <span>{formatCompact(used)} / {formatCompact(limit)}</span>
      </div>
    </div>
  ) : (
    <span>{formatCompact(used)} / {formatCompact(limit)} tokens ({percentage}%)</span>
  );

  return (
    <Tooltip content={tooltipContent}>
      <div className={cn('flex items-center gap-2', className)}>
        <ProgressRing
          value={used}
          max={limit}
          size={size}
        />
        {showLabel && (
          <div className="flex flex-col">
            <span className="text-xs text-[var(--color-text-secondary)]">
              <Counter value={used} format="compact" /> / {formatCompact(limit)}
            </span>
          </div>
        )}
      </div>
    </Tooltip>
  );
}
