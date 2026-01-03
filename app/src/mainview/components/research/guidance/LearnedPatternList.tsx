// =============================================================================
// LEARNED PATTERN LIST
// =============================================================================
// Display patterns the research system has learned from user feedback.

import { Lightbulb, ThumbsUp, ThumbsDown, Clock, TrendingUp } from 'lucide-react';
import type { LearnedPattern } from '../../../../shared/research-types';

interface LearnedPatternListProps {
  patterns: LearnedPattern[];
}

export function LearnedPatternList({ patterns }: LearnedPatternListProps) {
  if (patterns.length === 0) {
    return (
      <div className="text-center py-6">
        <div className="w-12 h-12 rounded-full bg-[var(--color-bg-tertiary)] flex items-center justify-center mx-auto mb-3">
          <Lightbulb className="w-6 h-6 text-[var(--color-text-tertiary)]" />
        </div>
        <p className="text-sm text-[var(--color-text-secondary)] mb-1">
          No patterns learned yet
        </p>
        <p className="text-xs text-[var(--color-text-tertiary)]">
          As you approve or reject sources, the system learns your preferences
        </p>
      </div>
    );
  }

  // Group patterns by type
  const sourcePatterns = patterns.filter((p) => p.type === 'source-preference');
  const topicPatterns = patterns.filter((p) => p.type === 'topic-focus');
  const qualityPatterns = patterns.filter((p) => p.type === 'quality-signal');

  return (
    <div className="space-y-4">
      {/* Stats overview */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard
          icon={<ThumbsUp className="w-3.5 h-3.5" />}
          label="Source Prefs"
          value={sourcePatterns.length}
          color="emerald"
        />
        <StatCard
          icon={<TrendingUp className="w-3.5 h-3.5" />}
          label="Topic Focus"
          value={topicPatterns.length}
          color="blue"
        />
        <StatCard
          icon={<Lightbulb className="w-3.5 h-3.5" />}
          label="Quality Signals"
          value={qualityPatterns.length}
          color="amber"
        />
      </div>

      {/* Pattern list */}
      <div className="space-y-2">
        {patterns.slice(0, 10).map((pattern) => (
          <PatternCard key={pattern.id} pattern={pattern} />
        ))}
        {patterns.length > 10 && (
          <p className="text-xs text-[var(--color-text-tertiary)] text-center py-2">
            +{patterns.length - 10} more patterns
          </p>
        )}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// SUB-COMPONENTS
// -----------------------------------------------------------------------------

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: 'emerald' | 'blue' | 'amber';
}) {
  const colorClasses = {
    emerald: 'text-emerald-400 bg-emerald-500/20',
    blue: 'text-blue-400 bg-blue-500/20',
    amber: 'text-amber-400 bg-amber-500/20',
  };

  return (
    <div className="p-2 rounded-lg bg-[var(--color-bg-primary)] border border-[var(--color-border)] text-center">
      <div className={`inline-flex p-1.5 rounded ${colorClasses[color]} mb-1`}>
        {icon}
      </div>
      <div className="text-lg font-semibold text-[var(--color-text)]">{value}</div>
      <div className="text-[10px] text-[var(--color-text-tertiary)]">{label}</div>
    </div>
  );
}

function PatternCard({ pattern }: { pattern: LearnedPattern }) {
  const getPatternIcon = () => {
    switch (pattern.type) {
      case 'source-preference':
        return pattern.pattern.includes('prefer') ? (
          <ThumbsUp className="w-3.5 h-3.5 text-emerald-400" />
        ) : (
          <ThumbsDown className="w-3.5 h-3.5 text-red-400" />
        );
      case 'topic-focus':
        return <TrendingUp className="w-3.5 h-3.5 text-blue-400" />;
      case 'quality-signal':
        return <Lightbulb className="w-3.5 h-3.5 text-amber-400" />;
      default:
        return <Lightbulb className="w-3.5 h-3.5 text-[var(--color-text-tertiary)]" />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-emerald-400 bg-emerald-500/20';
    if (confidence >= 0.5) return 'text-amber-400 bg-amber-500/20';
    return 'text-gray-400 bg-gray-500/20';
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="p-2 rounded-lg bg-[var(--color-bg-primary)] border border-[var(--color-border)]">
      <div className="flex items-start gap-2">
        <div className="mt-0.5">{getPatternIcon()}</div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-[var(--color-text)] line-clamp-2">
            {pattern.pattern}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${getConfidenceColor(pattern.confidence)}`}
            >
              {Math.round(pattern.confidence * 100)}% confident
            </span>
            <span className="flex items-center gap-1 text-[10px] text-[var(--color-text-tertiary)]">
              <Clock className="w-3 h-3" />
              {formatDate(pattern.learnedAt)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LearnedPatternList;
