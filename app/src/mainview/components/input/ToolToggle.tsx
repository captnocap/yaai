import React from 'react';
import {
  Globe,
  Terminal,
  Code,
  FileSearch,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '../../lib';
import { Toggle, Tooltip } from '../atoms';

const toolIcons: Record<string, LucideIcon> = {
  browser: Globe,
  terminal: Terminal,
  code: Code,
  file: FileSearch,
};

export interface ToolToggleProps {
  tool: {
    id: string;
    name: string;
    icon?: string;
    description?: string;
  };
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  className?: string;
}

export function ToolToggle({
  tool,
  enabled,
  onChange,
  className,
}: ToolToggleProps) {
  const Icon = toolIcons[tool.icon || tool.id] || Code;

  return (
    <Tooltip
      content={
        <div>
          <div className="font-medium">{tool.name}</div>
          {tool.description && (
            <div className="text-xs text-[var(--color-text-secondary)] mt-1">
              {tool.description}
            </div>
          )}
        </div>
      }
    >
      <button
        type="button"
        onClick={() => onChange(!enabled)}
        className={cn(
          'flex items-center gap-2 px-2.5 py-1.5 rounded-full',
          'text-sm font-medium transition-colors',
          enabled
            ? 'bg-[var(--color-accent-subtle)] text-[var(--color-accent)]'
            : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]',
          className
        )}
      >
        <Icon className="h-4 w-4" />
        <span className="hidden sm:inline">{tool.name}</span>
      </button>
    </Tooltip>
  );
}
