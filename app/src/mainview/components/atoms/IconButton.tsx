import React from 'react';
import { cn } from '../../lib';
import { Tooltip } from './Tooltip';
import { Spinner } from './Spinner';

const variants = {
  ghost: 'hover:bg-[var(--color-bg-tertiary)]',
  outline: 'border border-[var(--color-border)] hover:bg-[var(--color-bg-tertiary)]',
  filled: 'bg-[var(--color-accent)] text-[var(--color-text-inverse)] hover:bg-[var(--color-accent-hover)]',
} as const;

const sizes = {
  sm: 'h-7 w-7',
  md: 'h-9 w-9',
  lg: 'h-11 w-11',
} as const;

const iconSizes = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
} as const;

export interface IconButtonProps {
  icon: React.ReactNode;
  onClick?: () => void;
  size?: keyof typeof sizes;
  variant?: keyof typeof variants;
  tooltip?: string;
  loading?: boolean;
  disabled?: boolean;
  active?: boolean;
  className?: string;
  'aria-label'?: string;
}

export function IconButton({
  icon,
  onClick,
  size = 'md',
  variant = 'ghost',
  tooltip,
  loading = false,
  disabled = false,
  active = false,
  className,
  'aria-label': ariaLabel,
}: IconButtonProps) {
  const button = (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      aria-label={ariaLabel || tooltip}
      className={cn(
        'inline-flex items-center justify-center rounded-[var(--radius-md)]',
        'transition-colors focus-ring press-effect',
        variants[variant],
        sizes[size],
        active && 'bg-[var(--color-accent-subtle)] text-[var(--color-accent)]',
        (disabled || loading) && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {loading ? (
        <Spinner size={size === 'lg' ? 'md' : 'sm'} />
      ) : (
        <span className={iconSizes[size]}>{icon}</span>
      )}
    </button>
  );

  if (tooltip && !disabled) {
    return <Tooltip content={tooltip}>{button}</Tooltip>;
  }

  return button;
}
