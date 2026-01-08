import React, { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../../lib';

export interface InlineCommentInputProps {
  line: number;
  onSubmit: (content: string) => void;
  onCancel: () => void;
  initialValue?: string;
  className?: string;
}

export function InlineCommentInput({
  line,
  onSubmit,
  onCancel,
  initialValue = '',
  className,
}: InlineCommentInputProps) {
  const [value, setValue] = useState(initialValue);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (trimmed) {
      onSubmit(trimmed);
    }
  };

  return (
    <div
      className={cn(
        'w-72 rounded-lg overflow-hidden',
        'bg-[var(--color-bg-secondary)]',
        'border border-[var(--color-border)]',
        'shadow-lg',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--color-border)] bg-[var(--color-bg-tertiary)]">
        <span className="text-xs font-medium text-[var(--color-text-secondary)]">
          Line {line}
        </span>
        <button
          onClick={onCancel}
          className="p-0.5 rounded hover:bg-[var(--color-bg)]"
        >
          <X className="w-3.5 h-3.5 text-[var(--color-text-tertiary)]" />
        </button>
      </div>

      {/* Input */}
      <div className="p-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Leave a comment..."
          className={cn(
            'w-full p-2 rounded',
            'text-sm text-[var(--color-text)]',
            'bg-[var(--color-bg)]',
            'border border-[var(--color-border)]',
            'placeholder:text-[var(--color-text-tertiary)]',
            'focus:outline-none focus:border-[var(--color-accent)]',
            'resize-none'
          )}
          rows={3}
        />

        {/* Actions */}
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-[var(--color-text-tertiary)]">
            Ctrl+Enter to submit
          </span>
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className={cn(
                'px-3 py-1 rounded',
                'text-xs font-medium',
                'text-[var(--color-text-secondary)]',
                'hover:bg-[var(--color-bg-tertiary)]',
                'transition-colors'
              )}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!value.trim()}
              className={cn(
                'px-3 py-1 rounded',
                'text-xs font-medium',
                'bg-[var(--color-accent)] text-white',
                'hover:opacity-90',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'transition-opacity'
              )}
            >
              Add Comment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
