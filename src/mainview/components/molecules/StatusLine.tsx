import React from 'react';
import { cn } from '../../lib';
import { Indicator, Spinner } from '../atoms';

type StatusType = 'success' | 'warning' | 'error' | 'info' | 'loading';

export interface StatusLineProps {
  status: StatusType;
  text: string;
  className?: string;
}

export function StatusLine({
  status,
  text,
  className,
}: StatusLineProps) {
  const isLoading = status === 'loading';

  return (
    <div
      className={cn(
        'flex items-center gap-2 text-sm',
        'animate-fade-in',
        className
      )}
    >
      {isLoading ? (
        <Spinner size="sm" />
      ) : (
        <Indicator
          status={status === 'loading' ? 'info' : status}
          pulse={status === 'info'}
        />
      )}
      <span
        className={cn(
          'text-[var(--color-text-secondary)]',
          status === 'error' && 'text-[var(--color-error)]',
          status === 'success' && 'text-[var(--color-success)]',
          status === 'warning' && 'text-[var(--color-warning)]'
        )}
      >
        {text}
      </span>
    </div>
  );
}
