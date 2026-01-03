// =============================================================================
// CINEMATIC CONTROLS
// =============================================================================
// Playback controls for cinematic mode.

import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
} from 'lucide-react';
import { useState } from 'react';

interface CinematicControlsProps {
  isPlaying: boolean;
  currentTime: number;
  totalDuration: number;
  speed: number;
  volume?: number;
  isFullscreen?: boolean;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onSpeedChange: (speed: number) => void;
  onVolumeChange?: (volume: number) => void;
  onToggleFullscreen?: () => void;
  onSkipBack?: () => void;
  onSkipForward?: () => void;
}

export function CinematicControls({
  isPlaying,
  currentTime,
  totalDuration,
  speed,
  volume = 1,
  isFullscreen = false,
  onPlayPause,
  onSeek,
  onSpeedChange,
  onVolumeChange,
  onToggleFullscreen,
  onSkipBack,
  onSkipForward,
}: CinematicControlsProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Format time as mm:ss
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Calculate progress percentage
  const progress = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  // Handle scrubber click
  const handleScrubberClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percentage = (e.clientX - rect.left) / rect.width;
    onSeek(percentage * totalDuration);
  };

  // Handle volume toggle
  const handleVolumeToggle = () => {
    if (isMuted) {
      setIsMuted(false);
      onVolumeChange?.(1);
    } else {
      setIsMuted(true);
      onVolumeChange?.(0);
    }
  };

  const speedOptions = [0.5, 0.75, 1, 1.25, 1.5, 2];

  return (
    <div className="relative bg-gradient-to-t from-black/80 to-transparent pt-8 pb-4 px-4">
      {/* Progress bar / scrubber */}
      <div
        className="h-1 bg-white/20 rounded-full cursor-pointer mb-4 group"
        onClick={handleScrubberClick}
      >
        <div
          className="h-full bg-[var(--color-accent)] rounded-full relative transition-all"
          style={{ width: `${progress}%` }}
        >
          {/* Scrubber handle */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      {/* Controls row */}
      <div className="flex items-center justify-between">
        {/* Left: Play controls */}
        <div className="flex items-center gap-2">
          {/* Skip back */}
          {onSkipBack && (
            <button
              onClick={onSkipBack}
              className="p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              title="Previous section"
            >
              <SkipBack className="w-5 h-5" />
            </button>
          )}

          {/* Play/Pause */}
          <button
            onClick={onPlayPause}
            className="p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            {isPlaying ? (
              <Pause className="w-6 h-6" />
            ) : (
              <Play className="w-6 h-6 ml-0.5" />
            )}
          </button>

          {/* Skip forward */}
          {onSkipForward && (
            <button
              onClick={onSkipForward}
              className="p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              title="Next section"
            >
              <SkipForward className="w-5 h-5" />
            </button>
          )}

          {/* Time display */}
          <div className="text-sm text-white/80 tabular-nums ml-2">
            {formatTime(currentTime)} / {formatTime(totalDuration)}
          </div>
        </div>

        {/* Right: Volume, Speed, Fullscreen */}
        <div className="flex items-center gap-2">
          {/* Volume */}
          {onVolumeChange && (
            <button
              onClick={handleVolumeToggle}
              className="p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-5 h-5" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </button>
          )}

          {/* Speed selector */}
          <div className="relative">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center gap-1 px-2 py-1 rounded text-sm text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Settings className="w-4 h-4" />
              {speed}x
            </button>

            {/* Speed dropdown */}
            {showSettings && (
              <div className="absolute bottom-full right-0 mb-2 p-2 rounded-lg bg-[var(--color-bg-primary)] border border-[var(--color-border)] shadow-xl">
                <div className="text-xs text-[var(--color-text-tertiary)] uppercase tracking-wide mb-2 px-2">
                  Playback Speed
                </div>
                <div className="space-y-1">
                  {speedOptions.map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        onSpeedChange(s);
                        setShowSettings(false);
                      }}
                      className={`w-full px-3 py-1.5 rounded text-sm text-left transition-colors ${
                        speed === s
                          ? 'bg-[var(--color-accent)] text-white'
                          : 'text-[var(--color-text)] hover:bg-[var(--color-bg-tertiary)]'
                      }`}
                    >
                      {s}x {s === 1 && '(Normal)'}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Fullscreen */}
          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              className="p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            >
              {isFullscreen ? (
                <Minimize className="w-5 h-5" />
              ) : (
                <Maximize className="w-5 h-5" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Mini controls for overlay
export function CinematicControlsMini({
  isPlaying,
  progress,
  onPlayPause,
}: {
  isPlaying: boolean;
  progress: number;
  onPlayPause: () => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onPlayPause}
        className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
      >
        {isPlaying ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Play className="w-4 h-4 ml-0.5" />
        )}
      </button>
      <div className="w-24 h-1 bg-white/20 rounded-full">
        <div
          className="h-full bg-white rounded-full transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

export default CinematicControls;
