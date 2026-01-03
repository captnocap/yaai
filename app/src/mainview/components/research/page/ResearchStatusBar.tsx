// =============================================================================
// RESEARCH STATUS BAR
// =============================================================================
// Bottom status bar showing research progress stats, scouts, readers, and cost.

import { Search, BookOpen, Lightbulb, Clock, DollarSign, Users } from 'lucide-react';
import type { ResearchSession } from '../../../../shared/research-types';

interface ResearchStatusBarProps {
  session: ResearchSession;
}

export function ResearchStatusBar({ session }: ResearchStatusBarProps) {
  const { stats, config } = session;

  // Format elapsed time
  const formatElapsed = (ms: number) => {
    const seconds = Math.floor((ms || 0) / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  // Format cost
  const formatCost = (cost: number | undefined) => {
    if (cost === undefined || cost < 0.01) return '< $0.01';
    return `$${cost.toFixed(2)}`;
  };

  return (
    <footer className="flex items-center justify-between h-10 px-4 border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-xs">
      {/* Left: Progress Stats */}
      <div className="flex items-center gap-6">
        <StatItem
          icon={<Search className="w-3.5 h-3.5" />}
          label="Searched"
          value={stats.sourcesSearched}
          color="text-blue-400"
        />
        <StatItem
          icon={<BookOpen className="w-3.5 h-3.5" />}
          label="Queued"
          value={stats.sourcesQueued}
          color="text-amber-400"
        />
        <StatItem
          icon={<Lightbulb className="w-3.5 h-3.5" />}
          label="Findings"
          value={stats.findingsExtracted}
          color="text-emerald-400"
        />
      </div>

      {/* Center: Agents */}
      <div className="flex items-center gap-4">
        <AgentCounter
          icon={<Users className="w-3.5 h-3.5" />}
          label="Scouts"
          active={stats.activeScouts || 0}
          total={config?.maxConcurrentScouts || 3}
        />
        <AgentCounter
          icon={<BookOpen className="w-3.5 h-3.5" />}
          label="Readers"
          active={stats.activeReaders || 0}
          total={config?.maxConcurrentReaders || 3}
        />
      </div>

      {/* Right: Time & Cost */}
      <div className="flex items-center gap-6">
        <StatItem
          icon={<Clock className="w-3.5 h-3.5" />}
          label="Elapsed"
          value={formatElapsed(stats.elapsedTime || stats.elapsedMs || 0)}
          color="text-[var(--color-text-secondary)]"
          isText
        />
        <StatItem
          icon={<DollarSign className="w-3.5 h-3.5" />}
          label="Cost"
          value={formatCost(stats.estimatedCostUsd)}
          color="text-purple-400"
          isText
        />
      </div>
    </footer>
  );
}

// -----------------------------------------------------------------------------
// SUB-COMPONENTS
// -----------------------------------------------------------------------------

function StatItem({
  icon,
  label,
  value,
  color,
  isText = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: string;
  isText?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className={`${color}`}>{icon}</span>
      <span className="text-[var(--color-text-tertiary)]">{label}:</span>
      <span className={`font-medium ${isText ? 'text-[var(--color-text-secondary)]' : 'text-[var(--color-text)] tabular-nums'}`}>
        {value}
      </span>
    </div>
  );
}

function AgentCounter({
  icon,
  label,
  active,
  total,
}: {
  icon: React.ReactNode;
  label: string;
  active: number;
  total: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[var(--color-text-tertiary)]">{icon}</span>
      <span className="text-[var(--color-text-tertiary)]">{label}:</span>
      <span className="font-medium text-[var(--color-text)] tabular-nums">
        <span className={active > 0 ? 'text-emerald-400' : ''}>{active}</span>
        <span className="text-[var(--color-text-tertiary)]">/</span>
        {total}
      </span>
      {active > 0 && (
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
      )}
    </div>
  );
}

export default ResearchStatusBar;
