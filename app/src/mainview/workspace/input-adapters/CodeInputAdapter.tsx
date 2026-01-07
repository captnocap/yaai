// =============================================================================
// CODE INPUT ADAPTER
// =============================================================================
// Code session-specific input adapter for GlobalInputHub.
// Simplified version of CodeInput for the workspace.

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Send, Terminal, ChevronDown, Check, X } from 'lucide-react';
import { cn } from '../../lib';
import type { ViewInput } from '../types';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface CodeInputAdapterProps {
  sessionId: string | null;
  onSend: (input: ViewInput) => void;
  isLoading?: boolean;
  promptState?: {
    type: 'text' | 'yesno' | 'selection' | 'awaiting';
    prompt?: string;
    options?: string[];
  };
}

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function CodeInputAdapter({
  sessionId,
  onSend,
  isLoading,
  promptState,
}: CodeInputAdapterProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [value]);

  const handleSend = useCallback(() => {
    if (!value.trim() || isLoading) return;

    onSend({
      type: 'code',
      content: value.trim(),
    });

    setValue('');
  }, [value, isLoading, onSend]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleYesNo = useCallback((answer: boolean) => {
    onSend({
      type: 'code',
      content: answer ? 'yes' : 'no',
    });
  }, [onSend]);

  const handleSelection = useCallback((option: string) => {
    onSend({
      type: 'code',
      content: option,
    });
  }, [onSend]);

  // Render yes/no prompt
  if (promptState?.type === 'yesno') {
    return (
      <div
        style={{
          padding: '16px',
          backgroundColor: 'var(--color-bg-elevated)',
          borderTop: '1px solid var(--color-border)',
        }}
      >
        <div
          style={{
            fontSize: '13px',
            color: 'var(--color-text)',
            marginBottom: '12px',
          }}
        >
          {promptState.prompt}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => handleYesNo(true)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg',
              'bg-green-500/10 text-green-500 hover:bg-green-500/20',
              'text-sm font-medium transition-colors'
            )}
          >
            <Check size={14} />
            Yes
          </button>
          <button
            onClick={() => handleYesNo(false)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg',
              'bg-red-500/10 text-red-500 hover:bg-red-500/20',
              'text-sm font-medium transition-colors'
            )}
          >
            <X size={14} />
            No
          </button>
        </div>
      </div>
    );
  }

  // Render selection prompt
  if (promptState?.type === 'selection' && promptState.options) {
    return (
      <div
        style={{
          padding: '16px',
          backgroundColor: 'var(--color-bg-elevated)',
          borderTop: '1px solid var(--color-border)',
        }}
      >
        <div
          style={{
            fontSize: '13px',
            color: 'var(--color-text)',
            marginBottom: '12px',
          }}
        >
          {promptState.prompt}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {promptState.options.map((option, index) => (
            <button
              key={index}
              onClick={() => handleSelection(option)}
              className={cn(
                'px-3 py-1.5 rounded-lg',
                'bg-[var(--color-bg-secondary)] text-[var(--color-text)]',
                'hover:bg-[var(--color-accent-subtle)] hover:text-[var(--color-accent)]',
                'text-sm transition-colors'
              )}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Default text input
  return (
    <div
      style={{
        padding: '12px 16px',
        backgroundColor: 'var(--color-bg-elevated)',
        borderTop: '1px solid var(--color-border)',
      }}
    >
      {/* Session indicator */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '8px',
          fontSize: '12px',
          color: 'var(--color-text-tertiary)',
        }}
      >
        <Terminal size={12} />
        <span>Code Session</span>
        {sessionId && (
          <span style={{ opacity: 0.7 }}>({sessionId.slice(0, 8)}...)</span>
        )}
      </div>

      {/* Input area */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'flex-end',
        }}
      >
        <div
          style={{
            flex: 1,
            backgroundColor: 'var(--color-bg)',
            borderRadius: '8px',
            border: '1px solid var(--color-border)',
          }}
        >
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={promptState?.prompt || "Type your prompt..."}
            disabled={isLoading || !sessionId}
            rows={1}
            style={{
              width: '100%',
              padding: '10px 12px',
              backgroundColor: 'transparent',
              border: 'none',
              outline: 'none',
              resize: 'none',
              fontSize: '14px',
              fontFamily: 'var(--font-mono)',
              color: 'var(--color-text)',
              lineHeight: 1.5,
            }}
          />
        </div>

        <button
          onClick={handleSend}
          disabled={!value.trim() || isLoading || !sessionId}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: value.trim() ? 'var(--color-accent)' : 'var(--color-bg-secondary)',
            color: value.trim() ? 'white' : 'var(--color-text-tertiary)',
            cursor: value.trim() && !isLoading ? 'pointer' : 'not-allowed',
            transition: 'all 0.15s ease',
          }}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
