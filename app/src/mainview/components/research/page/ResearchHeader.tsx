// =============================================================================
// RESEARCH HEADER
// =============================================================================
// Header bar for research sessions with controls and view mode tabs.

import { ArrowLeft, Pause, Play, Settings, Download, List, Globe, Film, HelpCircle } from 'lucide-react';
import type { ResearchSession } from '../../../../shared/research-types';
import type { ViewMode } from '../../../hooks/useResearch';

interface ResearchHeaderProps {
  session: ResearchSession;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onPause: () => void;
  onResume: () => void;
  onExport: () => void;
}

export function ResearchHeader({
  session,
  viewMode,
  onViewModeChange,
  onPause,
  onResume,
  onExport,
}: ResearchHeaderProps) {
  const isRunning = ['scouting', 'reading', 'synthesizing'].includes(session.status);
  const isPaused = session.status === 'paused';
  const isComplete = session.status === 'completed';

  return (
    <header className="flex items-center justify-between h-14 px-4 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
      {/* Left: Back + Title */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => window.history.back()}
          className="p-2 -ml-2 rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex flex-col">
          <span className="text-xs text-[var(--color-text-tertiary)] uppercase tracking-wide">
            Deep Research
          </span>
          <span className="text-sm font-medium text-[var(--color-text)] truncate max-w-[300px]">
            {session.query}
          </span>
        </div>
      </div>

      {/* Center: View Mode Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--color-bg-tertiary)]">
        <ViewModeButton
          icon={<List className="w-4 h-4" />}
          label="List"
          active={viewMode === 'list'}
          onClick={() => onViewModeChange('list')}
        />
        <ViewModeButton
          icon={<Globe className="w-4 h-4" />}
          label="Galaxy"
          active={viewMode === 'galaxy'}
          onClick={() => onViewModeChange('galaxy')}
        />
        <ViewModeButton
          icon={<Film className="w-4 h-4" />}
          label="Cinema"
          active={viewMode === 'cinematic'}
          onClick={() => onViewModeChange('cinematic')}
          disabled={!isComplete}
        />
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-2">
        {/* Pause/Resume */}
        {isRunning && (
          <button
            onClick={onPause}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
          >
            <Pause className="w-4 h-4" />
            Pause
          </button>
        )}

        {isPaused && (
          <button
            onClick={onResume}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 transition-colors"
          >
            <Play className="w-4 h-4" />
            Resume
          </button>
        )}

        {/* Status Badge */}
        <StatusBadge status={session.status} />

        {/* Help */}
        <button
          className="p-2 rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
        >
          <HelpCircle className="w-5 h-5" />
        </button>

        {/* Settings */}
        <button
          className="p-2 rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
        >
          <Settings className="w-5 h-5" />
        </button>

        {/* Export */}
        <button
          onClick={onExport}
          disabled={!isComplete}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm bg-[var(--color-accent)] text-white hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>
    </header>
  );
}

// -----------------------------------------------------------------------------
// SUB-COMPONENTS
// -----------------------------------------------------------------------------

function ViewModeButton({
  icon,
  label,
  active,
  onClick,
  disabled = false,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
        active
          ? 'bg-[var(--color-accent)] text-white'
          : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {icon}
      {label}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; color: string; pulse?: boolean }> = {
    idle: { label: 'Ready', color: 'bg-gray-500/20 text-gray-400' },
    initializing: { label: 'Initializing', color: 'bg-blue-500/20 text-blue-400', pulse: true },
    scouting: { label: 'Scouting', color: 'bg-purple-500/20 text-purple-400', pulse: true },
    reading: { label: 'Reading', color: 'bg-amber-500/20 text-amber-400', pulse: true },
    synthesizing: { label: 'Writing', color: 'bg-emerald-500/20 text-emerald-400', pulse: true },
    paused: { label: 'Paused', color: 'bg-orange-500/20 text-orange-400' },
    completed: { label: 'Complete', color: 'bg-emerald-500/20 text-emerald-400' },
    failed: { label: 'Failed', color: 'bg-red-500/20 text-red-400' },
  };

  const config = statusConfig[status] || statusConfig.idle;

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${config.color} ${config.pulse ? 'animate-pulse' : ''}`}>
      {config.label}
    </span>
  );
}

export default ResearchHeader;
