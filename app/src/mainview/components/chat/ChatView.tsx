// =============================================================================
// CHAT VIEW
// =============================================================================
// Main chat interface component. Displays messages and input area.
// Used by router for both new chats (/) and specific chats (/chat/:id).

import React, { useState, useEffect, useCallback } from 'react';
import { MessageContainer } from '../message/MessageContainer';
import { InputContainer } from '../input/InputContainer';
import { ResponseGroupContainer } from '../response-group/ResponseGroupContainer';
import { useChatHistory, useDraft, useMemory } from '../../hooks';
import { useParallelAI } from '../../hooks/useParallelAI';
import type { Message, FileObject, FileUpload, Memory, ToolConfig, ModelInfo } from '../../types';

// -----------------------------------------------------------------------------
// MOCK DATA (temporary - will be replaced with real data)
// -----------------------------------------------------------------------------

const mockModels: ModelInfo[] = [
  { id: 'claude-3', name: 'Claude 3 Opus', provider: 'anthropic', contextWindow: 200000 },
  { id: 'gpt-4', name: 'GPT-4 Turbo', provider: 'openai', contextWindow: 128000 },
  { id: 'gemini', name: 'Gemini Pro', provider: 'google', contextWindow: 32000 },
];

const mockTools: ToolConfig[] = [
  { id: 'web', name: 'Web Search', icon: 'globe', enabled: true },
  { id: 'code', name: 'Code Exec', icon: 'terminal', enabled: false },
  { id: 'browser', name: 'Browser', icon: 'chrome', enabled: false },
];

const mockMemories: Memory[] = [];

// Demo messages for new chats
const demoMessages: Message[] = [
  {
    id: '1',
    chatId: 'demo',
    role: 'user',
    content: [{ type: 'text', value: "Hey! Can you help me build something **amazing** today? I'm really excited to get started!" }],
    timestamp: new Date(Date.now() - 300000),
  },
  {
    id: '2',
    chatId: 'demo',
    role: 'assistant',
    content: [{
      type: 'text',
      value: `Absolutely! I'd love to help you build something amazing!

Here's what we could create together:

1. **A reactive chat interface** with mood-based themes
2. **Dynamic text effects** that respond to emotions
3. **Beautiful ambient backgrounds** with floating orbs

Let me show you some code:

\`\`\`typescript
const amazing = () => {
  return "Let's build something incredible!";
};
\`\`\`

What sounds most interesting to you?`
    }],
    timestamp: new Date(Date.now() - 240000),
    tokenCount: 156,
    generationTime: 2340,
  },
];

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface ChatViewProps {
  /** Chat ID to load, or null for new chat. Can be ephemeral (starts with "new-") */
  chatId: string | null;
  /** Called when a new chat is created (promotes ephemeral to real) */
  onChatCreated?: (realChatId: string, ephemeralId?: string) => void;
  /** Chat title for header */
  title?: string;
}

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

// Check if an ID is ephemeral (not yet persisted)
const isEphemeralId = (id: string | null) => id?.startsWith('new-') ?? false;

