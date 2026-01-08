import React, { useState } from 'react';
import * as Collapsible from '@radix-ui/react-collapsible';
import {
  ChevronDown,
  Loader2,
  Check,
  X,
  Clock,
  FileEdit,
  Terminal,
  Search,
  Globe,
  FolderOpen,
  FileText,
  Code,
  Database,
  Wrench
} from 'lucide-react';
import { cn } from '../../../lib';

export type ToolStatus = 'pending' | 'running' | 'success' | 'error' | 'cancelled';

export interface ToolCallData {
  id: string;
  name: string;
  input: Record<string, unknown>;
  output?: unknown;
  status: ToolStatus;
  startTime?: string;
  endTime?: string;
  duration?: number;
  error?: string;
}

export interface ToolCallAccordionProps {
  toolCalls: ToolCallData[];
  /** Default expanded state */
  defaultExpanded?: boolean;
  className?: string;
}

// Get icon for tool type
function getToolIcon(toolName: string) {
  const name = toolName.toLowerCase();

  if (name.includes('write') || name.includes('edit')) return FileEdit;
  if (name.includes('bash') || name.includes('shell') || name.includes('terminal')) return Terminal;
  if (name.includes('search') || name.includes('grep') || name.includes('find')) return Search;
  if (name.includes('web') || name.includes('fetch') || name.includes('http')) return Globe;
  if (name.includes('read') || name.includes('file')) return FileText;
  if (name.includes('glob') || name.includes('list') || name.includes('dir')) return FolderOpen;
  if (name.includes('code') || name.includes('execute')) return Code;
  if (name.includes('sql') || name.includes('database') || name.includes('query')) return Database;

  return Wrench;
}

// Status icon component
function StatusIcon({ status }: { status: ToolStatus }) {
  switch (status) {
    case 'pending':
      return <Clock className="w-4 h-4 text-[var(--color-text-tertiary)]" />;
    case 'running':
      return <Loader2 className="w-4 h-4 text-[var(--color-accent)] animate-spin" />;
    case 'success':
      return <Check className="w-4 h-4 text-emerald-500" />;
    case 'error':
      return <X className="w-4 h-4 text-red-500" />;
    case 'cancelled':
      return <X className="w-4 h-4 text-amber-500" />;
    default:
      return null;
  }
}

// Format duration
function formatDuration(ms?: number): string {
  if (!ms) return '';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

// Truncate long strings
function truncate(str: string, maxLength: number = 100): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + '...';
}

