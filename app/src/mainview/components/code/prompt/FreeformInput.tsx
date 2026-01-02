import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../../../lib';
import { Send } from 'lucide-react';
import type { InputPrompt } from '../../../types/code-session';

export interface FreeformInputProps {
  prompt?: InputPrompt;
  placeholder?: string;
  onSubmit: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
}

export function FreeformInput({
  prompt,
  placeholder = 'Send a message to Claude...',
  onSubmit,
  disabled = false,
  autoFocus = true,
  className,
}: FreeformInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus on mount
  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  const handleSubmit = () => {
    if (disabled || !value.trim()) return;
    onSubmit(value.trim());
    setValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className={cn('animate-fade-in', className)}>
      {/* Prompt message */}
      {prompt?.message && (
        <p className="text-sm text-[var(--color-text)] mb-3">
          {prompt.message}
        </p>
      )}

      {/* Input area */}
      <div className={cn(
        'flex items-end gap-2 p-3',
        'bg-[var(--color-bg-tertiary)]',
        'border border-[var(--color-border)]',
        'rounded-lg',
        'focus-within:border-[var(--color-accent)]',
        'transition-colors'
      )}>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className={cn(
            'flex-1 resize-none',
            'bg-transparent',
            'text-sm text-[var(--color-text)]',
            'placeholder:text-[var(--color-text-tertiary)]',
            'focus:outline-none',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'max-h-32'
          )}
        />

        <button
          onClick={handleSubmit}
          disabled={disabled || !value.trim()}
          className={cn(
            'flex items-center justify-center w-8 h-8 rounded-lg',
            'bg-[var(--color-accent)] text-white',
            'hover:opacity-90 transition-opacity',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2'
          )}
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      {/* Hint */}
      <p className="mt-2 text-xs text-[var(--color-text-tertiary)]">
        Press Enter to send, Shift+Enter for new line
      </p>
    </div>
  );
}
