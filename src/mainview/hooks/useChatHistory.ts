// =============================================================================
// USE CHAT HISTORY
// =============================================================================
// Hook for managing chat history with persistence via IPC.

import { useState, useCallback, useEffect, useRef } from 'react';
import type { Message, ModelInfo } from '../types';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface ChatMetadata {
  id: string;
  title: string;
  promptId?: string;
  models: string[];
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

export interface UseChatHistoryOptions {
  /** Auto-load chats on mount */
  autoLoad?: boolean;

  /** Initial chat ID to load */
  initialChatId?: string;
}

export interface UseChatHistoryReturn {
  // State
  chats: ChatMetadata[];
  currentChat: ChatMetadata | null;
  messages: Message[];
  loading: boolean;
  error: string | null;

  // Chat operations
  loadChats: () => Promise<void>;
  createChat: (title?: string, models?: string[]) => Promise<ChatMetadata>;
  selectChat: (chatId: string) => Promise<void>;
  updateChat: (updates: Partial<ChatMetadata>) => Promise<void>;
  deleteChat: (chatId: string) => Promise<void>;

  // Message operations
  addMessage: (message: Message) => Promise<void>;
  updateMessage: (messageId: string, updates: Partial<Message>) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  clearMessages: () => Promise<void>;
}

// -----------------------------------------------------------------------------
// IPC BRIDGE
// -----------------------------------------------------------------------------

// Check if we're in Electrobun environment
const ipc = typeof window !== 'undefined' && (window as any).electrobun?.ipc;

async function sendIPC<T>(channel: string, data?: unknown): Promise<T> {
  if (!ipc) {
    console.warn(`[useChatHistory] IPC not available for ${channel}`);
    throw new Error('IPC not available');
  }

  return await ipc.send(channel, data);
}

function onIPCMessage(channel: string, handler: (data: unknown) => void): () => void {
  if (!ipc) return () => {};

  ipc.on(channel, handler);
  return () => ipc.off(channel, handler);
}

// -----------------------------------------------------------------------------
// HOOK
// -----------------------------------------------------------------------------

export function useChatHistory(options: UseChatHistoryOptions = {}): UseChatHistoryReturn {
  const { autoLoad = true, initialChatId } = options;

  const [chats, setChats] = useState<ChatMetadata[]>([]);
  const [currentChat, setCurrentChat] = useState<ChatMetadata | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialized = useRef(false);

  // ---------------------------------------------------------------------------
  // CHAT OPERATIONS
  // ---------------------------------------------------------------------------

  const loadChats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const chatList = await sendIPC<ChatMetadata[]>('chat:list');
      setChats(chatList);
    } catch (err) {
      setError((err as Error).message);
      // If IPC not available, continue with empty chats
      setChats([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const createChat = useCallback(async (title?: string, models?: string[]): Promise<ChatMetadata> => {
    try {
      setError(null);
      const chat = await sendIPC<ChatMetadata>('chat:create', { title, models });
      setChats(prev => [chat, ...prev]);
      setCurrentChat(chat);
      setMessages([]);
      return chat;
    } catch (err) {
      // Fallback for non-IPC environment (demo mode)
      const id = `demo-${Date.now()}`;
      const now = new Date().toISOString();
      const chat: ChatMetadata = {
        id,
        title: title || 'New Chat',
        models: models || [],
        createdAt: now,
        updatedAt: now,
        messageCount: 0,
      };
      setChats(prev => [chat, ...prev]);
      setCurrentChat(chat);
      setMessages([]);
      return chat;
    }
  }, []);

  const selectChat = useCallback(async (chatId: string) => {
    try {
      setLoading(true);
      setError(null);

      // Get chat metadata
      const chat = await sendIPC<ChatMetadata | null>('chat:get', chatId);
      if (!chat) {
        throw new Error(`Chat ${chatId} not found`);
      }

      // Get messages
      const storedMessages = await sendIPC<StoredMessage[]>('chat:get-messages', chatId);

      // Convert stored messages to Message type
      const msgs: Message[] = storedMessages.map(sm => ({
        id: sm.id,
        chatId: sm.chatId,
        role: sm.role,
        content: sm.content,
        model: sm.model,
        attachments: sm.attachments,
        toolCalls: sm.toolCalls,
        tokenCount: sm.tokenCount,
        generationTime: sm.generationTime,
        timestamp: new Date(sm.timestamp),
        branchId: sm.branchId,
        parentId: sm.parentId,
        isLiked: sm.isLiked,
      }));

      setCurrentChat(chat);
      setMessages(msgs);
    } catch (err) {
      setError((err as Error).message);
      // In demo mode, just select the chat from local state
      const chat = chats.find(c => c.id === chatId);
      if (chat) {
        setCurrentChat(chat);
      }
    } finally {
      setLoading(false);
    }
  }, [chats]);

  const updateChat = useCallback(async (updates: Partial<ChatMetadata>) => {
    if (!currentChat) return;

    try {
      setError(null);
      const updated = await sendIPC<ChatMetadata>('chat:update', {
        chatId: currentChat.id,
        updates,
      });

      setCurrentChat(updated);
      setChats(prev => prev.map(c => c.id === updated.id ? updated : c));
    } catch (err) {
      // Fallback for demo mode
      const updated = { ...currentChat, ...updates, updatedAt: new Date().toISOString() };
      setCurrentChat(updated);
      setChats(prev => prev.map(c => c.id === updated.id ? updated : c));
    }
  }, [currentChat]);

  const deleteChat = useCallback(async (chatId: string) => {
    try {
      setError(null);
      await sendIPC<void>('chat:delete', chatId);

      setChats(prev => prev.filter(c => c.id !== chatId));

      // If current chat was deleted, clear it
      if (currentChat?.id === chatId) {
        setCurrentChat(null);
        setMessages([]);
      }
    } catch (err) {
      // Fallback for demo mode
      setChats(prev => prev.filter(c => c.id !== chatId));
      if (currentChat?.id === chatId) {
        setCurrentChat(null);
        setMessages([]);
      }
    }
  }, [currentChat]);

  // ---------------------------------------------------------------------------
  // MESSAGE OPERATIONS
  // ---------------------------------------------------------------------------

  const addMessage = useCallback(async (message: Message) => {
    if (!currentChat) return;

    // Add to local state immediately
    setMessages(prev => [...prev, message]);

    // Convert to stored format
    const storedMessage: StoredMessage = {
      id: message.id,
      chatId: currentChat.id,
      role: message.role,
      content: message.content,
      model: typeof message.model === 'string' ? message.model : message.model?.id,
      attachments: message.attachments,
      toolCalls: message.toolCalls,
      tokenCount: message.tokenCount,
      generationTime: message.generationTime,
      timestamp: message.timestamp.toISOString(),
      branchId: message.branchId,
      parentId: message.parentId,
      isLiked: message.isLiked,
    };

    try {
      await sendIPC<void>('chat:add-message', {
        chatId: currentChat.id,
        message: storedMessage,
      });

      // Update chat title from first user message if untitled
      if (currentChat.title === 'New Chat' && message.role === 'user' && messages.length === 0) {
        const firstLine = message.content[0]?.value?.slice(0, 50) || 'Untitled';
        await updateChat({ title: firstLine + (firstLine.length >= 50 ? '...' : '') });
      }
    } catch (err) {
      // Already added to local state, just log error
      console.warn('[useChatHistory] Failed to persist message:', err);
    }
  }, [currentChat, messages.length, updateChat]);

  const updateMessage = useCallback(async (messageId: string, updates: Partial<Message>) => {
    if (!currentChat) return;

    // Update local state
    setMessages(prev => prev.map(m =>
      m.id === messageId ? { ...m, ...updates } : m
    ));

    try {
      await sendIPC<void>('chat:update-message', {
        chatId: currentChat.id,
        messageId,
        updates: {
          ...updates,
          timestamp: updates.timestamp?.toISOString(),
        },
      });
    } catch (err) {
      console.warn('[useChatHistory] Failed to update message:', err);
    }
  }, [currentChat]);

  const deleteMessage = useCallback(async (messageId: string) => {
    if (!currentChat) return;

    // Remove from local state
    setMessages(prev => prev.filter(m => m.id !== messageId));

    try {
      await sendIPC<void>('chat:delete-message', {
        chatId: currentChat.id,
        messageId,
      });
    } catch (err) {
      console.warn('[useChatHistory] Failed to delete message:', err);
    }
  }, [currentChat]);

  const clearMessages = useCallback(async () => {
    if (!currentChat) return;

    setMessages([]);

    try {
      await sendIPC<void>('chat:clear-messages', currentChat.id);
    } catch (err) {
      console.warn('[useChatHistory] Failed to clear messages:', err);
    }
  }, [currentChat]);

  // ---------------------------------------------------------------------------
  // IPC EVENT LISTENERS
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const unsubs = [
      onIPCMessage('chat:created', (data: any) => {
        if (data?.metadata) {
          setChats(prev => [data.metadata, ...prev]);
        }
      }),
      onIPCMessage('chat:updated', (data: any) => {
        if (data?.metadata) {
          setChats(prev => prev.map(c => c.id === data.metadata.id ? data.metadata : c));
          if (currentChat?.id === data.metadata.id) {
            setCurrentChat(data.metadata);
          }
        }
      }),
      onIPCMessage('chat:deleted', (data: any) => {
        if (data?.chatId) {
          setChats(prev => prev.filter(c => c.id !== data.chatId));
          if (currentChat?.id === data.chatId) {
            setCurrentChat(null);
            setMessages([]);
          }
        }
      }),
      onIPCMessage('chat:message-added', (data: any) => {
        if (data?.chatId === currentChat?.id && data?.message) {
          // Message already added locally, skip
        }
      }),
    ];

    return () => unsubs.forEach(unsub => unsub());
  }, [currentChat]);

  // ---------------------------------------------------------------------------
  // INITIALIZATION
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    if (autoLoad) {
      loadChats().then(() => {
        if (initialChatId) {
          selectChat(initialChatId);
        }
      });
    }
  }, [autoLoad, initialChatId, loadChats, selectChat]);

  return {
    chats,
    currentChat,
    messages,
    loading,
    error,
    loadChats,
    createChat,
    selectChat,
    updateChat,
    deleteChat,
    addMessage,
    updateMessage,
    deleteMessage,
    clearMessages,
  };
}

// -----------------------------------------------------------------------------
// TYPES (for IPC)
// -----------------------------------------------------------------------------

interface StoredMessage {
  id: string;
  chatId: string;
  role: 'user' | 'assistant' | 'system';
  content: Array<{
    type: string;
    value: string;
    language?: string;
    metadata?: Record<string, unknown>;
  }>;
  model?: string;
  attachments?: unknown[];
  toolCalls?: unknown[];
  tokenCount?: number;
  generationTime?: number;
  timestamp: string;
  branchId?: string;
  parentId?: string;
  isLiked?: boolean;
}
