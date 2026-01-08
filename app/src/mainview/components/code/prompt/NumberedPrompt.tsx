import React, { useEffect, useCallback, useState } from 'react';
import { Check, MessageSquare } from 'lucide-react';
import { cn } from '../../../lib';
import type { InputPrompt } from '../../../types/code-session';

export interface NumberedPromptProps {
  prompt: InputPrompt;
  /** Callback with selected indices (1-indexed) */
  onSelect: (indices: number[], otherText?: string) => void;
  /** Allow selecting multiple options */
  multiSelect?: boolean;
  /** Show "Other" option with text input */
  allowOther?: boolean;
  disabled?: boolean;
  className?: string;
}

export function NumberedPrompt({
  prompt,
  onSelect,
  multiSelect = false,
  allowOther = false,
  disabled = false,
  className,
}: NumberedPromptProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [showOtherInput, setShowOtherInput] = useState(false);
  const [otherText, setOtherText] = useState('');
  const options = prompt.options || [];

  // Handle option click
  const handleOptionClick = (index: number) => {
    if (multiSelect) {
      // Toggle selection in multi-select mode
      const newSelected = new Set(selectedIndices);
      if (newSelected.has(index)) {
        newSelected.delete(index);
      } else {
        newSelected.add(index);
      }
      setSelectedIndices(newSelected);
    } else {
      // Single select - submit immediately
      onSelect([index]);
    }
  };

  // Handle submit in multi-select mode
  const handleSubmit = () => {
    if (showOtherInput && otherText.trim()) {
      onSelect(Array.from(selectedIndices), otherText.trim());
    } else if (selectedIndices.size > 0) {
      onSelect(Array.from(selectedIndices));
    }
  };

  // Handle "Other" submission
  const handleOtherSubmit = () => {
    if (otherText.trim()) {
      if (multiSelect && selectedIndices.size > 0) {
        onSelect(Array.from(selectedIndices), otherText.trim());
      } else {
        onSelect([], otherText.trim());
      }
    }
  };

  // Keyboard shortcuts (1-9 for options, Enter to submit in multi-select)
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (disabled) return;

    // If typing in other input, don't intercept
    if (showOtherInput && e.target instanceof HTMLTextAreaElement) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleOtherSubmit();
      }
      return;
    }

    const num = parseInt(e.key, 10);
    if (!isNaN(num) && num >= 1 && num <= options.length) {
      e.preventDefault();
      handleOptionClick(num);
    } else if (e.key === 'Enter' && multiSelect && selectedIndices.size > 0) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'o' && allowOther) {
      e.preventDefault();
      setShowOtherInput(true);
    }
  }, [disabled, options.length, multiSelect, selectedIndices, showOtherInput, otherText, allowOther]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const isSelected = (index: number) => selectedIndices.has(index);

  return (
    <div className={cn('animate-fade-in', className)}>
      {/* Prompt message */}
      <p className="text-sm text-[var(--color-text)] mb-3">
        {prompt.message}
        {multiSelect && (
          <span className="text-[var(--color-text-tertiary)]"> (select multiple)</span>
        )}
      </p>

      {/* Options list */}
      <div className="space-y-2">
        {options.map((option, index) => {
          const optionNum = index + 1;
          const selected = isSelected(optionNum);

          return (
            <button
              key={index}
              onClick={() => handleOptionClick(optionNum)}
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
                (hoveredIndex === index || selected) && 'border-[var(--color-accent)]',
                selected && 'bg-[var(--color-accent)]/10'
              )}
            >
              {/* Number badge or checkbox */}
              {multiSelect ? (
                <span className={cn(
                  'flex items-center justify-center w-5 h-5 rounded',
                  'border-2',
                  selected
                    ? 'bg-[var(--color-accent)] border-[var(--color-accent)]'
                    : 'border-[var(--color-border)]'
                )}>
                  {selected && <Check className="w-3 h-3 text-white" />}
                </span>
              ) : (
                <span className={cn(
                  'flex items-center justify-center w-6 h-6 rounded',
                  'text-xs font-medium',
                  'bg-[var(--color-bg)] text-[var(--color-text-secondary)]',
                  hoveredIndex === index && 'bg-[var(--color-accent)] text-white'
                )}>
                  {optionNum}
                </span>
              )}

              {/* Option text */}
              <span className="flex-1 text-[var(--color-text)]">
                {option}
              </span>

              {/* Show number hint in multi-select */}
              {multiSelect && (
                <span className="text-xs text-[var(--color-text-tertiary)]">
                  {optionNum}
                </span>
              )}
            </button>
          );
        })}

        {/* "Other" option */}
        {allowOther && !showOtherInput && (
          <button
            onClick={() => setShowOtherInput(true)}
            disabled={disabled}
            className={cn(
              'w-full flex items-center gap-3 py-2.5 px-4 rounded-lg',
              'text-sm text-left',
              'bg-[var(--color-bg-tertiary)]',
              'border border-dashed border-[var(--color-border)]',
              'hover:bg-[var(--color-bg-secondary)] hover:border-[var(--color-accent)]',
              'transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2'
            )}
          >
            <MessageSquare className="w-5 h-5 text-[var(--color-text-tertiary)]" />
            <span className="flex-1 text-[var(--color-text-secondary)]">
              Other (provide custom response)
            </span>
            <span className="text-xs text-[var(--color-text-tertiary)]">(O)</span>
          </button>
        )}

        {/* Other text input */}
        {showOtherInput && (
          <div className="space-y-2">
            <textarea
              value={otherText}
              onChange={(e) => setOtherText(e.target.value)}
              placeholder="Type your response..."
              disabled={disabled}
              autoFocus
              className={cn(
                'w-full p-3 rounded-lg',
                'text-sm text-[var(--color-text)]',
                'bg-[var(--color-bg)]',
                'border border-[var(--color-accent)]',
                'placeholder:text-[var(--color-text-tertiary)]',
                'focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]',
                'resize-none',
                'disabled:opacity-50'
              )}
              rows={3}
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowOtherInput(false);
                  setOtherText('');
                }}
                disabled={disabled}
                className={cn(
                  'px-4 py-2 rounded-lg',
                  'text-sm',
                  'bg-[var(--color-bg-tertiary)] text-[var(--color-text)]',
                  'border border-[var(--color-border)]',
                  'hover:bg-[var(--color-bg-secondary)]',
                  'disabled:opacity-50'
                )}
              >
                Cancel
              </button>
              <button
                onClick={handleOtherSubmit}
                disabled={disabled || !otherText.trim()}
                className={cn(
                  'px-4 py-2 rounded-lg',
                  'text-sm font-medium',
                  'bg-[var(--color-accent)] text-white',
                  'hover:opacity-90',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                Submit
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Submit button for multi-select */}
      {multiSelect && selectedIndices.size > 0 && !showOtherInput && (
        <button
          onClick={handleSubmit}
          disabled={disabled}
          className={cn(
            'mt-3 w-full py-2.5 px-4 rounded-lg',
            'text-sm font-medium',
            'bg-[var(--color-accent)] text-white',
            'hover:opacity-90 transition-opacity',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2'
          )}
        >
          Done ({selectedIndices.size} selected)
          <span className="ml-2 text-xs opacity-70">(Enter)</span>
        </button>
      )}

      {/* Hint */}
      <p className="mt-2 text-xs text-[var(--color-text-tertiary)]">
        Press 1-{options.length} to select
        {multiSelect && ', Enter to confirm'}
        {allowOther && ', O for other'}
      </p>
    </div>
  );
}
