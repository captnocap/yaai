import React from 'react';
import { cn } from '../../../lib';
import { X, FileCode } from 'lucide-react';
import type { CodeSnippet } from '../../../types/snippet';

export interface SnippetChipProps {
  snippet: CodeSnippet;
  onRemove: () => void;
  onClick?: () => void;
  className?: string;
}

export function SnippetChip({
  snippet,
  onRemove,
  onClick,
  className,
}: SnippetChipProps) {
  const lineRange = snippet.startLine === snippet.endLine
    ? `L${snippet.startLine}`
    : `L${snippet.startLine}-${snippet.endLine}`;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-md',
        'bg-[var(--color-bg-tertiary)]',
        'border border-[var(--color-border)]',
        'text-xs',
        onClick && 'cursor-pointer hover:bg-[var(--color-bg-secondary)]',
        className
      )}
      onClick={onClick}
    >
      <FileCode className="w-3 h-3 text-[var(--color-accent)]" />
      <span className="text-[var(--color-text)] font-medium truncate max-w-[120px]">
        {snippet.fileName}
      </span>
      <span className="text-[var(--color-text-tertiary)]">
        {lineRange}
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="p-0.5 rounded hover:bg-[var(--color-bg)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text)]"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}
