// =============================================================================
// SOURCE STATE INDICATOR
// =============================================================================
// Animated visual indicator showing current source processing state.

import { Check, X, Clock, BookOpen, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import type { SourceState } from '../../../../shared/research-types';

interface SourceStateIndicatorProps {
  state: SourceState;
  size?: 'sm' | 'md' | 'lg';
}

const stateConfig: Record<SourceState, {
  icon: React.ElementType;
  color: string;
  bgColor: string;
  animate?: string;
  label: string;
}> = {
  pending: {
    icon: Clock,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/20',
    label: 'Pending Review',
  },
  approved: {
    icon: Sparkles,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    animate: 'animate-pulse',
    label: 'Queued',
  },
  reading: {
    icon: Loader2,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
    animate: 'animate-spin',
    label: 'Reading',
  },
  complete: {
    icon: Check,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/20',
    label: 'Complete',
  },
  rejected: {
    icon: X,
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/20',
    label: 'Rejected',
  },
  failed: {
    icon: AlertCircle,
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    label: 'Failed',
  },
};

const sizeConfig = {
  sm: {
    container: 'w-5 h-5',
    icon: 'w-3 h-3',
  },
  md: {
    container: 'w-7 h-7',
    icon: 'w-4 h-4',
  },
  lg: {
    container: 'w-9 h-9',
    icon: 'w-5 h-5',
  },
};

export function SourceStateIndicator({ state, size = 'md' }: SourceStateIndicatorProps) {
  const config = stateConfig[state];
  const sizes = sizeConfig[size];
  const Icon = config.icon;

  return (
    <div
      className={`
        flex items-center justify-center rounded-full
        ${sizes.container} ${config.bgColor}
        transition-all duration-300
      `}
      title={config.label}
    >
      <Icon
        className={`
          ${sizes.icon} ${config.color}
          ${config.animate || ''}
        `}
      />
    </div>
  );
}

// Larger badge version with label
export function SourceStateBadge({ state }: { state: SourceState }) {
  const config = stateConfig[state];
  const Icon = config.icon;

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium
        ${config.bgColor} ${config.color}
      `}
    >
      <Icon className={`w-3 h-3 ${config.animate || ''}`} />
      {config.label}
    </span>
  );
}

export default SourceStateIndicator;
