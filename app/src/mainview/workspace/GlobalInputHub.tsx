// =============================================================================
// GLOBAL INPUT HUB
// =============================================================================
// Mode-adaptive input component that sits at the bottom of the workspace.
// Switches between input adapters based on the active view type.

import React, { useCallback, useState } from 'react';
import { useWorkspaceInput } from './WorkspaceInputContext';
import { ChatInputAdapter } from './input-adapters/ChatInputAdapter';
import { CodeInputAdapter } from './input-adapters/CodeInputAdapter';
import { ImageInputAdapter } from './input-adapters/ImageInputAdapter';
import { MessageSquare, Terminal, Image, Telescope, FileText, ChevronUp, ChevronDown } from 'lucide-react';
import type { ViewType, ViewInput } from './types';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface GlobalInputHubProps {
  className?: string;
  /** Whether to show collapsed by default */
  defaultCollapsed?: boolean;
}

// -----------------------------------------------------------------------------
// MODE INDICATORS
// -----------------------------------------------------------------------------

const MODE_CONFIG: Record<ViewType, {
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  color: string;
}> = {
  chat: { label: 'Chat', icon: MessageSquare, color: 'var(--color-accent)' },
  code: { label: 'Code', icon: Terminal, color: '#10b981' },
  image: { label: 'Image', icon: Image, color: '#8b5cf6' },
  research: { label: 'Research', icon: Telescope, color: '#f59e0b' },
  prompts: { label: 'Prompts', icon: FileText, color: '#ec4899' },
};

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function GlobalInputHub({
  className,
  defaultCollapsed = false,
}: GlobalInputHubProps) {
  const { activeViewType, activeResourceId, sendToActiveView } = useWorkspaceInput();
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [isLoading, setIsLoading] = useState(false);

  // Code session prompt state (received from CodeViewPane)
  const [codePromptState, setCodePromptState] = useState<{
    type: 'text' | 'yesno' | 'selection' | 'awaiting';
    prompt?: string;
    options?: string[];
  }>({ type: 'awaiting' });

  // Image settings (received from ImageViewPane)
  const [imageSettings, setImageSettings] = useState<{
    defaultModel?: string;
    defaultSize?: string;
    defaultSteps?: number;
  }>({});

  // Handle send
  const handleSend = useCallback((input: ViewInput) => {
    sendToActiveView(input);
  }, [sendToActiveView]);

  // No active view - show minimal state
  if (!activeViewType) {
    return (
      <div
        className={className}
        style={{
          padding: '16px',
          backgroundColor: 'var(--color-bg-elevated)',
          borderTop: '1px solid var(--color-border)',
          textAlign: 'center',
          color: 'var(--color-text-tertiary)',
          fontSize: '13px',
        }}
      >
        Open a view to start
      </div>
    );
  }

  const modeConfig = MODE_CONFIG[activeViewType];
  const ModeIcon = modeConfig.icon;

  return (
    <div
      className={className}
      style={{
        backgroundColor: 'var(--color-bg-elevated)',
        borderTop: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Mode indicator bar (always visible) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px',
          borderBottom: isCollapsed ? 'none' : '1px solid var(--color-border)',
          cursor: 'pointer',
        }}
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '24px',
              height: '24px',
              borderRadius: '6px',
              backgroundColor: `${modeConfig.color}20`,
              color: modeConfig.color,
            }}
          >
            <ModeIcon size={14} />
          </div>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 500,
              color: 'var(--color-text-secondary)',
            }}
          >
            {modeConfig.label} Input
          </span>
          {activeResourceId && (
            <span
              style={{
                fontSize: '11px',
                color: 'var(--color-text-tertiary)',
                padding: '2px 6px',
                backgroundColor: 'var(--color-bg-secondary)',
                borderRadius: '4px',
              }}
            >
              {activeResourceId.length > 12
                ? `${activeResourceId.slice(0, 12)}...`
                : activeResourceId}
            </span>
          )}
        </div>

        <button
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '24px',
            height: '24px',
            border: 'none',
            backgroundColor: 'transparent',
            borderRadius: '4px',
            color: 'var(--color-text-tertiary)',
            cursor: 'pointer',
          }}
          className="hover:bg-[var(--color-bg-secondary)]"
        >
          {isCollapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Input adapter (collapsible) */}
      {!isCollapsed && (
        <div style={{ overflow: 'hidden' }}>
          {activeViewType === 'chat' && (
            <ChatInputAdapter
              chatId={activeResourceId}
              onSend={handleSend}
              isLoading={isLoading}
            />
          )}

          {activeViewType === 'code' && (
            <CodeInputAdapter
              sessionId={activeResourceId}
              onSend={handleSend}
              isLoading={isLoading}
              promptState={codePromptState}
            />
          )}

          {activeViewType === 'image' && (
            <ImageInputAdapter
              onSend={handleSend}
              isLoading={isLoading}
              settings={imageSettings}
            />
          )}

          {activeViewType === 'research' && (
            <ResearchInputPlaceholder />
          )}

          {activeViewType === 'prompts' && (
            <PromptsInputPlaceholder />
          )}
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// PLACEHOLDER ADAPTERS
// -----------------------------------------------------------------------------

function ResearchInputPlaceholder() {
  return (
    <div
      style={{
        padding: '16px',
        textAlign: 'center',
        color: 'var(--color-text-tertiary)',
        fontSize: '13px',
      }}
    >
      Research input adapter coming soon
    </div>
  );
}

function PromptsInputPlaceholder() {
  return (
    <div
      style={{
        padding: '16px',
        textAlign: 'center',
        color: 'var(--color-text-tertiary)',
        fontSize: '13px',
      }}
    >
      Prompts input adapter coming soon
    </div>
  );
}
