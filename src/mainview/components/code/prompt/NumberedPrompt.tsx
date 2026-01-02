import React, { useEffect, useCallback, useState } from 'react';
import { cn } from '../../../lib';
import type { InputPrompt } from '../../../types/code-session';

export interface NumberedPromptProps {
  prompt: InputPrompt;
  onSelect: (index: number) => void;
  disabled?: boolean;
  className?: string;
}

export function NumberedPrompt({
  prompt,
  onSelect,
  disabled = false,
  className,
}: NumberedPromptProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const options = prompt.options || [];

  // Keyboard shortcuts (1-9)
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (disabled) return;

    const num = parseInt(e.key, 10);
    if (!isNaN(num) && num >= 1 && num <= options.length) {
      e.preventDefault();
      onSelect(num);
    }
  }, [disabled, onSelect, options.length]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className={cn('animate-fade-in', className)}>
      {/* Prompt message */}
      <p className="text-sm text-[var(--color-text)] mb-3">
        {prompt.message}
      </p>

      {/* Options list */}
      <div className="space-y-2">
        {options.map((option, index) => (
          <button
            key={index}
            onClick={() => onSelect(index + 1)}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
            disabled={disabled}
            className={cn(
              'w-full flex items-center gap-3 py-2.5 px-4 rounded-lg',
              'text-sm text-left',
              'bg-[var(--color-bg-tertiary)]',
              'border border-[var(--color-border)]',
              'hover:bg-[var(--color-bg-secondary)] hover:border-[var(--color-accent)]',
              'transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2',
              hoveredIndex === index && 'border-[var(--color-accent)]'
            )}
          >
            {/* Number badge */}
            <span className={cn(
              'flex items-center justify-center w-6 h-6 rounded',
              'text-xs font-medium',
              'bg-[var(--color-bg)] text-[var(--color-text-secondary)]',
              hoveredIndex === index && 'bg-[var(--color-accent)] text-white'
            )}>
              {index + 1}
            </span>

            {/* Option text */}
            <span className="flex-1 text-[var(--color-text)]">
              {option}
            </span>
          </button>
        ))}
      </div>

      {/* Hint */}
      <p className="mt-2 text-xs text-[var(--color-text-tertiary)]">
        Press 1-{options.length} to select
      </p>
    </div>
  );
}
