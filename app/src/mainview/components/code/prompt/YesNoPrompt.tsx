import React, { useEffect, useCallback } from 'react';
import { cn } from '../../../lib';
import type { InputPrompt } from '../../../types/code-session';

export type YesNoAnswer = 'yes' | 'no' | 'always';

export interface YesNoPromptProps {
  prompt: InputPrompt;
  /** Callback with answer: 'yes', 'no', or 'always' */
  onAnswer: (answer: YesNoAnswer) => void;
  /** Show the "Always" button for persistent permission */
  showAlways?: boolean;
  /** Tool name to display in "Always for [tool]" label */
  toolName?: string;
  disabled?: boolean;
  className?: string;
}

export function YesNoPrompt({
  prompt,
  onAnswer,
  showAlways = true,
  toolName,
  disabled = false,
  className,
}: YesNoPromptProps) {
  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (disabled) return;

    const key = e.key.toLowerCase();
    if (key === 'y') {
      e.preventDefault();
      onAnswer('yes');
    } else if (key === 'n') {
      e.preventDefault();
      onAnswer('no');
    } else if (key === 'a' && showAlways) {
      e.preventDefault();
      onAnswer('always');
    }
  }, [disabled, onAnswer, showAlways]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const alwaysLabel = toolName ? `Always for ${toolName}` : 'Always';

  return (
    <div className={cn('animate-fade-in', className)}>
      {/* Prompt message */}
      <p className="text-sm text-[var(--color-text)] mb-3">
        {prompt.message}
      </p>

      {/* Buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => onAnswer('yes')}
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
          onClick={() => onAnswer('no')}
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
        {showAlways && (
          <button
            onClick={() => onAnswer('always')}
            disabled={disabled}
            className={cn(
              'flex-1 py-2.5 px-4 rounded-lg',
              'text-sm font-medium',
              'bg-emerald-600 text-white',
              'hover:bg-emerald-700 transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2'
            )}
            title="Allow this action for all future requests"
          >
            {alwaysLabel}
            <span className="ml-2 text-xs opacity-70">(A)</span>
          </button>
        )}
      </div>

      {/* Hint for "Always" */}
      {showAlways && (
        <p className="mt-2 text-xs text-[var(--color-text-tertiary)]">
          Press A to always allow this {toolName ? `(${toolName})` : 'action'}
        </p>
      )}
    </div>
  );
}
