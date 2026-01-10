// =============================================================================
// TOOLS PANEL
// =============================================================================
// Tool toggles panel for enabling/disabling AI tools.

import React from 'react';
import { Wrench, Globe, Terminal, Search, FileText, Code } from 'lucide-react';
import { cn } from '../../../lib';
import { InputHubPanel } from '../InputHubPanel';
import type { ToolConfig } from '../../../types';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface ToolsPanelProps {
  tools: ToolConfig[];
  onToggle: (toolId: string, enabled: boolean) => void;
  className?: string;
}

// -----------------------------------------------------------------------------
// CONSTANTS
// -----------------------------------------------------------------------------

const TOOL_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  globe: Globe,
  terminal: Terminal,
  search: Search,
  file: FileText,
  code: Code,
};

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function ToolsPanel({
  tools,
  onToggle,
  className,
}: ToolsPanelProps) {
  return (
    <InputHubPanel
      panelId="tools"
      title="Tools"
      icon={<Wrench size={10} />}
      compactHeader
      className={className}
    >
      <div className="h-full overflow-auto p-1.5">
        <div className="space-y-1">
          {tools.map((tool) => {
            const Icon = TOOL_ICONS[tool.icon || 'wrench'] || Wrench;

            return (
              <button
                key={tool.id}
                onClick={() => onToggle(tool.id, !tool.enabled)}
                className={cn(
                  'w-full flex items-center gap-2 px-2 py-1.5 rounded',
                  'text-left text-[11px]',
                  'transition-colors duration-100',
                  tool.enabled
                    ? 'bg-[var(--color-accent)]/20 text-[var(--color-text)]'
                    : 'hover:bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]'
                )}
              >
                <Icon
                  size={14}
                  className={cn(
                    tool.enabled
                      ? 'text-[var(--color-accent)]'
                      : 'text-[var(--color-text-tertiary)]'
                  )}
                />
                <span className="truncate flex-1">{tool.name}</span>
                <span
                  className={cn(
                    'w-8 h-4 rounded-full relative transition-colors',
                    tool.enabled
                      ? 'bg-[var(--color-accent)]'
                      : 'bg-[var(--color-bg-tertiary)]'
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-transform',
                      tool.enabled ? 'left-[18px]' : 'left-0.5'
                    )}
                  />
                </span>
              </button>
            );
          })}
        </div>

        {tools.length === 0 && (
          <div className="h-full flex items-center justify-center">
            <span className="text-[10px] text-[var(--color-text-tertiary)]">
              No tools available
            </span>
          </div>
        )}
      </div>
    </InputHubPanel>
  );
}
