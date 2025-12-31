import React from 'react';
import { cn } from '../../lib';

const statusColors = {
  success: 'bg-[var(--color-success)]',
  warning: 'bg-[var(--color-warning)]',
  error: 'bg-[var(--color-error)]',
  info: 'bg-[var(--color-info)]',
  neutral: 'bg-[var(--color-text-tertiary)]',
} as const;

const sizes = {
  sm: 'h-2 w-2',
  md: 'h-3 w-3',
} as const;

export interface IndicatorProps {
  status: keyof typeof statusColors;
  pulse?: boolean;
  size?: keyof typeof sizes;
  className?: string;
}

export function Indicator({
  status,
  pulse = false,
  size = 'md',
  className,
}: IndicatorProps) {
  return (
    <span className={cn('relative inline-flex', className)}>
      <span
        className={cn(
          'rounded-full',
          sizes[size],
          statusColors[status]
        )}
      />
      {pulse && (
        <span
          className={cn(
            'absolute inset-0 rounded-full animate-pulse-ring',
            statusColors[status]
          )}
        />
      )}
    </span>
  );
}
