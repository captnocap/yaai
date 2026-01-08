import React from 'react';
import { X, FileText, Send } from 'lucide-react';
import { cn } from '../../../lib';
import type { ReviewComment } from '../../../hooks/useReviewContext';

export interface CommentsSummaryProps {
  comments: ReviewComment[];
  onRemove: (id: string) => void;
  onSend: () => void;
  className?: string;
}

// Group comments by file
function groupByFile(comments: ReviewComment[]): Map<string, ReviewComment[]> {
  const groups = new Map<string, ReviewComment[]>();

  for (const comment of comments) {
    const existing = groups.get(comment.filePath) || [];
    existing.push(comment);
    groups.set(comment.filePath, existing);
  }

  return groups;
}

// Get filename from path
function getFilename(path: string): string {
  return path.split('/').pop() || path;
}

export function CommentsSummary({
  comments,
  onRemove,
  onSend,
  className,
}: CommentsSummaryProps) {
  const grouped = groupByFile(comments);

  if (comments.length === 0) {
    return null;
  }

  return (
    <div className={cn('p-3 space-y-3', className)}>
      {/* Comments by file */}
      {Array.from(grouped.entries()).map(([filePath, fileComments]) => (
        <div key={filePath}>
          {/* File header */}
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-3.5 h-3.5 text-[var(--color-text-tertiary)]" />
            <span
              className="text-xs font-medium text-[var(--color-text-secondary)] truncate"
              title={filePath}
            >
              {getFilename(filePath)}
            </span>
            <span className="text-xs text-[var(--color-text-tertiary)]">
              ({fileComments.length})
            </span>
          </div>

          {/* Comments list */}
          <div className="space-y-1.5 ml-5">
            {fileComments.map((comment) => (
              <div
                key={comment.id}
                className={cn(
                  'flex items-start gap-2 p-2 rounded',
                  'bg-[var(--color-bg-tertiary)]',
                  'group'
                )}
              >
                {/* Line number */}
                <span className="text-xs font-mono text-[var(--color-accent)] shrink-0">
                  {comment.endLine && comment.endLine !== comment.startLine
                    ? `L${comment.startLine}-${comment.endLine}`
                    : `L${comment.startLine}`}
                </span>

                {/* Comment content */}
                <p className="flex-1 text-xs text-[var(--color-text)] line-clamp-2">
                  {comment.content}
                </p>

                {/* Remove button */}
                <button
                  onClick={() => onRemove(comment.id)}
                  className={cn(
                    'p-0.5 rounded shrink-0',
                    'opacity-0 group-hover:opacity-100',
                    'hover:bg-[var(--color-bg)]',
                    'transition-opacity'
                  )}
                >
                  <X className="w-3 h-3 text-[var(--color-text-tertiary)]" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Send button */}
      <button
        onClick={onSend}
        className={cn(
          'w-full flex items-center justify-center gap-2',
          'py-2 px-3 rounded-lg',
          'text-sm font-medium',
          'bg-[var(--color-accent)] text-white',
          'hover:opacity-90',
          'transition-opacity'
        )}
      >
        <Send className="w-4 h-4" />
        Send All Comments ({comments.length})
      </button>

      {/* Preview of formatted message */}
      <details className="text-xs">
        <summary className="text-[var(--color-text-tertiary)] cursor-pointer hover:text-[var(--color-text-secondary)]">
          Preview message format
        </summary>
        <pre className="mt-2 p-2 rounded bg-[var(--color-bg)] text-[var(--color-text-secondary)] overflow-auto max-h-32 font-mono whitespace-pre-wrap">
          {buildCommentMessage(comments)}
        </pre>
      </details>
    </div>
  );
}

// Build the formatted message from comments
export function buildCommentMessage(comments: ReviewComment[]): string {
  const grouped = groupByFile(comments);

  let message = "I've reviewed the changes. Here's my feedback:\n";

  for (const [filePath, fileComments] of grouped) {
    message += `\n## ${filePath}\n\n`;

    for (const comment of fileComments) {
      const lineRef = comment.endLine && comment.endLine !== comment.startLine
        ? `Lines ${comment.startLine}-${comment.endLine}`
        : `Line ${comment.startLine}`;

      message += `- **${lineRef}**: ${comment.content}\n`;
    }
  }

  return message.trim();
}
