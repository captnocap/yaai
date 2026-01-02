import React from 'react';
import { AtSign, FileText, Variable } from 'lucide-react';
import { cn } from '../../lib';
import { Tooltip } from '../atoms';

const typeConfig = {
  user: {
    icon: AtSign,
    color: 'text-blue-500 bg-blue-500/10 hover:bg-blue-500/20',
  },
  file: {
    icon: FileText,
    color: 'text-green-500 bg-green-500/10 hover:bg-green-500/20',
  },
  variable: {
    icon: Variable,
    color: 'text-purple-500 bg-purple-500/10 hover:bg-purple-500/20',
  },
} as const;

export interface MentionProps {
  type: keyof typeof typeConfig;
  value: string;
  displayValue?: string;
  onClick?: () => void;
  className?: string;
}

export function Mention({
  type,
  value,
  displayValue,
  onClick,
  className,
}: MentionProps) {
  const config = typeConfig[type];
  const Icon = config.icon;

  const content = (
    <span
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[var(--radius-sm)]',
        'text-sm font-medium transition-colors',
        config.color,
        onClick && 'cursor-pointer',
        className
      )}
    >
      <Icon className="h-3 w-3" />
      <span className="max-w-[150px] truncate">
        {displayValue || value}
      </span>
    </span>
  );

  // Show full value in tooltip if truncated or if it differs from display
  if (displayValue && displayValue !== value) {
    return (
      <Tooltip content={value}>
        {content}
      </Tooltip>
    );
  }

  return content;
}
