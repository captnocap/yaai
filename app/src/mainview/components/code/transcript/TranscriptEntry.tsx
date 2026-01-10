import React from 'react';
import { cn } from '../../../lib';
import { User, Bot, Wrench, FileEdit, AlertCircle } from 'lucide-react';
import { MarkdownBlock } from '../../text';
import type { TranscriptEntry as TranscriptEntryType } from '../../../types/code-session';

export interface TranscriptEntryProps {
  entry: TranscriptEntryType;
  isCompacted?: boolean;
  onRestorePointClick?: (restorePointId: string) => void;
  onPlanItemClick?: (planItemId: string) => void;
  className?: string;
}

export function TranscriptEntry({
  entry,
  isCompacted = false,
  onRestorePointClick,
  onPlanItemClick,
  className,
}: TranscriptEntryProps) {
  const getIcon = () => {
    switch (entry.type) {
      case 'user_input':
        return <User className="w-4 h-4" />;
      case 'assistant_output':
        return <Bot className="w-4 h-4" />;
      case 'tool_call':
      case 'tool_result':
        return <Wrench className="w-4 h-4" />;
      case 'file_edit':
        return <FileEdit className="w-4 h-4" />;
      case 'system_message':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getLabel = () => {
    switch (entry.type) {
      case 'user_input':
        return 'You';
      case 'assistant_output':
        return 'Claude';
      case 'tool_call':
        return entry.toolCall?.name || 'Tool';
      case 'tool_result':
        return 'Result';
      case 'file_edit':
        return 'File Edit';
      case 'system_message':
        return 'System';
      default:
        return '';
    }
  };

  const isUser = entry.type === 'user_input';

  return (
    <div
      className={cn(
        'group py-3 px-4 animate-fade-in',
        isCompacted && 'opacity-50',
        isUser
          ? 'bg-[var(--color-bg-tertiary)]'
          : 'bg-[var(--color-bg-secondary)]',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <span className={cn(
          'flex items-center justify-center w-6 h-6 rounded-full',
          isUser
            ? 'bg-[var(--color-accent)] text-white'
            : 'bg-[var(--color-bg)] text-[var(--color-text-secondary)]'
        )}>
          {getIcon()}
        </span>
        <span className="font-medium text-sm text-[var(--color-text)]">
          {getLabel()}
        </span>
        {entry.type === 'file_edit' && entry.fileEdit && (
          <span className="text-xs text-[var(--color-text-tertiary)] font-mono">
            {entry.fileEdit.path}
          </span>
        )}
        {entry.restorePointId && (
          <button
            onClick={() => onRestorePointClick?.(entry.restorePointId!)}
            className="text-xs text-[var(--color-accent)] hover:underline ml-auto"
          >
            View Restore Point
          </button>
        )}
      </div>

      {/* Content */}
      <div className={cn(
        'text-sm text-[var(--color-text)]',
        'pl-8', // Align with icon
        isUser && 'text-[var(--color-text-secondary)]'
      )}>
        {entry.type === 'file_edit' && entry.fileEdit ? (
          <FileEditContent edit={entry.fileEdit} />
        ) : (
          <MarkdownBlock content={entry.content} />
        )}
      </div>

      {/* Plan item link */}
      {entry.planItemId && (
        <button
          onClick={() => onPlanItemClick?.(entry.planItemId!)}
          className="mt-2 pl-8 text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-accent)]"
        >
          Linked to plan item
        </button>
      )}
    </div>
  );
}

// File edit content with diff stats
function FileEditContent({ edit }: { edit: NonNullable<TranscriptEntryType['fileEdit']> }) {
  return (
    <div className="flex items-center gap-3">
      <span className="font-mono text-[var(--color-text)]">{edit.path}</span>
      {edit.additions !== undefined && edit.deletions !== undefined && (
        <span className="text-xs">
          <span className="text-green-500">+{edit.additions}</span>
          {' '}
          <span className="text-red-500">-{edit.deletions}</span>
        </span>
      )}
      <span className="text-xs text-[var(--color-text-tertiary)] capitalize">
        {edit.operation}
      </span>
    </div>
  );
}
