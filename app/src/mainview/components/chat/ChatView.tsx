// =============================================================================
// CHAT VIEW
// =============================================================================
// Main chat interface component. Displays messages and input area.
// Used by router for both new chats (/) and specific chats (/chat/:id).

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { MessageContainer } from '../message/MessageContainer';
import { ResponseGroupContainer } from '../response-group/ResponseGroupContainer';
import { useChatHistory, useDraft, useMemory } from '../../hooks';
import { useParallelAI } from '../../hooks/useParallelAI';
import { useWorkspaceInputContext, type ViewInput } from '../../workspace';
import type { Message, FileObject, FileUpload, Memory, ToolConfig, ModelInfo } from '../../types';
import type { MemoryResult } from '../../types/memory';

// Helper to convert MemoryResult to Memory format
const memoryResultToMemory = (result: MemoryResult): Memory => ({
  id: result.id,
  content: result.content,
  source: result.source || 'memory',
  relevance: result.score,
  timestamp: result.timestamp,
});

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

// mockMemories removed - using attachedMemories state instead

// -----------------------------------------------------------------------------
// DEMO DATA - Showcases all response card features
// -----------------------------------------------------------------------------

// Demo parallel responses with diverse content types
const demoParallelResponses: Message[] = [
  // GPT-4: Code with thinking block
  {
    id: '4',
    chatId: 'demo',
    role: 'assistant' as const,
    content: [
      {
        type: 'thinking' as const,
        value: `Analyzing request for FastAPI backend...
> Language: Python 3.11+
> Framework: FastAPI with Pydantic v2
> Features: async endpoints, type validation
> Generating boilerplate with User model...`
      },
      {
        type: 'text' as const,
        value: "Here's a production-ready FastAPI backend with User authentication:"
      },
      {
        type: 'code' as const,
        language: 'python',
        value: `from fastapi import FastAPI, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from typing import Optional
import uvicorn

app = FastAPI(title="User API", version="1.0.0")

class User(BaseModel):
    id: int
    username: str
    email: EmailStr
    is_active: bool = True

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

@app.post("/users/", response_model=User)
async def create_user(user: UserCreate) -> User:
    # Hash password and save to DB
    return User(id=1, username=user.username, email=user.email)

@app.get("/users/{user_id}", response_model=User)
async def get_user(user_id: int) -> User:
    return User(id=user_id, username="demo", email="demo@example.com")`
      },
      {
        type: 'text' as const,
        value: "Run with: uvicorn main:app --reload"
      }
    ],
    timestamp: new Date(Date.now() - 100000),
    tokenCount: { input: 45, output: 312 },
    generationTime: 1847,
    model: {
      id: 'gpt-4-turbo',
      name: 'GPT-4 Turbo',
      apiModel: 'gpt-4-turbo-preview',
      provider: 'OpenAI',
      apiProvider: 'OpenRouter',
      contextWindow: 128000,
    },
  },
  // Claude: Mixed content with image
  {
    id: '5',
    chatId: 'demo',
    role: 'assistant' as const,
    content: [
      {
        type: 'thinking' as const,
        value: `Processing character design request...
> Style: Cyberpunk Oni fusion
> Elements: Traditional mask + neon tech
> Generating concept description...
> Rendering visual asset...`
      },
      {
        type: 'text' as const,
        value: "I've created a concept for the Cyberpunk Oni character. The design fuses traditional Japanese demon aesthetics with high-tech augmentation:"
      },
      {
        type: 'image' as const,
        url: 'https://images.unsplash.com/photo-1555680202-c86f0e12f086?q=80&w=800&auto=format&fit=crop',
      },
      {
        type: 'text' as const,
        value: "Key design elements:\n• Holographic horn projectors\n• Integrated HUD visor with threat detection\n• Chromatic shift paint that responds to combat state\n• Traditional mask motifs with circuit trace patterns"
      }
    ],
    timestamp: new Date(Date.now() - 100000),
    tokenCount: { input: 38, output: 245 },
    generationTime: 2134,
    model: {
      id: 'claude-3-opus',
      name: 'Claude 3 Opus',
      apiModel: 'claude-3-opus-20240229',
      provider: 'Anthropic',
      apiProvider: 'OpenRouter',
      contextWindow: 200000,
    },
  },
  // Gemini: TypeScript code example
  {
    id: '6',
    chatId: 'demo',
    role: 'assistant' as const,
    content: [
      {
        type: 'thinking' as const,
        value: `Evaluating TypeScript patterns...
> Pattern: React custom hook
> Features: Generic types, error handling
> Adding proper TypeScript annotations...`
      },
      {
        type: 'text' as const,
        value: "Here's a type-safe React hook for API fetching with full TypeScript support:"
      },
      {
        type: 'code' as const,
        language: 'typescript',
        value: `import { useState, useEffect, useCallback } from 'react';

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

export function useFetch<T>(url: string): FetchState<T> & { refetch: () => void } {
  const [state, setState] = useState<FetchState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  const fetchData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(\`HTTP \${response.status}\`);
      const data = await response.json();
      setState({ data, loading: false, error: null });
    } catch (error) {
      setState({ data: null, loading: false, error: error as Error });
    }
  }, [url]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { ...state, refetch: fetchData };
}`
      },
      {
        type: 'text' as const,
        value: "Usage: const { data, loading, error, refetch } = useFetch<User[]>('/api/users');"
      }
    ],
    timestamp: new Date(Date.now() - 100000),
    tokenCount: { input: 42, output: 287 },
    generationTime: 1623,
    model: {
      id: 'gemini-1.5-pro',
      name: 'Gemini 1.5 Pro',
      apiModel: 'gemini-1.5-pro-latest',
      provider: 'Google',
      apiProvider: 'Google AI',
      contextWindow: 1000000,
    },
  },
  // Imagen: Image generation
  {
    id: '7',
    chatId: 'demo',
    role: 'assistant' as const,
    content: [
      {
        type: 'thinking' as const,
        value: `Image generation pipeline...
> Prompt: Neon rain reflection, cyberpunk city
> Style: Photorealistic, cinematic lighting
> Resolution: 1024x1024
> Upscaling texture details...`
      },
      {
        type: 'image_gen' as const,
        url: 'https://images.unsplash.com/photo-1605218427306-633ba8714286?q=80&w=800&auto=format&fit=crop',
      },
      {
        type: 'text' as const,
        value: "Generated with cinematic rain effects and volumetric neon lighting. The reflections on the wet pavement create depth and atmosphere."
      }
    ],
    timestamp: new Date(Date.now() - 100000),
    tokenCount: { input: 24, output: 1 },
    generationTime: 8420,
    model: {
      id: 'imagen-3',
      name: 'Imagen 3',
      apiModel: 'imagen-3.0-generate-001',
      provider: 'DeepMind',
      apiProvider: 'Google AI',
      contextWindow: 0, // Not applicable for image gen
    },
  },
  // Error demo: Context length exceeded
  {
    id: '8',
    chatId: 'demo',
    role: 'assistant' as const,
    content: [],
    timestamp: new Date(Date.now() - 100000),
    model: {
      id: 'mistral-large',
      name: 'Mistral Large',
      apiModel: 'mistral-large-latest',
      provider: 'Mistral',
      apiProvider: 'OpenRouter',
      contextWindow: 32000,
    },
    error: {
      code: 'context_length_exceeded' as const,
      message: 'The conversation history plus your request exceeds the 32,000 token context limit for this model.',
      details: 'Current context: 34,521 tokens\nModel limit: 32,000 tokens\nOverage: 2,521 tokens\n\nTry removing earlier messages or attachments to reduce context size.',
      retryable: false,
    },
  },
  // Error demo: Service unavailable
  {
    id: '9',
    chatId: 'demo',
    role: 'assistant' as const,
    content: [],
    timestamp: new Date(Date.now() - 100000),
    model: {
      id: 'llama-3.1-70b',
      name: 'Llama 3.1 70B',
      apiModel: 'meta-llama/llama-3.1-70b-instruct',
      provider: 'Meta',
      apiProvider: 'Together',
      contextWindow: 128000,
    },
    error: {
      code: 'service_unavailable' as const,
      message: 'The Together API is currently experiencing high load. The service may be temporarily unavailable.',
      details: 'HTTP 503: Service Unavailable\nEndpoint: api.together.xyz/v1/chat/completions\nRetry-After: 30s',
      retryable: true,
    },
  },
];

