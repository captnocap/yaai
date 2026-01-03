// =============================================================================
// MESSAGE BLOCK
// =============================================================================
// Single message block in the text prompt editor.

import React, { useRef, useEffect, useState } from 'react';
import { Trash2, Plus, MoreVertical, FileText, User, Bot, ChevronDown } from 'lucide-react';
import type { MessageBlock as MessageBlockType, MessageRole } from '../../../../types/workbench';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface MessageBlockProps {
  message: MessageBlockType;
  canDelete: boolean;
  onUpdate: (content: string) => void;
  onRemove: () => void;
  onSetPrefill: (isPrefill: boolean) => void;
  onAddAfter: (role: MessageRole) => void;
}

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function MessageBlock({
  message,
  canDelete,
  onUpdate,
  onRemove,
  onSetPrefill,
  onAddAfter,
}: MessageBlockProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.max(textarea.scrollHeight, 60)}px`;
    }
  }, [message.content]);

  const roleConfig = {
    system: {
      label: 'System',
      icon: FileText,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
    },
    user: {
      label: 'User',
      icon: User,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
    },
    assistant: {
      label: 'Assistant',
      icon: Bot,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
    },
  }[message.role];

  const Icon = roleConfig.icon;

  return (
    <div
      className={`rounded-lg border ${roleConfig.border} ${roleConfig.bg} overflow-hidden`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--color-border)]/50">
        <div className="flex items-center gap-2">
          <Icon size={14} className={roleConfig.color} />
          <span className={`text-sm font-medium ${roleConfig.color}`}>
            {roleConfig.label}
          </span>
          {message.isPrefill && (
            <span className="px-1.5 py-0.5 text-[10px] bg-purple-500/20 text-purple-400 rounded">
              Prefill
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Add after button */}
          <div className="relative">
            <button
              onClick={() => setShowAddMenu(!showAddMenu)}
              className="p-1 rounded hover:bg-[var(--color-bg-secondary)] transition-colors"
            >
              <Plus size={14} className="text-[var(--color-text-secondary)]" />
            </button>

            {showAddMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowAddMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1 w-32 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg shadow-lg z-50 overflow-hidden">
                  <button
                    onClick={() => {
                      setShowAddMenu(false);
                      onAddAfter('user');
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm text-[var(--color-text)] hover:bg-[var(--color-bg-secondary)]"
                  >
                    <User size={12} className="text-blue-500" />
                    User
                  </button>
                  <button
                    onClick={() => {
                      setShowAddMenu(false);
                      onAddAfter('assistant');
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm text-[var(--color-text)] hover:bg-[var(--color-bg-secondary)]"
                  >
                    <Bot size={12} className="text-purple-500" />
                    Assistant
                  </button>
                </div>
              </>
            )}
          </div>

          {/* More options */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 rounded hover:bg-[var(--color-bg-secondary)] transition-colors"
            >
              <MoreVertical size={14} className="text-[var(--color-text-secondary)]" />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1 w-36 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg shadow-lg z-50 overflow-hidden">
                  {message.role === 'assistant' && (
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        onSetPrefill(!message.isPrefill);
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm text-[var(--color-text)] hover:bg-[var(--color-bg-secondary)]"
                    >
                      {message.isPrefill ? 'Disable Prefill' : 'Enable Prefill'}
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        onRemove();
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm text-red-500 hover:bg-[var(--color-bg-secondary)]"
                    >
                      <Trash2 size={12} />
                      Delete
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        <textarea
          ref={textareaRef}
          value={message.content}
          onChange={(e) => onUpdate(e.target.value)}
          placeholder={getPlaceholder(message.role)}
          className="w-full min-h-[60px] bg-transparent border-none outline-none resize-none text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)]/50 leading-relaxed"
          style={{ fontFamily: 'inherit' }}
        />
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

function getPlaceholder(role: MessageRole): string {
  switch (role) {
    case 'system':
      return 'Enter system instructions... Use {{VARIABLE}} for dynamic content.';
    case 'user':
      return 'Enter user message... Use {{VARIABLE}} for dynamic content.';
    case 'assistant':
      return "Enter assistant's response...";
  }
}
