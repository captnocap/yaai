// =============================================================================
// MESSAGE LIST
// =============================================================================
// Vertical list of message blocks for text prompt editing.

import React from 'react';
import { Plus, MessageSquare, User, Bot } from 'lucide-react';
import { MessageBlock } from './MessageBlock';
import type { MessageBlock as MessageBlockType, MessageRole } from '../../../../types/workbench';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface MessageListProps {
  messages: MessageBlockType[];
  onAddMessage: (role: MessageRole, afterId?: string) => void;
  onUpdateMessage: (id: string, content: string) => void;
  onRemoveMessage: (id: string) => void;
  onSetPrefill: (id: string, isPrefill: boolean) => void;
}

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function MessageList({
  messages,
  onAddMessage,
  onUpdateMessage,
  onRemoveMessage,
  onSetPrefill,
}: MessageListProps) {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-4 space-y-3">
        {messages.map((message, index) => (
          <MessageBlock
            key={message.id}
            message={message}
            canDelete={messages.length > 1}
            onUpdate={(content) => onUpdateMessage(message.id, content)}
            onRemove={() => onRemoveMessage(message.id)}
            onSetPrefill={(isPrefill) => onSetPrefill(message.id, isPrefill)}
            onAddAfter={(role) => onAddMessage(role, message.id)}
          />
        ))}

        {/* Add message buttons */}
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => onAddMessage('user')}
            className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-secondary)] rounded-lg transition-colors"
          >
            <User size={14} />
            <span>Add User</span>
          </button>
          <button
            onClick={() => onAddMessage('assistant')}
            className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-secondary)] rounded-lg transition-colors"
          >
            <Bot size={14} />
            <span>Add Assistant</span>
          </button>
        </div>
      </div>
    </div>
  );
}