export function ChatView({ chatId, onChatCreated, title }: ChatViewProps) {
  const chatHistory = useChatHistory({ autoLoad: true });
  const parallelAI = useParallelAI();
  const memory = useMemory();

  // Check if this is an ephemeral (unsaved) chat
  const isEphemeral = isEphemeralId(chatId);

  // Draft persistence - auto-saves with debounce
  // Don't save drafts for ephemeral chats (they don't exist in backend yet)
  const {
    draft,
    updateContent: updateDraftContent,
    updateModel: updateDraftModel,
    clearDraft,
  } = useDraft(isEphemeral ? null : chatId, 'chat');

  // For ephemeral chats, start with empty messages; for real chats, load from history
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedModels, setSelectedModels] = useState<ModelInfo[]>([mockModels[0]]);
  const [attachments, setAttachments] = useState<FileObject[]>([]);
  const [uploads, setUploads] = useState<FileUpload[]>([]);
  const [tools, setTools] = useState<ToolConfig[]>(mockTools);
  const [isStreaming, setIsStreaming] = useState(false);
  const [inputContent, setInputContent] = useState('');

  // Response groups mapping: userMessageId -> { responses: Message[], selectedId?: string }
  const [responseGroups, setResponseGroups] = useState<Record<string, {
    responses: Message[];
    selectedId?: string;
  }>>({});

  // Restore draft content when loaded
  useEffect(() => {
    if (draft?.content) {
      setInputContent(draft.content);
    }
  }, [draft?.content]);

  // Sync with chat history when chatId changes
  useEffect(() => {
    if (isEphemeral) {
      // Ephemeral chat - start fresh, don't try to load from backend
      setMessages([]);
    } else if (chatId && chatId !== chatHistory.currentChat?.id) {
      // Real chat - load from backend
      chatHistory.selectChat(chatId).then(() => {
        setMessages(chatHistory.messages);
      });
    } else if (!chatId) {
      // No chat ID - show demo messages
      setMessages(demoMessages);
    }
  }, [chatId, isEphemeral]);

  // Handle input content changes - save to draft
  const handleContentChange = useCallback((content: string) => {
    setInputContent(content);
    if (chatId) {
      updateDraftContent(content);
    }
  }, [chatId, updateDraftContent]);

  // Update messages when chat history changes
  useEffect(() => {
    if (chatHistory.currentChat?.id === chatId && chatHistory.messages.length > 0) {
      setMessages(chatHistory.messages);
    }
  }, [chatHistory.messages, chatHistory.currentChat?.id, chatId]);

  const handleSend = useCallback(async (input: {
    content: string;
    models: string[];
    tools: string[];
    memoryIds: string[];
  }) => {
    // Create a real chat if this is new or ephemeral
    let currentChatId = chatId;
    const wasEphemeral = isEphemeral;

    if (!currentChatId || isEphemeral) {
      // Create a real chat in the backend
      const newChat = await chatHistory.createChat(input.content.slice(0, 50));
      currentChatId = newChat.id;
      // Notify parent to promote ephemeral → real (or just navigate if no ephemeral)
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

    // Clear draft after sending
    setInputContent('');
    await clearDraft();

    // Handle parallel or single model responses
    if (input.models.length > 1) {
      // Parallel: send to multiple models at once
      // This will trigger useParallelAI to stream responses
      // For now, create a mock response group with multiple responses
      setTimeout(async () => {
        const responses = input.models.map((modelId, i) => ({
          id: String(Date.now() + 1 + i),
          chatId: currentChatId!,
          role: 'assistant' as const,
          content: [{ type: 'text', value: `Response from model ${i + 1} (${modelId}): This is a **mock parallel response**! The real implementation will stream from multiple models simultaneously.` }],
          timestamp: new Date(),
          tokenCount: Math.floor(Math.random() * 200) + 50,
          generationTime: Math.floor(Math.random() * 3000) + 1000,
        }));

        setResponseGroups(prev => ({
          ...prev,
          [newUserMessage.id]: {
            responses,
            selectedId: responses[0].id, // Auto-select first for now
          }
        }));

        setMessages(prev => [...prev, ...responses]);
        for (const response of responses) {
          await chatHistory.addMessage(response);
        }
        setIsStreaming(false);
      }, 1500);
    } else {
      // Single model: use regular single response
      setTimeout(async () => {
        const newAssistantMessage: Message = {
          id: String(Date.now() + 1),
          chatId: currentChatId!,
          role: 'assistant',
          content: [{ type: 'text', value: "This is a **mock response**! In the real app, this would come from the AI. The mood system would analyze your message and adapt the UI accordingly." }],
          timestamp: new Date(),
          tokenCount: Math.floor(Math.random() * 200) + 50,
          generationTime: Math.floor(Math.random() * 3000) + 1000,
        };
        setMessages(prev => [...prev, newAssistantMessage]);
        await chatHistory.addMessage(newAssistantMessage);
        setIsStreaming(false);
      }, 1500);
    }
  }, [chatId, isEphemeral, chatHistory, onChatCreated, clearDraft]);

  const handleToolToggle = useCallback((toolId: string, enabled: boolean) => {
    setTools(prev => prev.map(t => t.id === toolId ? { ...t, enabled } : t));
  }, []);

  // Memory action handlers
  const handleSaveToMemory = useCallback(async (message: Message) => {
    if (!chatId || isEphemeral) {
      console.warn('Cannot save to memory: chat not persisted');
      return;
    }

    try {
      // Extract text content from message
      const content = message.content
        .map((c) => c.value)
        .join('\n\n');

      // Pin the message to memory (L4 salience layer)
      await memory.pinMemory(chatId, message.id, content);
      console.log('Message saved to memory:', message.id);
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
          // Check if this user message has a response group
          const group = message.role === 'user' ? responseGroups[message.id] : undefined;

          // Skip rendering individual assistant messages that are part of a group
          // (they'll be rendered as part of the ResponseGroupContainer)
          if (message.role === 'assistant' && Object.values(responseGroups).some(g => g.responses.some(r => r.id === message.id))) {
            return null;
          }

          // Render response group container if this is a user message with grouped responses
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
                    [message.id]: {
                      ...prev[message.id]!,
                      selectedId: responseId,
                    }
                  }));
                }}
                isStreaming={isStreaming && index === messages.length - 1}
              />
            );
          }

          // Render single message normally
          return (
            <MessageContainer
              key={message.id}
              message={message}
              isStreaming={isStreaming && index === messages.length - 1 && message.role === 'assistant'}
              user={{ name: 'You' }}
              moodEnabled={false}
              onCopy={() => console.log('Copy')}
              onEdit={() => console.log('Edit')}
              onRegenerate={() => console.log('Regenerate')}
              onLike={() => handleLike(message.id)}
              onSaveToMemory={() => handleSaveToMemory(message)}
              onDelete={() => handleDelete(message.id)}
              onBranch={() => console.log('Branch')}
              onExport={() => console.log('Export')}
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

      {/* Input */}
      <InputContainer
        onSend={handleSend}
        models={mockModels}
        selectedModels={selectedModels}
        onModelsChange={setSelectedModels}
        attachments={attachments}
        uploads={uploads}
        onAttach={(files) => console.log('Attach:', files)}
        onRemoveAttachment={(id) => setAttachments(prev => prev.filter(f => f.id !== id))}
        onCancelUpload={(index) => setUploads(prev => prev.filter((_, i) => i !== index))}
        memories={mockMemories}
        onRemoveMemory={(id) => console.log('Remove memory:', id)}
        tools={tools}
        onToolToggle={handleToolToggle}
        tokenEstimate={42}
        tokenTotal={1847}
        tokenLimit={200000}
        isLoading={isStreaming}
        moodEnabled={false}
        initialContent={inputContent}
        onContentChange={handleContentChange}
      />
    </div>
  );
}
