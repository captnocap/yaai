import React, { useRef, useEffect, useCallback } from 'react';
import { cn } from '../../lib';

export interface AutoTextAreaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxRows?: number;
  minRows?: number;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onPaste?: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
}

export function AutoTextArea({
  value,
  onChange,
  placeholder = 'Type a message...',
  maxRows = 10,
  minRows = 1,
  onKeyDown,
  onPaste,
  disabled = false,
  autoFocus = false,
  className,
}: AutoTextAreaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto';

    // Get line height for calculations
    const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 24;
    const minHeight = minRows * lineHeight;
    const maxHeight = maxRows * lineHeight;

    // Calculate new height
    const newHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight);
    textarea.style.height = `${newHeight}px`;

    // Show scrollbar if content exceeds max height
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, [maxRows, minRows]);

  // Adjust height on value change
  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  // Handle window resize
  useEffect(() => {
    window.addEventListener('resize', adjustHeight);
    return () => window.removeEventListener('resize', adjustHeight);
  }, [adjustHeight]);

  // Auto focus
  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      onPaste={onPaste}
      placeholder={placeholder}
      disabled={disabled}
      rows={minRows}
      className={cn(
        'w-full resize-none',
        'px-4 py-3',
        'bg-transparent',
        'text-[var(--color-text)] placeholder:text-[var(--color-text-tertiary)]',
        'border-none outline-none',
        'focus:ring-0',
        'custom-scrollbar',
        'transition-[height] duration-150 ease-out',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      style={{
        lineHeight: '1.5',
      }}
    />
  );
}
