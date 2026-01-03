// =============================================================================
// RESEARCH EMBED
// =============================================================================
// Embeddable card for chat messages showing research session status.

import { useNavigate } from 'wouter';
import {
  Search,
  BookOpen,
  FileText,
  CheckCircle,
  Loader2,
  ArrowRight,
  Sparkles,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import type { ResearchSession, SessionStatus } from '../../../../shared/research-types';
import { ResearchProgress } from './ResearchProgress';

interface ResearchEmbedProps {
  session: ResearchSession;
  compact?: boolean;
  onClick?: () => void;
}

export function ResearchEmbed({ session, compact = false, onClick }: ResearchEmbedProps) {
  const [, navigate] = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigate(`/research/${session.id}`);
    }
  };

  const isComplete = session.status === 'completed';
  const isRunning = ['scouting', 'reading', 'synthesizing', 'initializing'].includes(session.status);
  const isFailed = session.status === 'failed';

  if (compact) {
    return (
      <ResearchEmbedCompact
        session={session}
        onClick={handleClick}
      />
    );
  }

  return (
    <div
      onClick={handleClick}
      className="group relative w-full max-w-md rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] hover:border-[var(--color-accent)]/50 cursor-pointer transition-all overflow-hidden"
    >
      {/* Header gradient */}
      <div className={`h-1 ${getStatusGradient(session.status)}`} />

      {/* Content */}
      <div className="p-4">
        {/* Title row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${getStatusBgColor(session.status)}`}>
              <StatusIcon status={session.status} />
            </div>
            <div>
              <span className="text-xs text-[var(--color-text-tertiary)] uppercase tracking-wide">
                Deep Research
              </span>
              <h3 className="text-sm font-medium text-[var(--color-text)] line-clamp-2 mt-0.5">
                {session.query}
              </h3>
            </div>
          </div>
          <StatusBadge status={session.status} />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-3">
          <StatItem
            icon={<Search className="w-3.5 h-3.5" />}
            label="Sources"
            value={session.stats.sourcesSearched}
            color="text-blue-400"
          />
          <StatItem
            icon={<BookOpen className="w-3.5 h-3.5" />}
            label="Read"
            value={session.stats.sourcesRead}
            color="text-purple-400"
          />
          <StatItem
            icon={<Sparkles className="w-3.5 h-3.5" />}
            label="Findings"
            value={session.stats.findingsExtracted}
            color="text-amber-400"
          />
        </div>

        {/* Progress bar for running sessions */}
        {isRunning && (
          <ResearchProgress
            status={session.status}
            stats={session.stats}
            className="mb-3"
          />
        )}

        {/* Report preview for complete sessions */}
        {isComplete && session.stats.reportProgress > 0 && (
          <div className="p-2 rounded bg-[var(--color-bg-tertiary)] mb-3">
            <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              <span>Report ready · {Math.round(session.stats.reportProgress)}% complete</span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-[var(--color-border)]">
          <span className="text-xs text-[var(--color-text-tertiary)]">
            {formatElapsed(session.stats.elapsedTime)}
          </span>
          <span className="flex items-center gap-1 text-xs text-[var(--color-accent)] group-hover:gap-2 transition-all">
            {isComplete ? 'View Report' : isRunning ? 'Monitor Progress' : 'View Details'}
            <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// COMPACT VERSION
// -----------------------------------------------------------------------------

function ResearchEmbedCompact({
  session,
  onClick,
}: {
  session: ResearchSession;
  onClick: () => void;
}) {
  const isRunning = ['scouting', 'reading', 'synthesizing', 'initializing'].includes(session.status);

  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] hover:border-[var(--color-accent)]/50 transition-colors"
    >
      <StatusIcon status={session.status} size="sm" />
      <span className="text-sm text-[var(--color-text)] truncate max-w-[200px]">
        {session.query}
      </span>
      {isRunning && (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--color-accent)]/20 text-[var(--color-accent)] animate-pulse">
          Live
        </span>
      )}
      <ArrowRight className="w-3.5 h-3.5 text-[var(--color-text-tertiary)]" />
    </button>
  );
}

