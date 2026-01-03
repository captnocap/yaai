// =============================================================================
// RESEARCH PROGRESS
// =============================================================================
// Mini progress indicator for research sessions.

import { Loader2 } from 'lucide-react';
import type { SessionStatus, ResearchStats } from '../../../../shared/research-types';

interface ResearchProgressProps {
  status: SessionStatus;
  stats: ResearchStats;
  className?: string;
}

export function ResearchProgress({ status, stats, className = '' }: ResearchProgressProps) {
  // Calculate progress based on status
  const getProgress = (): number => {
    switch (status) {
      case 'idle':
        return 0;
      case 'initializing':
        return 5;
      case 'scouting':
        // Scouting progress: 5-30%
        const scoutProgress = Math.min(stats.sourcesSearched / 20, 1);
        return 5 + scoutProgress * 25;
      case 'reading':
        // Reading progress: 30-70%
        const totalToRead = stats.sourcesQueued + stats.sourcesRead;
        const readProgress = totalToRead > 0 ? stats.sourcesRead / totalToRead : 0;
        return 30 + readProgress * 40;
      case 'synthesizing':
        // Synthesizing: 70-100%
        return 70 + (stats.reportProgress / 100) * 30;
      case 'completed':
        return 100;
      case 'paused':
        // Keep current progress
        if (stats.reportProgress > 0) return 70 + (stats.reportProgress / 100) * 30;
        if (stats.sourcesRead > 0) return 30 + (stats.sourcesRead / (stats.sourcesQueued + stats.sourcesRead)) * 40;
        return 5 + Math.min(stats.sourcesSearched / 20, 1) * 25;
      case 'failed':
        return 0;
      default:
        return 0;
    }
  };

  const progress = getProgress();
  const statusLabel = getStatusLabel(status);
  const statusColor = getStatusColor(status);

  return (
    <div className={className}>
      {/* Progress bar */}
      <div className="h-1.5 bg-[var(--color-bg-tertiary)] rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${statusColor}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Status label */}
      <div className="flex items-center justify-between mt-1.5">
        <div className="flex items-center gap-1.5">
          {isActive(status) && (
            <Loader2 className="w-3 h-3 animate-spin text-[var(--color-text-tertiary)]" />
          )}
          <span className="text-[10px] text-[var(--color-text-tertiary)]">
            {statusLabel}
          </span>
        </div>
        <span className="text-[10px] text-[var(--color-text-tertiary)] tabular-nums">
          {Math.round(progress)}%
        </span>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// CIRCULAR PROGRESS
// -----------------------------------------------------------------------------

interface CircularProgressProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  status: SessionStatus;
  showLabel?: boolean;
}

export function CircularProgress({
  progress,
  size = 40,
  strokeWidth = 3,
  status,
  showLabel = true,
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;
  const color = getStatusColorHex(status);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-bg-tertiary)"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[10px] font-medium text-[var(--color-text)]">
            {Math.round(progress)}%
          </span>
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// STAGE INDICATOR
// -----------------------------------------------------------------------------

interface StageIndicatorProps {
  status: SessionStatus;
  className?: string;
}

export function StageIndicator({ status, className = '' }: StageIndicatorProps) {
  const stages = [
    { id: 'scout', label: 'Scout', statuses: ['scouting'] },
    { id: 'read', label: 'Read', statuses: ['reading'] },
    { id: 'write', label: 'Write', statuses: ['synthesizing'] },
    { id: 'done', label: 'Done', statuses: ['completed'] },
  ];

  const getCurrentStageIndex = () => {
    for (let i = 0; i < stages.length; i++) {
      if (stages[i].statuses.includes(status)) return i;
    }
    if (status === 'completed') return stages.length;
    return -1;
  };

  const currentIndex = getCurrentStageIndex();

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {stages.map((stage, index) => {
        const isActive = stage.statuses.includes(status);
        const isComplete = index < currentIndex;

        return (
          <div key={stage.id} className="flex items-center">
            <div
              className={`w-2 h-2 rounded-full transition-colors ${
                isActive
                  ? 'bg-[var(--color-accent)] animate-pulse'
                  : isComplete
                    ? 'bg-emerald-400'
                    : 'bg-[var(--color-bg-tertiary)]'
              }`}
            />
            {index < stages.length - 1 && (
              <div
                className={`w-4 h-0.5 transition-colors ${
                  isComplete ? 'bg-emerald-400' : 'bg-[var(--color-bg-tertiary)]'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

function getStatusLabel(status: SessionStatus): string {
  switch (status) {
    case 'idle':
      return 'Ready to start';
    case 'initializing':
      return 'Initializing...';
    case 'scouting':
      return 'Discovering sources...';
    case 'reading':
      return 'Reading sources...';
    case 'synthesizing':
      return 'Writing report...';
    case 'paused':
      return 'Paused';
    case 'completed':
      return 'Complete';
    case 'failed':
      return 'Failed';
    default:
      return '';
  }
}

function getStatusColor(status: SessionStatus): string {
  switch (status) {
    case 'scouting':
    case 'initializing':
      return 'bg-blue-500';
    case 'reading':
      return 'bg-purple-500';
    case 'synthesizing':
      return 'bg-emerald-500';
    case 'completed':
      return 'bg-emerald-500';
    case 'paused':
      return 'bg-amber-500';
    case 'failed':
      return 'bg-red-500';
    default:
      return 'bg-gray-500';
  }
}

function getStatusColorHex(status: SessionStatus): string {
  switch (status) {
    case 'scouting':
    case 'initializing':
      return '#3b82f6';
    case 'reading':
      return '#a855f7';
    case 'synthesizing':
    case 'completed':
      return '#10b981';
    case 'paused':
      return '#f59e0b';
    case 'failed':
      return '#ef4444';
    default:
      return '#6b7280';
  }
}

function isActive(status: SessionStatus): boolean {
  return ['initializing', 'scouting', 'reading', 'synthesizing'].includes(status);
}

export default ResearchProgress;
