// =============================================================================
// CHAT VIEW PANE
// =============================================================================
// Pane-ready chat view component for the workspace system.
// Displays messages only - input comes from GlobalInputHub via context.

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { MessageContainer } from '../message/MessageContainer';
import { ResponseGroupContainer } from '../response-group/ResponseGroupContainer';
import { useChatHistory, useMemory } from '../../hooks';
import { useParallelAI } from '../../hooks/useParallelAI';
import type { Message, ModelInfo } from '../../types';
import type { ViewInput } from '../../workspace/types';

// -----------------------------------------------------------------------------
// MOCK DATA (temporary)
// -----------------------------------------------------------------------------

const mockModels: ModelInfo[] = [
  { id: 'claude-3', name: 'Claude 3 Opus', provider: 'anthropic', contextWindow: 200000 },
  { id: 'gpt-4', name: 'GPT-4 Turbo', provider: 'openai', contextWindow: 128000 },
  { id: 'gemini', name: 'Gemini Pro', provider: 'google', contextWindow: 32000 },
];

// Demo messages for new chats
const demoParallelResponses: Message[] = [
  {
    id: '4',
    chatId: 'demo',
    role: 'assistant' as const,
    content: [{
      type: 'text' as const,
      value: "Here's a Python implementation using a recursive approach:\n\n```python\ndef fibonacci(n):\n    if n <= 1:\n        return n\n    return fibonacci(n-1) + fibonacci(n-2)\n```"
    }],
    timestamp: new Date(Date.now() - 100000),
    tokenCount: 45,
    generationTime: 1200,
    model: 'gpt-4',
  },
  {
    id: '5',
    chatId: 'demo',
    role: 'assistant' as const,
    content: [{
      type: 'text' as const,
      value: "Here's how you can do it in Rust:\n\n```rust\nfn fibonacci(n: u32) -> u32 {\n    match n {\n        0 => 0,\n        1 => 1,\n        _ => fibonacci(n - 1) + fibonacci(n - 2),\n    }\n}\n```"
    }],
    timestamp: new Date(Date.now() - 100000),
    tokenCount: 52,
    generationTime: 800,
    model: 'claude-3-opus',
  },
];

const demoResponseGroups = {
  '3': {
    responses: demoParallelResponses,
    selectedId: undefined,
  }
};

const demoMessages: Message[] = [
  {
    id: '1',
    chatId: 'demo',
    role: 'user',
    content: [{ type: 'text', value: "Hey! Can you help me build something **amazing** today?" }],
    timestamp: new Date(Date.now() - 300000),
  },
  {
    id: '2',
    chatId: 'demo',
    role: 'assistant',
    content: [{ type: 'text', value: `Absolutely! I'd love to help you build something amazing!` }],
    timestamp: new Date(Date.now() - 240000),
    tokenCount: 156,
    generationTime: 2340,
  },
  {
    id: '3',
    chatId: 'demo',
    role: 'user',
    content: [{ type: 'text', value: "Show me Fibonacci in Python and Rust." }],
    timestamp: new Date(Date.now() - 120000),
  },
  ...demoParallelResponses,
];

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface ChatViewPaneProps {
  /** Chat ID to load, or null for new chat */
  chatId: string | null;
  /** Called when a new chat is created */
  onChatCreated?: (realChatId: string, ephemeralId?: string) => void;
  /** Chat title for header */
  title?: string;
  /** Register callback to receive input from GlobalInputHub */
  onRegisterInputHandler?: (handler: (input: ViewInput) => void) => () => void;
}

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

const isEphemeralId = (id: string | null) => id?.startsWith('new-') ?? false;

