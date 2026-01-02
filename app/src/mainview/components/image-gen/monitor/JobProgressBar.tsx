// =============================================================================
// JOB PROGRESS BAR
// =============================================================================
// Visual progress indicator for a job.

import React from 'react';
import type { JobStats } from '../../../types/image-gen';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface JobProgressBarProps {
  progress: number;  // 0-1
  stats: JobStats;
  isPaused: boolean;
  isAutoPaused: boolean;
}

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function JobProgressBar({
  progress,
  stats,
  isPaused,
  isAutoPaused,
}: JobProgressBarProps) {
  const percentage = Math.min(progress * 100, 100);

  // Color based on state
  const barColor = isAutoPaused
    ? 'var(--color-error)'
    : isPaused
      ? 'var(--color-warning)'
      : 'var(--color-accent)';

  return (
    <div
      style={{
        position: 'relative',
        height: '8px',
        backgroundColor: 'var(--color-bg-tertiary)',
        borderRadius: '4px',
        overflow: 'hidden',
      }}
    >
      {/* Progress fill */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: `${percentage}%`,
          backgroundColor: barColor,
          borderRadius: '4px',
          transition: 'width 0.3s ease, background-color 0.2s ease',
        }}
      />

      {/* Animated shimmer when running */}
      {!isPaused && !isAutoPaused && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: `${percentage}%`,
            background: `linear-gradient(
              90deg,
              transparent 0%,
              rgba(255, 255, 255, 0.2) 50%,
              transparent 100%
            )`,
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
            borderRadius: '4px',
          }}
        />
      )}

      {/* Failed batches indicator */}
      {stats.failedBatches > 0 && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: `${(stats.failedBatches / Math.max(stats.expectedBatches, 1)) * 100}%`,
            backgroundColor: 'var(--color-error)',
            opacity: 0.5,
            borderRadius: '4px',
          }}
        />
      )}

      <style>
        {`
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
        `}
      </style>
    </div>
  );
}
