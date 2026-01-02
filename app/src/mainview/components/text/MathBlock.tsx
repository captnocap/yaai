import React from 'react';
import { cn } from '../../lib';

export interface MathBlockProps {
  content: string;
  display?: boolean;
  className?: string;
}

/**
 * Math rendering placeholder.
 * TODO: Integrate KaTeX for actual LaTeX rendering.
 * For now, displays the raw LaTeX content.
 */
export function MathBlock({
  content,
  display = false,
  className,
}: MathBlockProps) {
  if (display) {
    return (
      <div
        className={cn(
          'my-4 py-4 overflow-x-auto',
          'text-center font-mono text-lg',
          'bg-[var(--color-bg-secondary)] rounded-[var(--radius-md)]',
          className
        )}
      >
        {content}
      </div>
    );
  }

  return (
    <span
      className={cn(
        'px-1 font-mono text-[0.9em]',
        'bg-[var(--color-bg-tertiary)] rounded-[var(--radius-sm)]',
        className
      )}
    >
      {content}
    </span>
  );
}
