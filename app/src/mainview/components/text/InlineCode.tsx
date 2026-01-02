import React from 'react';
import { cn } from '../../lib';

export interface InlineCodeProps {
  children: string;
  className?: string;
}

export function InlineCode({ children, className }: InlineCodeProps) {
  return (
    <code
      className={cn(
        'px-1.5 py-0.5 rounded-[var(--radius-sm)]',
        'bg-[var(--color-bg-tertiary)]',
        'font-mono text-[0.9em]',
        'break-words',
        className
      )}
    >
      {children}
    </code>
  );
}