// Single tool call item
function ToolCallItem({ tool, defaultExpanded = false }: { tool: ToolCallData; defaultExpanded?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultExpanded);
  const ToolIcon = getToolIcon(tool.name);

  // Get summary for collapsed view
  const getSummary = (): string => {
    const input = tool.input;

    // Common patterns
    if ('file_path' in input) return truncate(String(input.file_path), 50);
    if ('path' in input) return truncate(String(input.path), 50);
    if ('command' in input) return truncate(String(input.command), 50);
    if ('query' in input) return truncate(String(input.query), 50);
    if ('pattern' in input) return truncate(String(input.pattern), 50);
    if ('url' in input) return truncate(String(input.url), 50);

    return '';
  };

  const summary = getSummary();

  return (
    <Collapsible.Root open={isOpen} onOpenChange={setIsOpen}>
      <Collapsible.Trigger asChild>
        <button
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2 rounded-lg',
            'text-left text-sm',
            'bg-[var(--color-bg-tertiary)]',
            'hover:bg-[var(--color-bg-secondary)]',
            'transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-inset'
          )}
        >
          <StatusIcon status={tool.status} />
          <ToolIcon className="w-4 h-4 text-[var(--color-text-secondary)]" />
          <span className="font-medium text-[var(--color-text)]">{tool.name}</span>

          {summary && (
            <span className="text-[var(--color-text-tertiary)] truncate flex-1 ml-1">
              {summary}
            </span>
          )}

          {tool.duration && (
            <span className="text-xs text-[var(--color-text-tertiary)] ml-auto mr-2">
              {formatDuration(tool.duration)}
            </span>
          )}

          <ChevronDown
            className={cn(
              'w-4 h-4 text-[var(--color-text-tertiary)] transition-transform',
              isOpen && 'rotate-180'
            )}
          />
        </button>
      </Collapsible.Trigger>

      <Collapsible.Content className="overflow-hidden data-[state=open]:animate-slideDown data-[state=closed]:animate-slideUp">
        <div className="mt-1 ml-6 pl-4 border-l-2 border-[var(--color-border)] space-y-2 py-2">
          {/* Input */}
          <div>
            <label className="text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wide">
              Input
            </label>
            <pre className="mt-1 p-2 rounded bg-[var(--color-bg)] text-xs text-[var(--color-text)] overflow-auto max-h-48 font-mono">
              {JSON.stringify(tool.input, null, 2)}
            </pre>
          </div>

          {/* Output */}
          {tool.output !== undefined && (
            <div>
              <label className="text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wide">
                Output
              </label>
              <pre className="mt-1 p-2 rounded bg-[var(--color-bg)] text-xs text-[var(--color-text)] overflow-auto max-h-64 font-mono">
                {typeof tool.output === 'string'
                  ? tool.output
                  : JSON.stringify(tool.output, null, 2)}
              </pre>
            </div>
          )}

          {/* Error */}
          {tool.error && (
            <div>
              <label className="text-xs font-medium text-red-400 uppercase tracking-wide">
                Error
              </label>
              <pre className="mt-1 p-2 rounded bg-red-500/10 text-xs text-red-400 overflow-auto max-h-32 font-mono">
                {tool.error}
              </pre>
            </div>
          )}

          {/* Timing info */}
          {(tool.startTime || tool.duration) && (
            <div className="flex gap-4 text-xs text-[var(--color-text-tertiary)]">
              {tool.startTime && (
                <span>Started: {new Date(tool.startTime).toLocaleTimeString()}</span>
              )}
              {tool.duration && (
                <span>Duration: {formatDuration(tool.duration)}</span>
              )}
            </div>
          )}
        </div>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}

export function ToolCallAccordion({
  toolCalls,
  defaultExpanded = false,
  className,
}: ToolCallAccordionProps) {
  if (toolCalls.length === 0) return null;

  // Calculate summary stats
  const successCount = toolCalls.filter(t => t.status === 'success').length;
  const errorCount = toolCalls.filter(t => t.status === 'error').length;
  const runningCount = toolCalls.filter(t => t.status === 'running').length;
  const totalDuration = toolCalls.reduce((sum, t) => sum + (t.duration || 0), 0);

  return (
    <div className={cn('space-y-1', className)}>
      {/* Group header when multiple tools */}
      {toolCalls.length > 1 && (
        <div className="flex items-center gap-2 px-2 py-1 text-xs text-[var(--color-text-tertiary)]">
          <span>{toolCalls.length} tool calls</span>
          {successCount > 0 && (
            <span className="flex items-center gap-1 text-emerald-500">
              <Check className="w-3 h-3" /> {successCount}
            </span>
          )}
          {errorCount > 0 && (
            <span className="flex items-center gap-1 text-red-500">
              <X className="w-3 h-3" /> {errorCount}
            </span>
          )}
          {runningCount > 0 && (
            <span className="flex items-center gap-1 text-[var(--color-accent)]">
              <Loader2 className="w-3 h-3 animate-spin" /> {runningCount}
            </span>
          )}
          {totalDuration > 0 && (
            <span className="ml-auto">{formatDuration(totalDuration)} total</span>
          )}
        </div>
      )}

      {/* Tool call items */}
      {toolCalls.map((tool) => (
        <ToolCallItem
          key={tool.id}
          tool={tool}
          defaultExpanded={defaultExpanded || toolCalls.length === 1}
        />
      ))}
    </div>
  );
}

// Helper to group consecutive tool calls from transcript entries
export function groupToolCalls<T extends { type: string }>(
  entries: T[]
): (T | T[])[] {
  const result: (T | T[])[] = [];
  let toolGroup: T[] = [];

  for (const entry of entries) {
    if (entry.type === 'tool_call' || entry.type === 'tool_result') {
      toolGroup.push(entry);
    } else {
      if (toolGroup.length > 0) {
        result.push([...toolGroup]);
        toolGroup = [];
      }
      result.push(entry);
    }
  }

  if (toolGroup.length > 0) {
    result.push(toolGroup);
  }

  return result;
}
