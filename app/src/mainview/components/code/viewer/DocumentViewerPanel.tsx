import React, { useState } from 'react';
import {
  X,
  FileText,
  Eye,
  EyeOff,
  Check,
  ChevronRight,
  MessageSquare,
  Send
} from 'lucide-react';
import { cn } from '../../../lib';
import { MonacoViewer } from './MonacoViewer';
import { CommentsSummary } from './CommentsSummary';
import { detectLanguage } from '../MonacoEditor';
import type { ReviewComment } from '../../../hooks/useReviewContext';

export interface ActiveFile {
  path: string;
  content: string;
  language?: string;
  isStreaming?: boolean;
}

export interface DocumentViewerPanelProps {
  /** Currently displayed file */
  activeFile: ActiveFile | null;
  /** Close the panel */
  onClose: () => void;
  /** Add file path to review context */
  onAddToReview: (filePath: string) => void;
  /** Continue/proceed after review */
  onProceed: () => void;
  /** Accumulated review comments */
  comments: ReviewComment[];
  /** Add a new comment */
  onAddComment: (comment: Omit<ReviewComment, 'id' | 'createdAt' | 'status'>) => void;
  /** Remove a comment */
  onRemoveComment: (id: string) => void;
  /** Send all comments */
  onSendComments: () => void;
  /** Whether follow mode is active */
  isFollowMode?: boolean;
  /** Toggle follow mode */
  onToggleFollowMode?: () => void;
  /** Files in review context */
  reviewFiles?: string[];
  className?: string;
}

export function DocumentViewerPanel({
  activeFile,
  onClose,
  onAddToReview,
  onProceed,
  comments,
  onAddComment,
  onRemoveComment,
  onSendComments,
  isFollowMode = true,
  onToggleFollowMode,
  reviewFiles = [],
  className,
}: DocumentViewerPanelProps) {
  const [showComments, setShowComments] = useState(false);

  // No file to display
  if (!activeFile) {
    return (
      <div className={cn(
        'flex flex-col h-full',
        'bg-[var(--color-bg-secondary)]',
        'border-l border-[var(--color-border)]',
        className
      )}>
        <div className="flex items-center justify-between p-3 border-b border-[var(--color-border)]">
          <span className="text-sm font-medium text-[var(--color-text)]">Document Viewer</span>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[var(--color-bg-tertiary)]"
          >
            <X className="w-4 h-4 text-[var(--color-text-secondary)]" />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center text-[var(--color-text-tertiary)]">
          <div className="text-center">
            <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No file selected</p>
            <p className="text-xs mt-1">Files will appear here as Claude edits them</p>
          </div>
        </div>
      </div>
    );
  }

  const language = activeFile.language || detectLanguage(activeFile.path);
  const filename = activeFile.path.split('/').pop() || activeFile.path;
  const isInReview = reviewFiles.includes(activeFile.path);
  const fileComments = comments.filter(c => c.filePath === activeFile.path);

  return (
    <div className={cn(
      'flex flex-col h-full',
      'bg-[var(--color-bg-secondary)]',
      'border-l border-[var(--color-border)]',
      className
    )}>
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b border-[var(--color-border)]">
        {/* File info */}
        <FileText className="w-4 h-4 text-[var(--color-text-secondary)]" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--color-text)] truncate" title={activeFile.path}>
            {filename}
          </p>
          <p className="text-xs text-[var(--color-text-tertiary)] truncate">
            {activeFile.path}
          </p>
        </div>

        {/* Streaming indicator */}
        {activeFile.isStreaming && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Writing...
          </span>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1">
          {/* Follow mode toggle */}
          {onToggleFollowMode && (
            <button
              onClick={onToggleFollowMode}
              className={cn(
                'p-1.5 rounded',
                'hover:bg-[var(--color-bg-tertiary)]',
                'transition-colors',
                isFollowMode && 'text-[var(--color-accent)]'
              )}
              title={isFollowMode ? 'Following file changes' : 'Follow mode off'}
            >
              {isFollowMode ? (
                <Eye className="w-4 h-4" />
              ) : (
                <EyeOff className="w-4 h-4 text-[var(--color-text-tertiary)]" />
              )}
            </button>
          )}

          {/* Review button */}
          <button
            onClick={() => onAddToReview(activeFile.path)}
            disabled={isInReview}
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded',
              'text-xs font-medium',
              isInReview
                ? 'bg-emerald-500/20 text-emerald-500'
                : 'bg-[var(--color-accent)] text-white hover:opacity-90',
              'disabled:cursor-default',
              'transition-colors'
            )}
          >
            {isInReview ? (
              <>
                <Check className="w-3 h-3" />
                In Review
              </>
            ) : (
              <>
                Review
                <ChevronRight className="w-3 h-3" />
              </>
            )}
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-[var(--color-bg-tertiary)]"
          >
            <X className="w-4 h-4 text-[var(--color-text-secondary)]" />
          </button>
        </div>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1 overflow-hidden">
        <MonacoViewer
          content={activeFile.content}
          language={language}
          readOnly={activeFile.isStreaming}
          onAddComment={(startLine, endLine, commentContent) => {
            onAddComment({
              filePath: activeFile.path,
              startLine,
              endLine,
              content: commentContent,
            });
          }}
          comments={fileComments}
          showCommentButtons={!activeFile.isStreaming}
        />
      </div>

      {/* Comments panel toggle and proceed */}
      <div className="border-t border-[var(--color-border)]">
        {/* Comments summary toggle */}
        {comments.length > 0 && (
          <button
            onClick={() => setShowComments(!showComments)}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-2',
              'text-sm text-[var(--color-text)]',
              'hover:bg-[var(--color-bg-tertiary)]',
              'transition-colors'
            )}
          >
            <MessageSquare className="w-4 h-4 text-[var(--color-accent)]" />
            <span>{comments.length} comment{comments.length !== 1 ? 's' : ''}</span>
            <ChevronRight className={cn(
              'w-4 h-4 ml-auto transition-transform',
              showComments && 'rotate-90'
            )} />
          </button>
        )}

        {/* Expanded comments */}
        {showComments && comments.length > 0 && (
          <div className="max-h-48 overflow-auto border-t border-[var(--color-border)]">
            <CommentsSummary
              comments={comments}
              onRemove={onRemoveComment}
              onSend={onSendComments}
            />
          </div>
        )}

        {/* Proceed button */}
        <div className="flex gap-2 p-3">
          {comments.length > 0 && (
            <button
              onClick={onSendComments}
              className={cn(
                'flex-1 flex items-center justify-center gap-2',
                'py-2 px-4 rounded-lg',
                'text-sm font-medium',
                'bg-[var(--color-accent)] text-white',
                'hover:opacity-90',
                'transition-opacity'
              )}
            >
              <Send className="w-4 h-4" />
              Send {comments.length} Comment{comments.length !== 1 ? 's' : ''}
            </button>
          )}
          <button
            onClick={onProceed}
            className={cn(
              'flex-1 py-2 px-4 rounded-lg',
              'text-sm font-medium',
              'bg-emerald-600 text-white',
              'hover:bg-emerald-700',
              'transition-colors'
            )}
          >
            Proceed
          </button>
        </div>
      </div>
    </div>
  );
}
