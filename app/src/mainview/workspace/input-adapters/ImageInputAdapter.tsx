// =============================================================================
// IMAGE INPUT ADAPTER
// =============================================================================
// Image generation-specific input adapter for GlobalInputHub.
// Simplified version of QuickGenerateBar for the workspace.

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Send, Image, Sparkles, Settings2 } from 'lucide-react';
import { cn } from '../../lib';
import type { ViewInput } from '../types';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface ImageInputAdapterProps {
  onSend: (input: ViewInput) => void;
  isLoading?: boolean;
  settings?: {
    defaultModel?: string;
    defaultSize?: string;
    defaultSteps?: number;
  };
}

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function ImageInputAdapter({
  onSend,
  isLoading,
  settings,
}: ImageInputAdapterProps) {
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [prompt]);

  const handleSend = useCallback(() => {
    if (!prompt.trim() || isLoading) return;

    onSend({
      type: 'image',
      prompt: prompt.trim(),
      negativePrompt: negativePrompt.trim() || undefined,
      settings: {
        model: settings?.defaultModel,
        size: settings?.defaultSize,
        steps: settings?.defaultSteps,
      },
    });

    setPrompt('');
    setNegativePrompt('');
  }, [prompt, negativePrompt, settings, isLoading, onSend]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  return (
    <div
      style={{
        padding: '12px 16px',
        backgroundColor: 'var(--color-bg-elevated)',
        borderTop: '1px solid var(--color-border)',
      }}
    >
      {/* Mode indicator */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '8px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            color: 'var(--color-text-tertiary)',
          }}
        >
          <Image size={12} />
          <span>Image Generation</span>
          <span
            style={{
              padding: '2px 6px',
              backgroundColor: 'var(--color-bg-secondary)',
              borderRadius: '4px',
              fontSize: '11px',
            }}
          >
            {settings?.defaultModel || 'Default Model'}
          </span>
        </div>

        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 8px',
            backgroundColor: 'transparent',
            border: 'none',
            borderRadius: '4px',
            color: showAdvanced ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
            fontSize: '11px',
            cursor: 'pointer',
          }}
          className="hover:bg-[var(--color-bg-secondary)]"
        >
          <Settings2 size={12} />
          {showAdvanced ? 'Hide' : 'Advanced'}
        </button>
      </div>

      {/* Main prompt input */}
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
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe the image you want to generate..."
            disabled={isLoading}
            rows={1}
            style={{
              width: '100%',
              padding: '10px 12px',
              backgroundColor: 'transparent',
              border: 'none',
              outline: 'none',
              resize: 'none',
              fontSize: '14px',
              color: 'var(--color-text)',
              lineHeight: 1.5,
            }}
          />
        </div>

        <button
          onClick={handleSend}
          disabled={!prompt.trim() || isLoading}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '10px 16px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: prompt.trim() ? 'var(--color-accent)' : 'var(--color-bg-secondary)',
            color: prompt.trim() ? 'white' : 'var(--color-text-tertiary)',
            cursor: prompt.trim() && !isLoading ? 'pointer' : 'not-allowed',
            fontSize: '13px',
            fontWeight: 500,
            transition: 'all 0.15s ease',
          }}
        >
          <Sparkles size={14} />
          Generate
        </button>
      </div>

      {/* Advanced options */}
      {showAdvanced && (
        <div
          style={{
            marginTop: '12px',
            paddingTop: '12px',
            borderTop: '1px solid var(--color-border)',
          }}
        >
          <label
            style={{
              display: 'block',
              fontSize: '11px',
              color: 'var(--color-text-tertiary)',
              marginBottom: '4px',
            }}
          >
            Negative Prompt
          </label>
          <input
            type="text"
            value={negativePrompt}
            onChange={(e) => setNegativePrompt(e.target.value)}
            placeholder="Things to avoid in the image..."
            style={{
              width: '100%',
              padding: '8px 12px',
              backgroundColor: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              fontSize: '13px',
              color: 'var(--color-text)',
              outline: 'none',
            }}
          />

          <div
            style={{
              display: 'flex',
              gap: '16px',
              marginTop: '12px',
              fontSize: '11px',
              color: 'var(--color-text-tertiary)',
            }}
          >
            <span>Size: {settings?.defaultSize || '1024x1024'}</span>
            <span>Steps: {settings?.defaultSteps || 30}</span>
          </div>
        </div>
      )}

      <div
        style={{
          marginTop: '8px',
          fontSize: '11px',
          color: 'var(--color-text-tertiary)',
          textAlign: 'right',
        }}
      >
        <kbd style={kbdStyle}>Ctrl</kbd>+<kbd style={kbdStyle}>Enter</kbd> to generate
      </div>
    </div>
  );
}

const kbdStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '1px 4px',
  backgroundColor: 'var(--color-bg-secondary)',
  border: '1px solid var(--color-border)',
  borderRadius: '3px',
  fontSize: '10px',
  fontFamily: 'monospace',
};
