import React from 'react';
import { Send } from 'lucide-react';
import { cn } from '../../lib';
import { Spinner, Tooltip } from '../atoms';

export interface SendButtonProps {
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

export function SendButton({
  onClick,
  loading = false,
  disabled = false,
  className,
}: SendButtonProps) {
  const button = (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        'flex items-center justify-center',
        'h-10 w-10 rounded-full',
        'transition-all press-effect',
        disabled || loading
          ? 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)] cursor-not-allowed'
          : 'bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)]',
        className
      )}
    >
      {loading ? (
        <Spinner size="sm" />
      ) : (
        <Send className="h-5 w-5" />
      )}
    </button>
  );

  if (disabled) {
    return button;
  }

  return (
    <Tooltip content="Send message (⌘↵)" side="top">
      {button}
    </Tooltip>
  );
}
