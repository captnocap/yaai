import React from 'react';
import { cn } from '../../lib';

const sizes = {
  sm: { size: 24, stroke: 2.5 },
  md: { size: 36, stroke: 3 },
  lg: { size: 48, stroke: 4 },
} as const;

export interface ProgressRingProps {
  value: number;
  max?: number;
  size?: keyof typeof sizes;
  strokeWidth?: number;
  showValue?: boolean;
  variant?: 'default' | 'warning' | 'error';
  className?: string;
}

export function ProgressRing({
  value,
  max = 100,
  size = 'md',
  strokeWidth,
  showValue = false,
  variant,
  className,
}: ProgressRingProps) {
  const { size: svgSize, stroke: defaultStroke } = sizes[size];
  const actualStroke = strokeWidth || defaultStroke;
  const radius = (svgSize - actualStroke) / 2;
  const circumference = radius * 2 * Math.PI;
  const percent = Math.min(Math.max(value / max, 0), 1);
  const offset = circumference - percent * circumference;

  // Auto-determine variant based on percentage if not provided
  const actualVariant = variant || (
    percent >= 0.95 ? 'error' :
    percent >= 0.8 ? 'warning' :
    'default'
  );

  const colors = {
    default: 'stroke-[var(--color-accent)]',
    warning: 'stroke-[var(--color-warning)]',
    error: 'stroke-[var(--color-error)]',
  };

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        width={svgSize}
        height={svgSize}
        viewBox={`0 0 ${svgSize} ${svgSize}`}
        className="transform -rotate-90"
      >
        {/* Background ring */}
        <circle
          cx={svgSize / 2}
          cy={svgSize / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={actualStroke}
          className="text-[var(--color-border)]"
        />
        {/* Progress ring */}
        <circle
          cx={svgSize / 2}
          cy={svgSize / 2}
          r={radius}
          fill="none"
          strokeWidth={actualStroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn(
            colors[actualVariant],
            'transition-all duration-300 ease-out'
          )}
          style={{
            '--circumference': circumference,
            '--progress-offset': offset,
          } as React.CSSProperties}
        />
      </svg>
      {showValue && (
        <span className={cn(
          'absolute text-[var(--color-text-secondary)]',
          size === 'sm' && 'text-[8px]',
          size === 'md' && 'text-[10px]',
          size === 'lg' && 'text-xs'
        )}>
          {Math.round(percent * 100)}
        </span>
      )}
    </div>
  );
}
