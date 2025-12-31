import React from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib';

const variants = {
  default: 'bg-[var(--color-bg-tertiary)] text-[var(--color-text)]',
  outline: 'bg-transparent border border-[var(--color-border)] text-[var(--color-text)]',
  filled: 'bg-[var(--color-accent)] text-[var(--color-text-inverse)]',
} as const;

export interface ChipProps {
  children: React.ReactNode;
  onRemove?: () => void;
  onClick?: () => void;
  variant?: keyof typeof variants;
  color?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export function Chip({
  children,
  onRemove,
  onClick,
  variant = 'default',
  color,
  icon,
  disabled = false,
  className,
}: ChipProps) {
  const isInteractive = onClick || onRemove;

  return (
    <span
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={disabled ? undefined : onClick}
      onKeyDown={(e) => {
        if (onClick && !disabled && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      style={color ? { '--chip-color': color } as React.CSSProperties : undefined}
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full',
        'text-sm font-medium select-none',
        'transition-all',
        variants[variant],
        color && 'bg-[color:var(--chip-color)]/10 text-[color:var(--chip-color)]',
        isInteractive && !disabled && 'cursor-pointer hover:opacity-80',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {icon && <span className="shrink-0 -ml-0.5">{icon}</span>}
      <span className="truncate max-w-[150px]">{children}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (!disabled) onRemove();
          }}
          disabled={disabled}
          className={cn(
            'shrink-0 -mr-1 p-0.5 rounded-full',
            'hover:bg-black/10 dark:hover:bg-white/10',
            'transition-colors focus-ring',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          <X className="h-3 w-3" />
          <span className="sr-only">Remove</span>
        </button>
      )}
    </span>
  );
}
