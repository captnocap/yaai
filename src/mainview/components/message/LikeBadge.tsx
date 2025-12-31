import React from 'react';
import { Heart } from 'lucide-react';
import { cn } from '../../lib';

export interface LikeBadgeProps {
  isLiked: boolean;
  onClick?: () => void;
  className?: string;
}

export function LikeBadge({
  isLiked,
  onClick,
  className,
}: LikeBadgeProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        'flex items-center justify-center',
        'p-1.5 rounded-full',
        'transition-all',
        isLiked
          ? 'bg-red-500/10 text-red-500'
          : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)] hover:text-red-500',
        onClick && 'cursor-pointer hover:scale-110',
        !onClick && 'cursor-default',
        className
      )}
    >
      <Heart
        className={cn(
          'h-4 w-4 transition-all',
          isLiked && 'fill-current animate-scale-bounce'
        )}
      />
    </button>
  );
}
