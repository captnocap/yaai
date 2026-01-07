// =============================================================================
// MEMORY STREAM ITEM
// =============================================================================
// Individual memory item in the stream, clickable to inject as context.

import React from 'react';
import { Brain, Zap, Heart, Search, Pin, Network } from 'lucide-react';
import { cn } from '../../../lib';
import type { MemoryResult, MemoryLayer } from '../../../types/memory';

// =============================================================================
// TYPES
// =============================================================================

export interface MemoryStreamItemProps {
  memory: MemoryResult;
  onClick: () => void;
  isAttached?: boolean;
}

// =============================================================================
// HELPERS
// =============================================================================

const LAYER_CONFIG: Record<MemoryLayer, { icon: typeof Brain; color: string; label: string }> = {
  L1: { icon: Brain, color: '#6b7280', label: 'Recent' },
  L2: { icon: Heart, color: '#ef4444', label: 'Affect' },
  L3: { icon: Search, color: '#3b82f6', label: 'Echo' },
  L4: { icon: Pin, color: '#f59e0b', label: 'Salient' },
  L5: { icon: Network, color: '#8b5cf6', label: 'Graph' },
};

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

function formatScore(score: number): string {
  return `${Math.round(score * 100)}%`;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function MemoryStreamItem({
  memory,
  onClick,
  isAttached = false,
}: MemoryStreamItemProps) {
  const layerConfig = LAYER_CONFIG[memory.layer];
  const LayerIcon = layerConfig.icon;

  return (
    <button
      onClick={onClick}
      disabled={isAttached}
      className={cn(
        'w-full text-left p-2 rounded-md transition-all',
        'border border-transparent',
        'hover:bg-[var(--color-bg-secondary)] hover:border-[var(--color-border)]',
        'focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]',
        'group',
        isAttached && 'opacity-50 cursor-not-allowed bg-[var(--color-bg-secondary)]'
      )}
      title={memory.content}
    >
      <div className="flex items-start gap-2">
        {/* Layer indicator */}
        <div
          className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center mt-0.5"
          style={{ backgroundColor: `${layerConfig.color}20` }}
        >
          <LayerIcon
            size={12}
            style={{ color: layerConfig.color }}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-[var(--color-text)] leading-relaxed line-clamp-2">
            {truncate(memory.content, 80)}
          </p>

          {/* Meta row */}
          <div className="flex items-center gap-2 mt-1">
            <span
              className="text-[10px] uppercase tracking-wider"
              style={{ color: layerConfig.color }}
            >
              {layerConfig.label}
            </span>

            {/* Score indicator */}
            <div className="flex items-center gap-1">
              <Zap size={10} className="text-[var(--color-text-tertiary)]" />
              <span className="text-[10px] text-[var(--color-text-tertiary)]">
                {formatScore(memory.score)}
              </span>
            </div>

            {/* Affect indicator if present */}
            {memory.metadata.affectCategory && (
              <span className="text-[10px] text-[var(--color-text-tertiary)] capitalize">
                {memory.metadata.affectCategory.toLowerCase()}
              </span>
            )}
          </div>
        </div>

        {/* Inject indicator on hover */}
        {!isAttached && (
          <span className="text-[10px] text-[var(--color-accent)] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            +add
          </span>
        )}

        {isAttached && (
          <span className="text-[10px] text-[var(--color-text-tertiary)] flex-shrink-0">
            added
          </span>
        )}
      </div>
    </button>
  );
}
