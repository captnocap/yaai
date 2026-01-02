import React from 'react';
import { cn } from '../../../lib';
import { Code2, Trash2 } from 'lucide-react';
import { SnippetChip } from './SnippetChip';
import type { CodeSnippet } from '../../../types/snippet';

export interface SnippetListProps {
  snippets: CodeSnippet[];
  onRemove: (snippetId: string) => void;
  onClear: () => void;
  onSnippetClick?: (snippet: CodeSnippet) => void;
  className?: string;
}

export function SnippetList({
  snippets,
  onRemove,
  onClear,
  onSnippetClick,
  className,
}: SnippetListProps) {
  if (snippets.length === 0) {
    return null;
  }

  return (
    <div className={cn(
      'flex flex-col gap-2 p-3',
      'bg-[var(--color-bg-secondary)]',
      'border-t border-[var(--color-border)]',
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
          <Code2 className="w-3.5 h-3.5" />
          <span>{snippets.length} snippet{snippets.length !== 1 ? 's' : ''} attached</span>
        </div>
        <button
          onClick={onClear}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-xs text-[var(--color-text-tertiary)] hover:text-red-500 transition-colors"
        >
          <Trash2 className="w-3 h-3" />
          Clear all
        </button>
      </div>

      {/* Snippet chips */}
      <div className="flex flex-wrap gap-1.5">
        {snippets.map(snippet => (
          <SnippetChip
            key={snippet.id}
            snippet={snippet}
            onRemove={() => onRemove(snippet.id)}
            onClick={onSnippetClick ? () => onSnippetClick(snippet) : undefined}
          />
        ))}
      </div>
    </div>
  );
}
