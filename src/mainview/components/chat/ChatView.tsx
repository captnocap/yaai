// =============================================================================
// CHAT VIEW
// =============================================================================
// Main chat interface component. Displays messages and input area.
// Used by router for both new chats (/) and specific chats (/chat/:id).

import React, { useState, useEffect, useCallback } from 'react';
import { MessageContainer } from '../message/MessageContainer';
import { InputContainer } from '../input/InputContainer';
import { useChatHistory } from '../../hooks';
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
  /** Chat ID to load, or null for new chat */
  chatId: string | null;
  /** Called when a new chat is created */
  onChatCreated?: (chatId: string) => void;
  /** Chat title for header */
  title?: string;
}

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function ChatView({ chatId, onChatCreated, title }: ChatViewProps) {
  const chatHistory = useChatHistory({ autoLoad: true });

  const [messages, setMessages] = useState<Message[]>(chatId ? [] : demoMessages);
  const [selectedModels, setSelectedModels] = useState<ModelInfo[]>([mockModels[0]]);
  const [attachments, setAttachments] = useState<FileObject[]>([]);
  const [uploads, setUploads] = useState<FileUpload[]>([]);
  const [tools, setTools] = useState<ToolConfig[]>(mockTools);
  const [isStreaming, setIsStreaming] = useState(false);

  // Sync with chat history when chatId changes
  useEffect(() => {
    if (chatId && chatId !== chatHistory.currentChat?.id) {
      chatHistory.selectChat(chatId).then(() => {
        setMessages(chatHistory.messages);
      });
    } else if (!chatId) {
      // New chat - show demo or empty
      setMessages(demoMessages);
    }
  }, [chatId]);

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
    // Create chat if this is a new one
    let currentChatId = chatId;
    if (!currentChatId) {
      const newChat = await chatHistory.createChat(input.content.slice(0, 50));
      currentChatId = newChat.id;
      onChatCreated?.(newChat.id);
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

    // TODO: Replace with real AI call using useAI hook
    // Simulate assistant response after a delay
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
  }, [chatId, chatHistory, onChatCreated]);

  const handleToolToggle = useCallback((toolId: string, enabled: boolean) => {
    setTools(prev => prev.map(t => t.id === toolId ? { ...t, enabled } : t));
  }, []);

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
        {messages.map((message, index) => (
          <MessageContainer
            key={message.id}
            message={message}
            isStreaming={isStreaming && index === messages.length - 1 && message.role === 'assistant'}
            user={{ name: 'You' }}
            moodEnabled={false}
            onCopy={() => console.log('Copy')}
            onEdit={() => console.log('Edit')}
            onRegenerate={() => console.log('Regenerate')}
            onLike={() => console.log('Like')}
            onSaveToMemory={() => console.log('Save to memory')}
            onDelete={() => console.log('Delete')}
            onBranch={() => console.log('Branch')}
            onExport={() => console.log('Export')}
          />
        ))}

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
      />
    </div>
  );
}
