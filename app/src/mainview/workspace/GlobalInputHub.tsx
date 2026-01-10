// =============================================================================
// GLOBAL INPUT HUB
// =============================================================================
// Mode-adaptive input component that sits at the bottom of the workspace.
// Switches between input adapters based on the active view type.

import React, { useCallback, useState } from 'react';
import { cn } from '../lib';
import { useWorkspaceInput } from './WorkspaceInputContext';
import { ChatInputAdapter } from './input-adapters/ChatInputAdapter';
import { CodeInputAdapter } from './input-adapters/CodeInputAdapter';
import { ImageInputAdapter } from './input-adapters/ImageInputAdapter';
import { MessageSquare, Terminal, Image, Telescope, FileText, Play } from 'lucide-react';
import type { ViewType, ViewInput } from './types';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface GlobalInputHubProps {
  className?: string;
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
  preview: { label: 'Preview', icon: Play, color: '#22c55e' },
};

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function GlobalInputHub({
  className,
}: GlobalInputHubProps) {
  const { activeViewType, activeResourceId, sendToActiveView } = useWorkspaceInput();
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

  const modeConfig = activeViewType ? MODE_CONFIG[activeViewType] : null;

  if (!modeConfig) {
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
        Select a mode to begin
      </div>
    );
  }

  const ModeIcon = modeConfig.icon;

  return (
    <div
      className={cn('global-input-hub', className)}
      style={{
        backgroundColor: 'var(--color-bg-elevated)',
        borderTop: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Input adapter */}
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

        {activeViewType === 'preview' && (
          <PreviewInputPlaceholder />
        )}
      </div>
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

function PreviewInputPlaceholder() {
  return (
    <div
      style={{
        padding: '16px',
        textAlign: 'center',
        color: 'var(--color-text-tertiary)',
        fontSize: '13px',
      }}
    >
      Preview mode — switch to a chat or code tab to continue
    </div>
  );
}
