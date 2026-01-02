// =============================================================================
// CHAT STORE
// =============================================================================
// Manages chat and message persistence on disk.
// Stores chats at ~/.yaai/chats/{chat-id}/

import { readdir, readFile, writeFile, rm, mkdir } from 'fs/promises';
import { join } from 'path';
import { EventEmitter } from 'events';
import { CHATS_DIR, getChatDir, getChatMessagesPath } from './paths';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface ChatMetadata {
  id: string;
  title: string;
  promptId?: string;
  models: string[]; // Model IDs used in this chat
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

export interface StoredMessage {
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
  attachments?: Array<{
    id: string;
    name: string;
    type: string;
    size: number;
    url?: string;
  }>;
  toolCalls?: Array<{
    id: string;
    name: string;
    input: unknown;
    output?: unknown;
    status: string;
  }>;
  tokenCount?: number;
  generationTime?: number;
  timestamp: string;
  branchId?: string;
  parentId?: string;
  isLiked?: boolean;
}

export type ChatStoreEvent = 'created' | 'updated' | 'deleted' | 'message-added';

// -----------------------------------------------------------------------------
// IMPLEMENTATION
// -----------------------------------------------------------------------------

export class ChatStore {
  private events = new EventEmitter();
  private initialized = false;

  // ---------------------------------------------------------------------------
  // INITIALIZATION
  // ---------------------------------------------------------------------------

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Ensure chats directory exists
    await mkdir(CHATS_DIR, { recursive: true });
    this.initialized = true;
  }

  // ---------------------------------------------------------------------------
  // CHAT OPERATIONS
  // ---------------------------------------------------------------------------

  /**
   * Create a new chat
   */
  async create(title: string = 'New Chat', models: string[] = []): Promise<ChatMetadata> {
    await this.ensureInitialized();

    const id = this.generateId();
    const now = new Date().toISOString();

    const metadata: ChatMetadata = {
      id,
      title,
      models,
      createdAt: now,
      updatedAt: now,
      messageCount: 0,
    };

    // Create chat directory
    const chatDir = getChatDir(id);
    await mkdir(chatDir, { recursive: true });

    // Write metadata
    await writeFile(
      join(chatDir, 'metadata.json'),
      JSON.stringify(metadata, null, 2)
    );

    // Initialize empty messages array
    await writeFile(
      getChatMessagesPath(id),
      JSON.stringify([], null, 2)
    );

    this.events.emit('created', metadata);
    return metadata;
  }

  /**
   * Get a chat by ID
   */
  async get(chatId: string): Promise<ChatMetadata | null> {
    await this.ensureInitialized();

    try {
      const metadataPath = join(getChatDir(chatId), 'metadata.json');
      const content = await readFile(metadataPath, 'utf-8');
      return JSON.parse(content);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw err;
    }
  }

  /**
   * List all chats
   */
  async list(): Promise<ChatMetadata[]> {
    await this.ensureInitialized();

    try {
      const entries = await readdir(CHATS_DIR, { withFileTypes: true });
      const chats: ChatMetadata[] = [];

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const metadata = await this.get(entry.name);
        if (metadata) {
          chats.push(metadata);
        }
      }

      // Sort by updatedAt (most recent first)
      chats.sort((a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );

      return chats;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw err;
    }
  }

  /**
   * Update chat metadata
   */
  async update(chatId: string, updates: Partial<ChatMetadata>): Promise<ChatMetadata> {
    await this.ensureInitialized();

    const existing = await this.get(chatId);
    if (!existing) {
      throw new Error(`Chat ${chatId} not found`);
    }

    const updated: ChatMetadata = {
      ...existing,
      ...updates,
      id: chatId, // Prevent ID change
      updatedAt: new Date().toISOString(),
    };

    await writeFile(
      join(getChatDir(chatId), 'metadata.json'),
      JSON.stringify(updated, null, 2)
    );

    this.events.emit('updated', updated);
    return updated;
  }

  /**
   * Delete a chat
   */
  async delete(chatId: string): Promise<void> {
    await this.ensureInitialized();

    const metadata = await this.get(chatId);
    if (!metadata) {
      throw new Error(`Chat ${chatId} not found`);
    }

    await rm(getChatDir(chatId), { recursive: true, force: true });
    this.events.emit('deleted', metadata);
  }

  // ---------------------------------------------------------------------------
  // MESSAGE OPERATIONS
  // ---------------------------------------------------------------------------

  /**
   * Get all messages for a chat
   */
  async getMessages(chatId: string): Promise<StoredMessage[]> {
    await this.ensureInitialized();

    try {
      const content = await readFile(getChatMessagesPath(chatId), 'utf-8');
      return JSON.parse(content);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw err;
    }
  }

  /**
   * Add a message to a chat
   */
  async addMessage(chatId: string, message: StoredMessage): Promise<void> {
    await this.ensureInitialized();

    const messages = await this.getMessages(chatId);
    messages.push(message);

    await writeFile(
      getChatMessagesPath(chatId),
      JSON.stringify(messages, null, 2)
    );

    // Update message count
    await this.update(chatId, { messageCount: messages.length });

    this.events.emit('message-added', { chatId, message });
  }

  /**
   * Update a message in a chat
   */
  async updateMessage(chatId: string, messageId: string, updates: Partial<StoredMessage>): Promise<void> {
    await this.ensureInitialized();

    const messages = await this.getMessages(chatId);
    const index = messages.findIndex(m => m.id === messageId);

    if (index === -1) {
      throw new Error(`Message ${messageId} not found in chat ${chatId}`);
    }

    messages[index] = {
      ...messages[index],
      ...updates,
      id: messageId, // Prevent ID change
      chatId, // Prevent chat ID change
    };

    await writeFile(
      getChatMessagesPath(chatId),
      JSON.stringify(messages, null, 2)
    );
  }

  /**
   * Delete a message from a chat
   */
  async deleteMessage(chatId: string, messageId: string): Promise<void> {
    await this.ensureInitialized();

    const messages = await this.getMessages(chatId);
    const filtered = messages.filter(m => m.id !== messageId);

    if (filtered.length === messages.length) {
      throw new Error(`Message ${messageId} not found in chat ${chatId}`);
    }

    await writeFile(
      getChatMessagesPath(chatId),
      JSON.stringify(filtered, null, 2)
    );

    // Update message count
    await this.update(chatId, { messageCount: filtered.length });
  }

  /**
   * Clear all messages in a chat
   */
  async clearMessages(chatId: string): Promise<void> {
    await this.ensureInitialized();

    await writeFile(
      getChatMessagesPath(chatId),
      JSON.stringify([], null, 2)
    );

    await this.update(chatId, { messageCount: 0 });
  }

  // ---------------------------------------------------------------------------
  // EVENTS
  // ---------------------------------------------------------------------------

  on(event: ChatStoreEvent, handler: (data: unknown) => void): () => void {
    this.events.on(event, handler);
    return () => this.events.off(event, handler);
  }

  // ---------------------------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------------------------

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  private generateId(): string {
    // Generate a short unique ID
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${timestamp}-${random}`;
  }
}

// -----------------------------------------------------------------------------
// SINGLETON
// -----------------------------------------------------------------------------

let chatStoreInstance: ChatStore | null = null;

export function getChatStore(): ChatStore {
  if (!chatStoreInstance) {
    chatStoreInstance = new ChatStore();
  }
  return chatStoreInstance;
}