const demoResponseGroups = {
  '3': {
    responses: demoParallelResponses,
    selectedId: undefined, // Show comparison view - no selection yet
  }
};

const demoMessages: Message[] = [
  {
    id: '1',
    chatId: 'demo',
    role: 'user',
    content: [{ type: 'text', value: "Hey! Can you help me build something today?" }],
    timestamp: new Date(Date.now() - 300000),
  },
  {
    id: '2',
    chatId: 'demo',
    role: 'assistant',
    content: [{
      type: 'text',
      value: "Of course! I can help with code, design concepts, or creative projects. What would you like to work on?"
    }],
    timestamp: new Date(Date.now() - 240000),
    tokenCount: 156,
    generationTime: 2340,
    model: {
      id: 'claude-3-opus',
      name: 'Claude 3 Opus',
      apiModel: 'claude-3-opus-20240229',
      provider: 'Anthropic',
      apiProvider: 'OpenRouter',
      contextWindow: 200000,
    },
  },
  {
    id: '3',
    chatId: 'demo',
    role: 'user',
    content: [{ type: 'text', value: "Show me what you can do - give me some code examples, a character concept, and maybe generate an image." }],
    timestamp: new Date(Date.now() - 120000),
  },
  ...demoParallelResponses,
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
  const { registerViewHandler } = useWorkspaceInputContext();

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
  const [attachedMemories, setAttachedMemories] = useState<Memory[]>([]);

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
      // No chat ID - show demo messages with parallel example
      setMessages(demoMessages);
      setResponseGroups(demoResponseGroups);
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
          content: [{ type: 'text' as const, value: `Response from model ${i + 1} (${modelId}): This is a **mock parallel response**! The real implementation will stream from multiple models simultaneously.` }],
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
          content: [{ type: 'text' as const, value: "This is a **mock response**! In the real app, this would come from the AI. The mood system would analyze your message and adapt the UI accordingly." }],
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

  // Registration for Global Input Hub (when using the 'main' fallback)
  useEffect(() => {
    const handler = (input: ViewInput) => {
      if (input.type === 'chat') {
        handleSend({
          content: input.content,
          models: input.models || [],
          tools: input.tools || [],
          memoryIds: input.memoryIds || [],
        });
      }
    };

    return registerViewHandler('main', handler);
  }, [registerViewHandler, handleSend]);

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

  // Handle adding a memory from the memory stream
  const handleAddMemory = useCallback((memoryResult: MemoryResult) => {
    const memory = memoryResultToMemory(memoryResult);
    setAttachedMemories(prev => {
      // Don't add duplicates
      if (prev.some(m => m.id === memory.id)) return prev;
      return [...prev, memory];
    });
  }, []);

  // Handle removing an attached memory
  const handleRemoveMemory = useCallback((memoryId: string) => {
    setAttachedMemories(prev => prev.filter(m => m.id !== memoryId));
  }, []);

  // Compute the last assistant message ID for affect feedback
  const lastAssistantMessageId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') {
        return messages[i].id;
      }
    }
    return undefined;
  }, [messages]);

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

      {/* Messages area */}
      <main className="custom-scrollbar" style={{
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
      }}>
        {/* Render messages */}
        {(() => {
          return (
            <>
              {messages.map((message, index) => {
                const group = message.role === 'user' ? responseGroups[message.id] : undefined;

                // Skip assistant messages that are part of a group
                if (message.role === 'assistant' && Object.values(responseGroups).some(g => g.responses.some(r => r.id === message.id))) {
                  return null;
                }

                // Response group - render with flex-1 to fill space
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
                      className="flex-1 min-h-[400px]"
                    />
                  );
                }

                // Single message
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
            </>
          );
        })()}

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
