import React from 'react';
import { cn } from '../../lib';
import { Avatar, Badge } from '../atoms';
import type { ModelInfo } from '../../types';

// Provider colors for visual distinction
const providerColors: Record<string, string> = {
  openai: '#10a37f',
  anthropic: '#d97706',
  google: '#4285f4',
  meta: '#0668E1',
  mistral: '#ff7000',
  cohere: '#39594d',
};

export interface ModelBadgeProps {
  model: ModelInfo;
  size?: 'sm' | 'md';
  showProvider?: boolean;
  className?: string;
}

export function ModelBadge({
  model,
  size = 'md',
  showProvider = false,
  className,
}: ModelBadgeProps) {
  const providerColor = model?.provider
    ? (providerColors[model.provider.toLowerCase()] || '#6b7280')
    : '#6b7280';

  if (!model) return null;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Avatar
        src={model.avatar}
        fallback={model.name?.slice(0, 2) || 'AI'}
        size={size}
        variant="rounded"
      />
      <div className="min-w-0">
        <p
          className={cn(
            'font-medium text-[var(--color-text)] truncate',
            size === 'sm' ? 'text-sm' : 'text-base'
          )}
        >
          {model.name || 'Unknown Model'}
        </p>
        {showProvider && model.provider && (
          <p
            className="text-xs text-[var(--color-text-tertiary)] truncate"
            style={{ color: providerColor }}
          >
            {model.provider}
          </p>
        )}
      </div>
    </div>
  );
}

// Compact version for chips/lists
export function ModelChip({
  model,
  onRemove,
  className,
}: {
  model: ModelInfo;
  onRemove?: () => void;
  className?: string;
}) {
  if (!model) return null;

  const providerColor = model.provider
    ? (providerColors[model.provider.toLowerCase()] || '#6b7280')
    : '#6b7280';

  return (
    <Badge
      variant="default"
      className={cn(
        'gap-1.5 pl-1 pr-2 py-1',
        'border border-[var(--color-border)]',
        className
      )}
    >
      <span
        className="h-4 w-4 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
        style={{ backgroundColor: providerColor }}
      >
        {model.name?.[0] || '?'}
      </span>
      <span className="text-xs font-medium">{model.name || 'Unknown'}</span>
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-0.5 hover:text-[var(--color-error)] transition-colors"
        >
          ×
        </button>
      )}
    </Badge>
  );
}