// -----------------------------------------------------------------------------
// SUB-COMPONENTS
// -----------------------------------------------------------------------------

function StatusIcon({ status, size = 'md' }: { status: SessionStatus; size?: 'sm' | 'md' }) {
  const sizeClass = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

  switch (status) {
    case 'idle':
    case 'initializing':
      return <Search className={`${sizeClass} text-blue-400`} />;
    case 'scouting':
      return <Search className={`${sizeClass} text-blue-400 animate-pulse`} />;
    case 'reading':
      return <BookOpen className={`${sizeClass} text-purple-400 animate-pulse`} />;
    case 'synthesizing':
      return <FileText className={`${sizeClass} text-emerald-400 animate-pulse`} />;
    case 'paused':
      return <Clock className={`${sizeClass} text-amber-400`} />;
    case 'completed':
      return <CheckCircle className={`${sizeClass} text-emerald-400`} />;
    case 'failed':
      return <AlertTriangle className={`${sizeClass} text-red-400`} />;
    default:
      return <Search className={`${sizeClass} text-gray-400`} />;
  }
}

function StatusBadge({ status }: { status: SessionStatus }) {
  const config = {
    idle: { label: 'Ready', color: 'bg-gray-500/20 text-gray-400' },
    initializing: { label: 'Starting', color: 'bg-blue-500/20 text-blue-400' },
    scouting: { label: 'Scouting', color: 'bg-blue-500/20 text-blue-400' },
    reading: { label: 'Reading', color: 'bg-purple-500/20 text-purple-400' },
    synthesizing: { label: 'Writing', color: 'bg-emerald-500/20 text-emerald-400' },
    paused: { label: 'Paused', color: 'bg-amber-500/20 text-amber-400' },
    completed: { label: 'Complete', color: 'bg-emerald-500/20 text-emerald-400' },
    failed: { label: 'Failed', color: 'bg-red-500/20 text-red-400' },
  };

  const { label, color } = config[status] || config.idle;
  const isAnimated = ['scouting', 'reading', 'synthesizing', 'initializing'].includes(status);

  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${color} ${isAnimated ? 'animate-pulse' : ''}`}>
      {label}
    </span>
  );
}

function StatItem({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="text-center">
      <div className={`flex items-center justify-center gap-1 ${color}`}>
        {icon}
        <span className="text-sm font-semibold text-[var(--color-text)] tabular-nums">
          {value}
        </span>
      </div>
      <span className="text-[10px] text-[var(--color-text-tertiary)]">{label}</span>
    </div>
  );
}

function getStatusGradient(status: SessionStatus): string {
  switch (status) {
    case 'scouting':
      return 'bg-gradient-to-r from-blue-500 via-blue-400 to-blue-500 animate-pulse';
    case 'reading':
      return 'bg-gradient-to-r from-purple-500 via-purple-400 to-purple-500 animate-pulse';
    case 'synthesizing':
      return 'bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500 animate-pulse';
    case 'completed':
      return 'bg-gradient-to-r from-emerald-500 to-emerald-400';
    case 'failed':
      return 'bg-gradient-to-r from-red-500 to-red-400';
    case 'paused':
      return 'bg-gradient-to-r from-amber-500 to-amber-400';
    default:
      return 'bg-gradient-to-r from-gray-500 to-gray-400';
  }
}

function getStatusBgColor(status: SessionStatus): string {
  switch (status) {
    case 'scouting':
    case 'initializing':
      return 'bg-blue-500/20';
    case 'reading':
      return 'bg-purple-500/20';
    case 'synthesizing':
      return 'bg-emerald-500/20';
    case 'completed':
      return 'bg-emerald-500/20';
    case 'failed':
      return 'bg-red-500/20';
    case 'paused':
      return 'bg-amber-500/20';
    default:
      return 'bg-gray-500/20';
  }
}

function formatElapsed(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m elapsed`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s elapsed`;
  }
  return `${seconds}s elapsed`;
}

export default ResearchEmbed;
