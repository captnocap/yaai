// =============================================================================
// VIEW RENDERER
// =============================================================================
// Maps ViewType to the appropriate pane component.

import React from 'react';
import type { PaneView, ViewInput } from './types';
import { ChatViewPane } from '../components/chat/ChatViewPane';
import { CodeViewPane } from '../components/code/CodeViewPane';
import { ImageViewPane } from '../components/image-gen/ImageViewPane';
// Note: Research and Prompts panes would be added similarly

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface ViewRendererProps {
  view: PaneView;
  /** Register input handler for this view */
  onRegisterInputHandler?: (handler: (input: ViewInput) => void) => () => void;
  /** Called when chat is created (for ephemeral → real promotion) */
  onChatCreated?: (realChatId: string, ephemeralId?: string) => void;
}

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function ViewRenderer({
  view,
  onRegisterInputHandler,
  onChatCreated,
}: ViewRendererProps) {
  switch (view.type) {
    case 'chat':
      return (
        <ChatViewPane
          chatId={view.resourceId}
          title={view.title}
          onChatCreated={onChatCreated}
          onRegisterInputHandler={onRegisterInputHandler}
        />
      );

    case 'code':
      return (
        <CodeViewPane
          sessionId={view.resourceId}
          showHistory
          onRegisterInputHandler={onRegisterInputHandler}
        />
      );

    case 'image':
      return (
        <ImageViewPane
          onRegisterInputHandler={onRegisterInputHandler}
        />
      );

    case 'research':
      // Placeholder until ResearchViewPane is created
      return (
        <div
          style={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-text-secondary)',
          }}
        >
          Research View (Coming Soon)
        </div>
      );

    case 'prompts':
      // Placeholder until PromptsViewPane is created
      return (
        <div
          style={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-text-secondary)',
          }}
        >
          Prompts View (Coming Soon)
        </div>
      );

    default:
      return (
        <div
          style={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-text-tertiary)',
          }}
        >
          Unknown view type: {(view as PaneView).type}
        </div>
      );
  }
}
