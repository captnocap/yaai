// =============================================================================
// OUTPUT PANEL
// =============================================================================
// Panel showing the AI response output.

import React, { useRef, useEffect } from 'react';
import { Sparkles, Copy, Check } from 'lucide-react';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface OutputPanelProps {
  content: string;
  isGenerating: boolean;
}

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function OutputPanel({ content, isGenerating }: OutputPanelProps) {
  const [copied, setCopied] = React.useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when generating
  useEffect(() => {
    if (isGenerating && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [content, isGenerating]);

  const handleCopy = async () => {
    if (content) {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-[var(--color-accent)]" />
          <span className="text-sm font-medium text-[var(--color-text)]">Output</span>
          {isGenerating && (
            <span className="flex items-center gap-1 text-xs text-[var(--color-text-secondary)]">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              Generating...
            </span>
          )}
        </div>

        {content && (
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg)] rounded transition-colors"
          >
            {copied ? (
              <>
                <Check size={12} className="text-green-500" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy size={12} />
                <span>Copy</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Content */}
      <div
        ref={contentRef}
        className="flex-1 overflow-y-auto p-4"
      >
        {content ? (
          <div className="prose prose-sm prose-invert max-w-none">
            <pre className="whitespace-pre-wrap text-sm text-[var(--color-text)] font-sans leading-relaxed">
              {content}
              {isGenerating && (
                <span className="inline-block w-2 h-4 bg-[var(--color-accent)] animate-pulse ml-0.5" />
              )}
            </pre>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-[var(--color-text-secondary)]">
            <Sparkles size={32} className="mb-3 opacity-50" />
            <p className="text-sm">Output will appear here</p>
            <p className="text-xs mt-1">
              Press{' '}
              <kbd className="px-1.5 py-0.5 bg-[var(--color-bg)] rounded text-[10px]">
                {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+Enter
              </kbd>{' '}
              to run
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