export function ChatViewPane({ chatId, onChatCreated, title, onRegisterInputHandler }: ChatViewPaneProps) {
  const chatHistory = useChatHistory({ autoLoad: true });
  const parallelAI = useParallelAI();
  const memory = useMemory();

  const isEphemeral = isEphemeralId(chatId);

  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedModels, setSelectedModels] = useState<ModelInfo[]>([mockModels[0]]);
  const [isStreaming, setIsStreaming] = useState(false);

  const [responseGroups, setResponseGroups] = useState<Record<string, {
    responses: Message[];
    selectedId?: string;
  }>>({});

  // Sync with chat history when chatId changes
  useEffect(() => {
    if (isEphemeral) {
      setMessages([]);
    } else if (chatId && chatId !== chatHistory.currentChat?.id) {
      chatHistory.selectChat(chatId).then(() => {
        setMessages(chatHistory.messages);
      });
    } else if (!chatId) {
      setMessages(demoMessages);
      setResponseGroups(demoResponseGroups);
    }
  }, [chatId, isEphemeral]);

  // Update messages when chat history changes
  useEffect(() => {
    if (chatHistory.currentChat?.id === chatId && chatHistory.messages.length > 0) {
      setMessages(chatHistory.messages);
    }
  }, [chatHistory.messages, chatHistory.currentChat?.id, chatId]);

  // Handle input received from GlobalInputHub
  const handleInput = useCallback(async (input: ViewInput) => {
    if (input.type !== 'chat') return;

    let currentChatId = chatId;
    const wasEphemeral = isEphemeral;

    if (!currentChatId || isEphemeral) {
      const newChat = await chatHistory.createChat(input.content.slice(0, 50));
      currentChatId = newChat.id;
      onChatCreated?.(newChat.id, wasEphemeral ? chatId ?? undefined : undefined);
    }

    const newUserMessage: Message = {
      id: String(Date.now()),
      chatId: currentChatId,
      role: 'user',
      content: [{ type: 'text', value: input.content }],
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, newUserMessage]);
    await chatHistory.addMessage(newUserMessage);
    setIsStreaming(true);

    const models = input.models ?? ['claude-3'];

    if (models.length > 1) {
      setTimeout(async () => {
        const responses = models.map((modelId, i) => ({
          id: String(Date.now() + 1 + i),
          chatId: currentChatId!,
          role: 'assistant' as const,
          content: [{ type: 'text' as const, value: `Response from ${modelId}: Mock parallel response.` }],
          timestamp: new Date(),
          tokenCount: Math.floor(Math.random() * 200) + 50,
          generationTime: Math.floor(Math.random() * 3000) + 1000,
        }));

        setResponseGroups(prev => ({
          ...prev,
          [newUserMessage.id]: { responses, selectedId: responses[0].id }
        }));

        setMessages(prev => [...prev, ...responses]);
        for (const response of responses) {
          await chatHistory.addMessage(response);
        }
        setIsStreaming(false);
      }, 1500);
    } else {
      setTimeout(async () => {
        const newAssistantMessage: Message = {
          id: String(Date.now() + 1),
          chatId: currentChatId!,
          role: 'assistant',
          content: [{ type: 'text' as const, value: "Mock response from the AI." }],
          timestamp: new Date(),
          tokenCount: Math.floor(Math.random() * 200) + 50,
          generationTime: Math.floor(Math.random() * 3000) + 1000,
        };
        setMessages(prev => [...prev, newAssistantMessage]);
        await chatHistory.addMessage(newAssistantMessage);
        setIsStreaming(false);
      }, 1500);
    }
  }, [chatId, isEphemeral, chatHistory, onChatCreated]);

  // Register input handler
  useEffect(() => {
    if (onRegisterInputHandler) {
      return onRegisterInputHandler(handleInput);
    }
  }, [onRegisterInputHandler, handleInput]);

  // Memory actions
  const handleSaveToMemory = useCallback(async (message: Message) => {
    if (!chatId || isEphemeral) return;
    try {
      const content = message.content.map((c) => c.value).join('\n\n');
      await memory.pinMemory(chatId, message.id, content);
    } catch (error) {
      console.error('Failed to save to memory:', error);
    }
  }, [chatId, isEphemeral, memory]);

  const handleLike = useCallback(async (messageId: string) => {
    await chatHistory.updateMessage(messageId, { isLiked: true });
  }, [chatHistory]);

  const handleDelete = useCallback(async (messageId: string) => {
    await chatHistory.deleteMessage(messageId);
    setMessages(prev => prev.filter(m => m.id !== messageId));
  }, [chatHistory]);

  const displayTitle = title || chatHistory.currentChat?.title || 'New Chat';

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: 'var(--color-bg)',
    }}>
      {/* Header */}
      <header style={{
        borderBottom: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-bg-elevated)',
        padding: '12px 16px',
        flexShrink: 0,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <h1 style={{
            fontSize: '16px',
            fontWeight: 600,
            color: 'var(--color-text)',
            margin: 0,
          }}>{displayTitle}</h1>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
            color: 'var(--color-text-secondary)',
          }}>
            <span style={{
              padding: '4px 8px',
              backgroundColor: 'var(--color-bg-tertiary)',
              color: 'var(--color-text-secondary)',
              borderRadius: '9999px',
              fontSize: '11px',
            }}>
              {selectedModels[0]?.name || 'Select Model'}
            </span>
          </div>
        </div>
      </header>

      {/* Messages */}
      <main className="custom-scrollbar" style={{
        flex: 1,
        overflowY: 'auto',
      }}>
        {messages.map((message, index) => {
          const group = message.role === 'user' ? responseGroups[message.id] : undefined;

          // Skip assistant messages that are part of a group
          if (message.role === 'assistant' && Object.values(responseGroups).some(g => g.responses.some(r => r.id === message.id))) {
            return null;
          }

          if (group) {
            return (
              <ResponseGroupContainer
                key={message.id}
                userMessage={message}
                responses={group.responses}
                selectedResponseId={group.selectedId}
                onSelectResponse={(responseId) => {
                  setResponseGroups(prev => ({
                    ...prev,
                    [message.id]: { ...prev[message.id]!, selectedId: responseId }
                  }));
                }}
                isStreaming={isStreaming && index === messages.length - 1}
              />
            );
          }

          return (
            <MessageContainer
              key={message.id}
              message={message}
              isStreaming={isStreaming && index === messages.length - 1 && message.role === 'assistant'}
              user={{ name: 'You' }}
              moodEnabled={false}
              onCopy={() => {}}
              onEdit={() => {}}
              onRegenerate={() => {}}
              onLike={() => handleLike(message.id)}
              onSaveToMemory={() => handleSaveToMemory(message)}
              onDelete={() => handleDelete(message.id)}
              onBranch={() => {}}
              onExport={() => {}}
            />
          );
        }).filter(Boolean)}

        {/* Streaming indicator */}
        {isStreaming && (
          <div style={{
            padding: '16px',
            backgroundColor: 'var(--color-bg-secondary)',
          }}>
            <div style={{ maxWidth: '48rem', margin: '0 auto' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                color: 'var(--color-text-secondary)',
              }}>
                <span style={{
                  display: 'inline-block',
                  width: '8px',
                  height: '8px',
                  backgroundColor: 'var(--color-accent)',
                  borderRadius: '50%',
                  animation: 'pulse 1.5s infinite',
                }} />
                {selectedModels[0]?.name || 'AI'} is thinking...
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
