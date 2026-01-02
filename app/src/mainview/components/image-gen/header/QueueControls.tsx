// =============================================================================
// QUEUE CONTROLS
// =============================================================================
// Play/Pause/Stop controls for the image generation queue.

import React from 'react';
import { Play, Pause, Square, StopCircle } from 'lucide-react';
import { IconButton } from '../../atoms/IconButton';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface QueueControlsProps {
  isRunning: boolean;
  activeJobCount: number;
  onStart: () => void;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
}

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function QueueControls({
  isRunning,
  activeJobCount,
  onStart,
  onStop,
  onPause,
  onResume,
}: QueueControlsProps) {
  const hasActiveJobs = activeJobCount > 0;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
      }}
    >
      {!isRunning ? (
        // Start button
        <button
          onClick={onStart}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            backgroundColor: 'var(--color-accent)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-accent-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-accent)';
          }}
        >
          <Play size={16} fill="currentColor" />
          Start Queue
        </button>
      ) : (
        // Running controls
        <>
          <IconButton
            icon={<Pause size={18} />}
            tooltip="Pause queue"
            onClick={onPause}
            variant="outline"
          />

          <IconButton
            icon={<Square size={16} fill="currentColor" />}
            tooltip="Stop all jobs"
            onClick={onStop}
            variant="outline"
          />
        </>
      )}

      {/* Cancel all button (shown when jobs are active) */}
      {hasActiveJobs && (
        <IconButton
          icon={<StopCircle size={18} />}
          tooltip="Cancel all jobs"
          onClick={onStop}
          variant="ghost"
        />
      )}
    </div>
  );
}
