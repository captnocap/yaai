import React, { useEffect, useCallback } from 'react';
import { cn } from '../../../lib';
import type { InputPrompt } from '../../../types/code-session';

export interface YesNoPromptProps {
  prompt: InputPrompt;
  onAnswer: (answer: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function YesNoPrompt({
  prompt,
  onAnswer,
  disabled = false,
  className,
}: YesNoPromptProps) {
  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (disabled) return;

    if (e.key.toLowerCase() === 'y') {
      e.preventDefault();
      onAnswer(true);
    } else if (e.key.toLowerCase() === 'n') {
      e.preventDefault();
      onAnswer(false);
    }
  }, [disabled, onAnswer]);

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

      {/* Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => onAnswer(true)}
          disabled={disabled}
          className={cn(
            'flex-1 py-2.5 px-4 rounded-lg',
            'text-sm font-medium',
            'bg-[var(--color-accent)] text-white',
            'hover:opacity-90 transition-opacity',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2'
          )}
        >
          Yes
          <span className="ml-2 text-xs opacity-70">(Y)</span>
        </button>
        <button
          onClick={() => onAnswer(false)}
          disabled={disabled}
          className={cn(
            'flex-1 py-2.5 px-4 rounded-lg',
            'text-sm font-medium',
            'bg-[var(--color-bg-tertiary)] text-[var(--color-text)]',
            'border border-[var(--color-border)]',
            'hover:bg-[var(--color-bg-secondary)] transition-colors',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2'
          )}
        >
          No
          <span className="ml-2 text-xs opacity-70">(N)</span>
        </button>
      </div>
    </div>
  );
}
