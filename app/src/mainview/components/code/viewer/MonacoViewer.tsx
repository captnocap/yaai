import React, { useRef, useState, useCallback, useEffect } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { MessageSquare } from 'lucide-react';
import { cn } from '../../../lib';
import { InlineCommentInput } from './InlineCommentInput';
import type { ReviewComment } from '../../../hooks/useReviewContext';

export interface MonacoViewerProps {
  content: string;
  language: string;
  readOnly?: boolean;
  onChange?: (content: string) => void;
  onAddComment?: (startLine: number, endLine: number, commentContent: string) => void;
  comments?: ReviewComment[];
  showCommentButtons?: boolean;
  highlightedLines?: { line: number; color: string }[];
  className?: string;
}

export function MonacoViewer({
  content,
  language,
  readOnly = false,
  onChange,
  onAddComment,
  comments = [],
  showCommentButtons = true,
  highlightedLines,
  className,
}: MonacoViewerProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof import('monaco-editor') | null>(null);
  const decorationsRef = useRef<string[]>([]);
  const widgetRef = useRef<editor.IContentWidget | null>(null);

  const [commentInput, setCommentInput] = useState<{
    line: number;
    position: { top: number; left: number };
  } | null>(null);

  // Handle editor mount
  const handleMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Apply decorations for existing comments
    updateDecorations();

    // Add click handler for comment buttons via glyph margin
    editor.onMouseDown((e) => {
      if (e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) {
        const lineNumber = e.target.position?.lineNumber;
        if (lineNumber && showCommentButtons) {
          openCommentInput(lineNumber);
        }
      }
    });

    // Track selection for range comments
    editor.onDidChangeCursorSelection((e) => {
      // Could be used for multi-line comments in the future
    });
  }, [showCommentButtons]);

  // Open comment input at line
  const openCommentInput = (line: number) => {
    if (!editorRef.current) return;

    const editor = editorRef.current;
    const lineTop = editor.getTopForLineNumber(line);
    const scrollTop = editor.getScrollTop();
    const editorRect = editor.getDomNode()?.getBoundingClientRect();

    if (editorRect) {
      setCommentInput({
        line,
        position: {
          top: lineTop - scrollTop + editorRect.top + 20,
          left: editorRect.right - 320, // Position near right side
        },
      });
    }
  };

  // Close comment input
  const closeCommentInput = () => {
    setCommentInput(null);
  };

  // Submit comment
  const handleSubmitComment = (commentContent: string) => {
    if (commentInput && onAddComment && commentContent.trim()) {
      onAddComment(commentInput.line, commentInput.line, commentContent);
    }
    closeCommentInput();
  };

  // Update decorations for comments and highlights
  const updateDecorations = useCallback(() => {
    if (!editorRef.current || !monacoRef.current) return;

    const editor = editorRef.current;
    const monaco = monacoRef.current;
    const newDecorations: editor.IModelDeltaDecoration[] = [];

    // Add comment indicators
    for (const comment of comments) {
      newDecorations.push({
        range: new monaco.Range(
          comment.startLine,
          1,
          comment.endLine || comment.startLine,
          1
        ),
        options: {
          isWholeLine: true,
          className: 'monaco-commented-line',
          glyphMarginClassName: 'monaco-comment-glyph',
          glyphMarginHoverMessage: { value: comment.content || 'Comment' },
        },
      });
    }

    // Add custom highlights
    for (const hl of highlightedLines || []) {
      newDecorations.push({
        range: new monaco.Range(hl.line, 1, hl.line, 1),
        options: {
          isWholeLine: true,
          className: `monaco-highlight-${hl.color}`,
        },
      });
    }

    // Add comment button indicators on all lines if enabled
    if (showCommentButtons) {
      const lineCount = editor.getModel()?.getLineCount() || 0;
      for (let i = 1; i <= lineCount; i++) {
        // Only add if no existing comment on this line
        const hasComment = comments.some(c =>
          i >= c.startLine && i <= (c.endLine || c.startLine)
        );
        if (!hasComment) {
          newDecorations.push({
            range: new monaco.Range(i, 1, i, 1),
            options: {
              glyphMarginClassName: 'monaco-comment-button',
            },
          });
        }
      }
    }

    decorationsRef.current = editor.deltaDecorations(
      decorationsRef.current,
      newDecorations
    );
  }, [comments, highlightedLines, showCommentButtons]);

  // Update decorations when comments change
  useEffect(() => {
    updateDecorations();
  }, [updateDecorations]);

  return (
    <div className={cn('relative h-full', className)}>
      {/* Monaco styles for comment UI */}
      <style>{`
        .monaco-comment-button {
          cursor: pointer;
          opacity: 0;
          transition: opacity 0.15s;
        }
        .monaco-comment-button::before {
          content: '';
          display: block;
          width: 16px;
          height: 16px;
          margin: 2px;
          background-color: var(--color-accent, #3b82f6);
          mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Cpath d='m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z'/%3E%3C/svg%3E") center/contain no-repeat;
          -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Cpath d='m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z'/%3E%3C/svg%3E") center/contain no-repeat;
        }
        .view-line:hover ~ .glyph-margin .monaco-comment-button,
        .margin-view-overlays > div:hover .monaco-comment-button {
          opacity: 1;
        }
        .monaco-comment-glyph::before {
          content: '';
          display: block;
          width: 16px;
          height: 16px;
          margin: 2px;
          background-color: var(--color-accent, #3b82f6);
          mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='currentColor'%3E%3Cpath d='m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z'/%3E%3C/svg%3E") center/contain no-repeat;
          -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='currentColor'%3E%3Cpath d='m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z'/%3E%3C/svg%3E") center/contain no-repeat;
        }
        .monaco-commented-line {
          background-color: rgba(59, 130, 246, 0.1) !important;
        }
        .monaco-highlight-yellow {
          background-color: rgba(234, 179, 8, 0.2) !important;
        }
        .monaco-highlight-green {
          background-color: rgba(34, 197, 94, 0.2) !important;
        }
        .monaco-highlight-red {
          background-color: rgba(239, 68, 68, 0.2) !important;
        }
      `}</style>

      <Editor
        value={content}
        language={language}
        theme="vs-dark"
        height="100%"
        onMount={handleMount}
        onChange={(value) => onChange?.(value || '')}
        options={{
          readOnly,
          minimap: { enabled: false },
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          wordWrap: 'on',
          fontSize: 13,
          fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
          tabSize: 2,
          glyphMargin: showCommentButtons,
          folding: true,
          renderWhitespace: 'selection',
          bracketPairColorization: { enabled: true },
          scrollbar: {
            verticalScrollbarSize: 10,
            horizontalScrollbarSize: 10,
          },
          padding: { top: 12, bottom: 12 },
        }}
      />

      {/* Inline comment input portal */}
      {commentInput && (
        <div
          className="fixed z-50"
          style={{
            top: commentInput.position.top,
            left: commentInput.position.left,
          }}
        >
          <InlineCommentInput
            line={commentInput.line}
            onSubmit={handleSubmitComment}
            onCancel={closeCommentInput}
          />
        </div>
      )}
    </div>
  );
}
