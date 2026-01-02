// =============================================================================
// IMAGE GEN STATS
// =============================================================================
// Displays real-time statistics about the image generation pipeline.

import React from 'react';
import { Zap, Clock, Layers } from 'lucide-react';
import type { PipelineState } from '../../../types/image-gen';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface ImageGenStatsProps {
  pipelineState: PipelineState;
  activeJobCount: number;
}

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function ImageGenStats({ pipelineState, activeJobCount }: ImageGenStatsProps) {
  const { rateLimiter, concurrency, queue } = pipelineState;

  // Calculate rate limit availability
  const tokensAvailable = rateLimiter.config.maxTokens - rateLimiter.state.callTimestamps.length;
  const tokensPercent = (tokensAvailable / rateLimiter.config.maxTokens) * 100;

  // Calculate concurrency usage
  const concurrencyPercent = (concurrency.state.active / concurrency.config.maxConcurrent) * 100;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '6px 12px',
        backgroundColor: 'var(--color-bg-tertiary)',
        borderRadius: 'var(--radius-md)',
      }}
    >
      {/* Rate limit */}
      <StatItem
        icon={<Zap size={14} />}
        label="Rate"
        value={`${tokensAvailable}/${rateLimiter.config.maxTokens}`}
        percent={tokensPercent}
        color={tokensPercent > 50 ? 'var(--color-success)' : tokensPercent > 20 ? 'var(--color-warning)' : 'var(--color-error)'}
      />

      {/* Concurrency */}
      <StatItem
        icon={<Layers size={14} />}
        label="Active"
        value={`${concurrency.state.active}/${concurrency.config.maxConcurrent}`}
        percent={concurrencyPercent}
        color={concurrencyPercent < 80 ? 'var(--color-success)' : 'var(--color-warning)'}
      />

      {/* Queue */}
      <StatItem
        icon={<Clock size={14} />}
        label="Queue"
        value={`${queue.queued} / ${queue.inFlight} in-flight`}
      />

      {/* Jobs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '12px',
          color: 'var(--color-text-secondary)',
        }}
      >
        <span style={{ fontWeight: 500 }}>{activeJobCount}</span>
        <span>jobs</span>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// STAT ITEM
// -----------------------------------------------------------------------------

interface StatItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  percent?: number;
  color?: string;
}

function StatItem({ icon, label, value, percent, color }: StatItemProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
      }}
    >
      <span style={{ color: 'var(--color-text-tertiary)' }}>{icon}</span>
      <span
        style={{
          fontSize: '11px',
          color: 'var(--color-text-tertiary)',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: '12px',
          fontWeight: 500,
          color: color || 'var(--color-text)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </span>
      {percent !== undefined && (
        <div
          style={{
            width: '40px',
            height: '4px',
            backgroundColor: 'var(--color-bg)',
            borderRadius: '2px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${percent}%`,
              height: '100%',
              backgroundColor: color || 'var(--color-accent)',
              transition: 'width 0.2s ease',
            }}
          />
        </div>
      )}
    </div>
  );
}
