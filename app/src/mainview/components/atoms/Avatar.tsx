import React, { useState } from 'react';
import { cn } from '../../lib';

const sizes = {
  sm: { container: 'h-6 w-6', text: 'text-xs' },
  md: { container: 'h-8 w-8', text: 'text-sm' },
  lg: { container: 'h-10 w-10', text: 'text-base' },
} as const;

const statusColors = {
  online: 'bg-[#22c55e]',
  busy: 'bg-[#f59e0b]',
  offline: 'bg-[#9ca3af]',
} as const;

export interface AvatarProps {
  src?: string;
  fallback: string;
  alt?: string;
  size?: keyof typeof sizes;
  variant?: 'circle' | 'rounded';
  status?: keyof typeof statusColors;
  className?: string;
}

export function Avatar({
  src,
  fallback,
  alt,
  size = 'md',
  variant = 'circle',
  status,
  className,
}: AvatarProps) {
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  const initials = fallback
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const showImage = src && !imgError;
  const sizeStyle = sizes[size];

  return (
    <div className={cn('relative inline-flex', className)}>
      <div
        className={cn(
          'relative flex shrink-0 overflow-hidden bg-[var(--color-bg-tertiary)]',
          sizeStyle.container,
          variant === 'circle' ? 'rounded-full' : 'rounded-[var(--radius-md)]',
          'transition-transform hover:scale-105'
        )}
      >
        {showImage && (
          <img
            src={src}
            alt={alt || fallback}
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
            className={cn(
              'h-full w-full object-cover',
              imgLoaded ? 'opacity-100' : 'opacity-0',
              'transition-opacity duration-200'
            )}
          />
        )}
        {(!showImage || !imgLoaded) && (
          <div
            className={cn(
              'absolute inset-0 flex items-center justify-center',
              'bg-[var(--color-accent-subtle)] text-[var(--color-accent)]',
              'font-medium select-none',
              sizeStyle.text
            )}
          >
            {initials}
          </div>
        )}
      </div>

      {status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 block rounded-full',
            'ring-2 ring-[var(--color-bg)]',
            size === 'sm' ? 'h-2 w-2' : 'h-2.5 w-2.5',
            statusColors[status]
          )}
          style={status === 'online' ? { animation: 'pulse 2s infinite' } : undefined}
        />
      )}
    </div>
  );
}
