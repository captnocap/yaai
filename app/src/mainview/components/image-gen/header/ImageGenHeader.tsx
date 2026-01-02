// =============================================================================
// IMAGE GEN HEADER
// =============================================================================
// Header bar for the image generation page with stats and controls.

import React from 'react';
import { Play, Pause, Square, Settings, Activity } from 'lucide-react';
import { IconButton } from '../../atoms/IconButton';
import { ImageGenStats } from './ImageGenStats';
import { QueueControls } from './QueueControls';
import type { PipelineState, ImageGenSettings } from '../../../types/image-gen';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface ImageGenHeaderProps {
  pipelineState: PipelineState | null;
  settings: ImageGenSettings | null;
  activeJobCount: number;
  onStart: () => void;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
  onSettingsClick?: () => void;
}

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function ImageGenHeader({
  pipelineState,
  settings,
  activeJobCount,
  onStart,
  onStop,
  onPause,
  onResume,
  onSettingsClick,
}: ImageGenHeaderProps) {
  const isRunning = pipelineState?.running ?? false;

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-bg-elevated)',
        gap: '16px',
      }}
    >
      {/* Left: Title and stats */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Activity
            size={20}
            style={{ color: 'var(--color-accent)' }}
          />
          <h1
            style={{
              fontSize: '16px',
              fontWeight: 600,
              color: 'var(--color-text)',
              margin: 0,
            }}
          >
            Image Generation
          </h1>
        </div>

        {pipelineState && (
          <ImageGenStats
            pipelineState={pipelineState}
            activeJobCount={activeJobCount}
          />
        )}
      </div>

      {/* Right: Controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <QueueControls
          isRunning={isRunning}
          activeJobCount={activeJobCount}
          onStart={onStart}
          onStop={onStop}
          onPause={onPause}
          onResume={onResume}
        />

        <div
          style={{
            width: '1px',
            height: '24px',
            backgroundColor: 'var(--color-border)',
            margin: '0 8px',
          }}
        />

        <IconButton
          icon={<Settings size={18} />}
          tooltip="Image Gen Settings"
          onClick={onSettingsClick}
        />
      </div>
    </header>
  );
}
