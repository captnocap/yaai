# Chat Store — Specification

> Version: 1.0.0
> Last Updated: 2026-01-02

Complete implementation spec for chat and message storage with SQLite, full-text search, and branching support.

---

## Table of Contents

1. [Schema](#1-schema)
2. [TypeScript Interfaces](#2-typescript-interfaces)
3. [Store Implementation](#3-store-implementation)
4. [Queries](#4-queries)
5. [Full-Text Search](#5-full-text-search)
6. [Branching](#6-branching)
7. [Migration](#7-migration)
8. [WebSocket Handlers](#8-websocket-handlers)

---

## 1. Schema

### 1.1 Complete DDL

```sql
-- migrations/chat/001_initial.sql

-- Chats table
CREATE TABLE IF NOT EXISTS chats (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  prompt_id TEXT,                           -- Reference to prompt template if used
  default_model TEXT,                       -- Default model for this chat
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_chats_updated_at ON chats(updated_at DESC);
CREATE INDEX idx_chats_created_at ON chats(created_at DESC);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,                    -- JSON array of content blocks
  model TEXT,                               -- Model used for this message
  token_count INTEGER,                      -- Tokens used
  generation_time INTEGER,                  -- Generation time in ms
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  branch_id TEXT,                           -- For conversation branching
  parent_id TEXT REFERENCES messages(id),   -- Parent message for branches
  is_liked INTEGER DEFAULT 0,               -- User liked this response
  metadata TEXT                             -- JSON for extensible metadata
);

CREATE INDEX idx_messages_chat_id ON messages(chat_id);
CREATE INDEX idx_messages_timestamp ON messages(timestamp);
CREATE INDEX idx_messages_branch_id ON messages(branch_id);
CREATE INDEX idx_messages_parent_id ON messages(parent_id);
CREATE INDEX idx_messages_chat_timestamp ON messages(chat_id, timestamp);

-- Attachments table (files attached to messages)
CREATE TABLE IF NOT EXISTS attachments (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                       -- Original filename
  mime_type TEXT NOT NULL,                  -- MIME type
  size INTEGER NOT NULL,                    -- Size in bytes
  storage_path TEXT,                        -- Path to file if stored locally
  url TEXT,                                 -- URL if external
  metadata TEXT                             -- JSON metadata (dimensions, etc.)
);

CREATE INDEX idx_attachments_message_id ON attachments(message_id);

-- Tool calls table (function calls within messages)
CREATE TABLE IF NOT EXISTS tool_calls (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                       -- Tool/function name
  input TEXT NOT NULL,                      -- JSON input
  output TEXT,                              -- JSON output
  status TEXT NOT NULL DEFAULT 'pending'    -- pending, success, error
    CHECK (status IN ('pending', 'running', 'success', 'error')),
  error TEXT,                               -- Error message if failed
  started_at TEXT,
  completed_at TEXT
);

CREATE INDEX idx_tool_calls_message_id ON tool_calls(message_id);

-- Branches table (tracks conversation branches)
CREATE TABLE IF NOT EXISTS branches (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  parent_branch_id TEXT REFERENCES branches(id),
  fork_message_id TEXT NOT NULL REFERENCES messages(id),  -- Where branch started
  name TEXT,                                -- Optional branch name
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_branches_chat_id ON branches(chat_id);
CREATE INDEX idx_branches_fork_message_id ON branches(fork_message_id);

-- Full-text search for messages
CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
  content,
  chat_id UNINDEXED,
  message_id UNINDEXED,
  content='messages',
  content_rowid='rowid',
  tokenize='porter unicode61'
);

-- FTS triggers
CREATE TRIGGER IF NOT EXISTS messages_fts_insert AFTER INSERT ON messages BEGIN
  INSERT INTO messages_fts(rowid, content, chat_id, message_id)
  VALUES (NEW.rowid, NEW.content, NEW.chat_id, NEW.id);
END;

CREATE TRIGGER IF NOT EXISTS messages_fts_delete AFTER DELETE ON messages BEGIN
  INSERT INTO messages_fts(messages_fts, rowid, content, chat_id, message_id)
  VALUES ('delete', OLD.rowid, OLD.content, OLD.chat_id, OLD.id);
END;

CREATE TRIGGER IF NOT EXISTS messages_fts_update AFTER UPDATE ON messages BEGIN
  INSERT INTO messages_fts(messages_fts, rowid, content, chat_id, message_id)
  VALUES ('delete', OLD.rowid, OLD.content, OLD.chat_id, OLD.id);
  INSERT INTO messages_fts(rowid, content, chat_id, message_id)
  VALUES (NEW.rowid, NEW.content, NEW.chat_id, NEW.id);
END;

-- Update chat.updated_at on message insert
CREATE TRIGGER IF NOT EXISTS chat_updated_on_message AFTER INSERT ON messages BEGIN
  UPDATE chats SET updated_at = datetime('now') WHERE id = NEW.chat_id;
END;
```

---

## 2. TypeScript Interfaces

### 2.1 Core Types

```typescript
// lib/stores/chat-store.types.ts

import { ChatId, MessageId, Timestamps, PaginatedResult } from '../core'

// ============ Content Blocks ============

export type ContentBlockType = 'text' | 'code' | 'image' | 'file' | 'tool_use' | 'tool_result'

export interface TextBlock {
  type: 'text'
  value: string
}

export interface CodeBlock {
  type: 'code'
  value: string
  language?: string
}

export interface ImageBlock {
  type: 'image'
  url?: string           // External URL or data URL
  attachmentId?: string  // Reference to attachments table
  alt?: string
}

export interface FileBlock {
  type: 'file'
  attachmentId: string
  name: string
  mimeType: string
}

export interface ToolUseBlock {
  type: 'tool_use'
  toolCallId: string     // Reference to tool_calls table
  name: string
  input: Record<string, unknown>
}

export interface ToolResultBlock {
  type: 'tool_result'
  toolCallId: string
  output: unknown
  isError?: boolean
}

export type ContentBlock =
  | TextBlock
  | CodeBlock
  | ImageBlock
  | FileBlock
  | ToolUseBlock
  | ToolResultBlock

// ============ Message ============

export type MessageRole = 'user' | 'assistant' | 'system'

export interface Message {
  id: MessageId
  chatId: ChatId
  role: MessageRole
  content: ContentBlock[]
  model?: string
  tokenCount?: number
  generationTime?: number
  timestamp: string
  branchId?: string
  parentId?: MessageId
  isLiked: boolean
  metadata?: Record<string, unknown>
}

export interface MessageWithAttachments extends Message {
  attachments: Attachment[]
  toolCalls: ToolCall[]
}

// ============ Chat ============

export interface Chat extends Timestamps {
  id: ChatId
  title: string
  promptId?: string
  defaultModel?: string
}

export interface ChatWithStats extends Chat {
  messageCount: number
  models: string[]           // Unique models used
  lastMessageAt?: string
}

// ============ Attachment ============

export interface Attachment {
  id: string
  messageId: MessageId
  name: string
  mimeType: string
  size: number
  storagePath?: string
  url?: string
  metadata?: Record<string, unknown>
}

// ============ Tool Call ============

export type ToolCallStatus = 'pending' | 'running' | 'success' | 'error'

export interface ToolCall {
  id: string
  messageId: MessageId
  name: string
  input: Record<string, unknown>
  output?: unknown
  status: ToolCallStatus
  error?: string
  startedAt?: string
  completedAt?: string
}

// ============ Branch ============

export interface Branch {
  id: string
  chatId: ChatId
  parentBranchId?: string
  forkMessageId: MessageId
  name?: string
  createdAt: string
}

// ============ Input Types ============

export interface CreateChatInput {
  title: string
  promptId?: string
  defaultModel?: string
}

export interface UpdateChatInput {
  title?: string
  promptId?: string
  defaultModel?: string
}

export interface CreateMessageInput {
  chatId: ChatId
  role: MessageRole
  content: ContentBlock[]
  model?: string
  tokenCount?: number
  generationTime?: number
  branchId?: string
  parentId?: MessageId
  metadata?: Record<string, unknown>
}

export interface CreateAttachmentInput {
  messageId: MessageId
  name: string
  mimeType: string
  size: number
  storagePath?: string
  url?: string
  metadata?: Record<string, unknown>
}

// ============ Query Types ============

export interface ListChatsOptions {
  limit?: number
  offset?: number
  orderBy?: 'updated_at' | 'created_at'
  order?: 'asc' | 'desc'
}

export interface ListMessagesOptions {
  limit?: number
  offset?: number
  branchId?: string
  beforeTimestamp?: string
  afterTimestamp?: string
}

export interface SearchMessagesOptions {
  query: string
  chatId?: ChatId
  limit?: number
}

export interface SearchResult {
  messageId: MessageId
  chatId: ChatId
  chatTitle: string
  snippet: string
  timestamp: string
}
```

---

## 3. Store Implementation

### 3.1 ChatStore Class

```typescript
// lib/stores/chat-store.ts

import { Database } from 'bun:sqlite'
import { db } from '../db/connection'
import {
  Result, AppError, Errors,
  ChatId, MessageId, newChatId, newMessageId,
  PaginatedResult, logger
} from '../core'
import {
  Chat, ChatWithStats, Message, MessageWithAttachments,
  Attachment, ToolCall, Branch,
  CreateChatInput, UpdateChatInput, CreateMessageInput,
  ListChatsOptions, ListMessagesOptions, SearchMessagesOptions, SearchResult
} from './chat-store.types'

export class ChatStore {
  private database: Database

  constructor() {
    this.database = db.chat
  }

  // ============ Chats ============

  /**
   * Create a new chat
   */
  createChat(input: CreateChatInput): Result<Chat> {
    const id = newChatId()
    const now = new Date().toISOString()

    try {
      this.database
        .prepare(`
          INSERT INTO chats (id, title, prompt_id, default_model, created_at, updated_at)
          VALUES ($id, $title, $promptId, $defaultModel, $now, $now)
        `)
        .run({
          $id: id,
          $title: input.title,
          $promptId: input.promptId ?? null,
          $defaultModel: input.defaultModel ?? null,
          $now: now
        })

      const chat: Chat = {
        id,
        title: input.title,
        promptId: input.promptId,
        defaultModel: input.defaultModel,
        createdAt: now,
        updatedAt: now
      }

      logger.info('Chat created', { chatId: id })
      return Result.ok(chat)
    } catch (error) {
      return Result.err(Errors.db.queryFailed('INSERT INTO chats', error as Error))
    }
  }

  /**
   * Get chat by ID
   */
  getChatById(id: ChatId): Result<Chat | null> {
    try {
      const row = this.database
        .prepare('SELECT * FROM chats WHERE id = ?')
        .get(id) as ChatRow | null

      if (!row) {
        return Result.ok(null)
      }

      return Result.ok(this.rowToChat(row))
    } catch (error) {
      return Result.err(Errors.db.queryFailed('SELECT FROM chats', error as Error))
    }
  }

  /**
   * Get chat with stats
   */
  getChatWithStats(id: ChatId): Result<ChatWithStats | null> {
    try {
      const row = this.database
        .prepare(`
          SELECT
            c.*,
            COUNT(m.id) as message_count,
            GROUP_CONCAT(DISTINCT m.model) as models,
            MAX(m.timestamp) as last_message_at
          FROM chats c
          LEFT JOIN messages m ON m.chat_id = c.id
          WHERE c.id = ?
          GROUP BY c.id
        `)
        .get(id) as ChatWithStatsRow | null

      if (!row) {
        return Result.ok(null)
      }

      return Result.ok(this.rowToChatWithStats(row))
    } catch (error) {
      return Result.err(Errors.db.queryFailed('SELECT FROM chats with stats', error as Error))
    }
  }

  /**
   * List chats with pagination
   */
  listChats(options: ListChatsOptions = {}): Result<PaginatedResult<ChatWithStats>> {
    const {
      limit = 50,
      offset = 0,
      orderBy = 'updated_at',
      order = 'desc'
    } = options

    try {
      const rows = this.database
        .prepare(`
          SELECT
            c.*,
            COUNT(m.id) as message_count,
            GROUP_CONCAT(DISTINCT m.model) as models,
            MAX(m.timestamp) as last_message_at
          FROM chats c
          LEFT JOIN messages m ON m.chat_id = c.id
          GROUP BY c.id
          ORDER BY c.${orderBy} ${order.toUpperCase()}
          LIMIT ? OFFSET ?
        `)
        .all(limit, offset) as ChatWithStatsRow[]

      const countResult = this.database
        .prepare('SELECT COUNT(*) as count FROM chats')
        .get() as { count: number }

      const items = rows.map(row => this.rowToChatWithStats(row))

      return Result.ok({
        items,
        total: countResult.count,
        limit,
        offset,
        hasMore: offset + items.length < countResult.count
      })
    } catch (error) {
      return Result.err(Errors.db.queryFailed('SELECT FROM chats list', error as Error))
    }
  }

  /**
   * Update chat
   */
  updateChat(id: ChatId, input: UpdateChatInput): Result<Chat | null> {
    const updates: string[] = []
    const params: Record<string, unknown> = { $id: id }

    if (input.title !== undefined) {
      updates.push('title = $title')
      params.$title = input.title
    }
    if (input.promptId !== undefined) {
      updates.push('prompt_id = $promptId')
      params.$promptId = input.promptId
    }
    if (input.defaultModel !== undefined) {
      updates.push('default_model = $defaultModel')
      params.$defaultModel = input.defaultModel
    }

    if (updates.length === 0) {
      return this.getChatById(id)
    }

    updates.push("updated_at = datetime('now')")

    try {
      const result = this.database
        .prepare(`UPDATE chats SET ${updates.join(', ')} WHERE id = $id`)
        .run(params)

      if (result.changes === 0) {
        return Result.ok(null)
      }

      return this.getChatById(id)
    } catch (error) {
      return Result.err(Errors.db.queryFailed('UPDATE chats', error as Error))
    }
  }

  /**
   * Delete chat (cascades to messages, attachments, tool_calls)
   */
  deleteChat(id: ChatId): Result<boolean> {
    try {
      const result = this.database
        .prepare('DELETE FROM chats WHERE id = ?')
        .run(id)

      logger.info('Chat deleted', { chatId: id, deleted: result.changes > 0 })
      return Result.ok(result.changes > 0)
    } catch (error) {
      return Result.err(Errors.db.queryFailed('DELETE FROM chats', error as Error))
    }
  }

  // ============ Messages ============

  /**
   * Add message to chat
   */
  addMessage(input: CreateMessageInput): Result<Message> {
    const id = newMessageId()
    const now = new Date().toISOString()

    try {
      this.database
        .prepare(`
          INSERT INTO messages (
            id, chat_id, role, content, model, token_count, generation_time,
            timestamp, branch_id, parent_id, metadata
          )
          VALUES (
            $id, $chatId, $role, $content, $model, $tokenCount, $generationTime,
            $timestamp, $branchId, $parentId, $metadata
          )
        `)
        .run({
          $id: id,
          $chatId: input.chatId,
          $role: input.role,
          $content: JSON.stringify(input.content),
          $model: input.model ?? null,
          $tokenCount: input.tokenCount ?? null,
          $generationTime: input.generationTime ?? null,
          $timestamp: now,
          $branchId: input.branchId ?? null,
          $parentId: input.parentId ?? null,
          $metadata: input.metadata ? JSON.stringify(input.metadata) : null
        })

      const message: Message = {
        id,
        chatId: input.chatId,
        role: input.role,
        content: input.content,
        model: input.model,
        tokenCount: input.tokenCount,
        generationTime: input.generationTime,
        timestamp: now,
        branchId: input.branchId,
        parentId: input.parentId,
        isLiked: false,
        metadata: input.metadata
      }

      logger.debug('Message added', { messageId: id, chatId: input.chatId })
      return Result.ok(message)
    } catch (error) {
      return Result.err(Errors.db.queryFailed('INSERT INTO messages', error as Error))
    }
  }

  /**
   * Get messages for a chat with pagination
   */
  getMessages(chatId: ChatId, options: ListMessagesOptions = {}): Result<PaginatedResult<Message>> {
    const {
      limit = 100,
      offset = 0,
      branchId,
      beforeTimestamp,
      afterTimestamp
    } = options

    const conditions: string[] = ['chat_id = $chatId']
    const params: Record<string, unknown> = { $chatId: chatId }

    if (branchId !== undefined) {
      conditions.push('(branch_id = $branchId OR branch_id IS NULL)')
      params.$branchId = branchId
    }
    if (beforeTimestamp) {
      conditions.push('timestamp < $before')
      params.$before = beforeTimestamp
    }
    if (afterTimestamp) {
      conditions.push('timestamp > $after')
      params.$after = afterTimestamp
    }

    const where = conditions.join(' AND ')

    try {
      const rows = this.database
        .prepare(`
          SELECT * FROM messages
          WHERE ${where}
          ORDER BY timestamp ASC
          LIMIT $limit OFFSET $offset
        `)
        .all({ ...params, $limit: limit, $offset: offset }) as MessageRow[]

      const countResult = this.database
        .prepare(`SELECT COUNT(*) as count FROM messages WHERE ${where}`)
        .get(params) as { count: number }

      const items = rows.map(row => this.rowToMessage(row))

      return Result.ok({
        items,
        total: countResult.count,
        limit,
        offset,
        hasMore: offset + items.length < countResult.count
      })
    } catch (error) {
      return Result.err(Errors.db.queryFailed('SELECT FROM messages', error as Error))
    }
  }

  /**
   * Get message with attachments and tool calls
   */
  getMessageWithDetails(id: MessageId): Result<MessageWithAttachments | null> {
    try {
      const messageRow = this.database
        .prepare('SELECT * FROM messages WHERE id = ?')
        .get(id) as MessageRow | null

      if (!messageRow) {
        return Result.ok(null)
      }

      const attachmentRows = this.database
        .prepare('SELECT * FROM attachments WHERE message_id = ?')
        .all(id) as AttachmentRow[]

      const toolCallRows = this.database
        .prepare('SELECT * FROM tool_calls WHERE message_id = ?')
        .all(id) as ToolCallRow[]

      const message = this.rowToMessage(messageRow)
      const attachments = attachmentRows.map(row => this.rowToAttachment(row))
      const toolCalls = toolCallRows.map(row => this.rowToToolCall(row))

      return Result.ok({
        ...message,
        attachments,
        toolCalls
      })
    } catch (error) {
      return Result.err(Errors.db.queryFailed('SELECT message with details', error as Error))
    }
  }

  /**
   * Toggle message liked status
   */
  toggleMessageLike(id: MessageId): Result<boolean> {
    try {
      this.database
        .prepare('UPDATE messages SET is_liked = NOT is_liked WHERE id = ?')
        .run(id)

      const row = this.database
        .prepare('SELECT is_liked FROM messages WHERE id = ?')
        .get(id) as { is_liked: number } | null

      return Result.ok(row?.is_liked === 1)
    } catch (error) {
      return Result.err(Errors.db.queryFailed('UPDATE message like', error as Error))
    }
  }

  /**
   * Delete message
   */
  deleteMessage(id: MessageId): Result<boolean> {
    try {
      const result = this.database
        .prepare('DELETE FROM messages WHERE id = ?')
        .run(id)

      return Result.ok(result.changes > 0)
    } catch (error) {
      return Result.err(Errors.db.queryFailed('DELETE FROM messages', error as Error))
    }
  }

  // ============ Attachments ============

  /**
   * Add attachment to message
   */
  addAttachment(input: CreateAttachmentInput): Result<Attachment> {
    const id = crypto.randomUUID()

    try {
      this.database
        .prepare(`
          INSERT INTO attachments (id, message_id, name, mime_type, size, storage_path, url, metadata)
          VALUES ($id, $messageId, $name, $mimeType, $size, $storagePath, $url, $metadata)
        `)
        .run({
          $id: id,
          $messageId: input.messageId,
          $name: input.name,
          $mimeType: input.mimeType,
          $size: input.size,
          $storagePath: input.storagePath ?? null,
          $url: input.url ?? null,
          $metadata: input.metadata ? JSON.stringify(input.metadata) : null
        })

      return Result.ok({
        id,
        messageId: input.messageId,
        name: input.name,
        mimeType: input.mimeType,
        size: input.size,
        storagePath: input.storagePath,
        url: input.url,
        metadata: input.metadata
      })
    } catch (error) {
      return Result.err(Errors.db.queryFailed('INSERT INTO attachments', error as Error))
    }
  }

  // ============ Tool Calls ============

  /**
   * Create tool call
   */
  createToolCall(messageId: MessageId, name: string, input: Record<string, unknown>): Result<ToolCall> {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()

    try {
      this.database
        .prepare(`
          INSERT INTO tool_calls (id, message_id, name, input, status, started_at)
          VALUES (?, ?, ?, ?, 'running', ?)
        `)
        .run(id, messageId, name, JSON.stringify(input), now)

      return Result.ok({
        id,
        messageId,
        name,
        input,
        status: 'running' as const,
        startedAt: now
      })
    } catch (error) {
      return Result.err(Errors.db.queryFailed('INSERT INTO tool_calls', error as Error))
    }
  }

  /**
   * Complete tool call
   */
  completeToolCall(id: string, output: unknown, error?: string): Result<ToolCall | null> {
    const now = new Date().toISOString()
    const status = error ? 'error' : 'success'

    try {
      this.database
        .prepare(`
          UPDATE tool_calls
          SET output = ?, status = ?, error = ?, completed_at = ?
          WHERE id = ?
        `)
        .run(
          JSON.stringify(output),
          status,
          error ?? null,
          now,
          id
        )

      const row = this.database
        .prepare('SELECT * FROM tool_calls WHERE id = ?')
        .get(id) as ToolCallRow | null

      if (!row) {
        return Result.ok(null)
      }

      return Result.ok(this.rowToToolCall(row))
    } catch (err) {
      return Result.err(Errors.db.queryFailed('UPDATE tool_calls', err as Error))
    }
  }

  // ============ Search ============

  /**
   * Search messages using FTS
   */
  searchMessages(options: SearchMessagesOptions): Result<SearchResult[]> {
    const { query, chatId, limit = 50 } = options

    try {
      let sql = `
        SELECT
          messages_fts.message_id,
          messages_fts.chat_id,
          c.title as chat_title,
          highlight(messages_fts, 0, '<mark>', '</mark>') as snippet,
          m.timestamp
        FROM messages_fts
        JOIN messages m ON messages_fts.message_id = m.id
        JOIN chats c ON messages_fts.chat_id = c.id
        WHERE messages_fts MATCH ?
      `

      const params: unknown[] = [query]

      if (chatId) {
        sql += ' AND messages_fts.chat_id = ?'
        params.push(chatId)
      }

      sql += ' ORDER BY rank LIMIT ?'
      params.push(limit)

      const rows = this.database.prepare(sql).all(...params) as SearchResultRow[]

      return Result.ok(rows.map(row => ({
        messageId: MessageId(row.message_id),
        chatId: ChatId(row.chat_id),
        chatTitle: row.chat_title,
        snippet: row.snippet,
        timestamp: row.timestamp
      })))
    } catch (error) {
      return Result.err(Errors.db.queryFailed('FTS search', error as Error))
    }
  }

  // ============ Row Mappers ============

  private rowToChat(row: ChatRow): Chat {
    return {
      id: ChatId(row.id),
      title: row.title,
      promptId: row.prompt_id ?? undefined,
      defaultModel: row.default_model ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }

  private rowToChatWithStats(row: ChatWithStatsRow): ChatWithStats {
    return {
      ...this.rowToChat(row),
      messageCount: row.message_count,
      models: row.models ? row.models.split(',').filter(Boolean) : [],
      lastMessageAt: row.last_message_at ?? undefined
    }
  }

  private rowToMessage(row: MessageRow): Message {
    return {
      id: MessageId(row.id),
      chatId: ChatId(row.chat_id),
      role: row.role as Message['role'],
      content: JSON.parse(row.content),
      model: row.model ?? undefined,
      tokenCount: row.token_count ?? undefined,
      generationTime: row.generation_time ?? undefined,
      timestamp: row.timestamp,
      branchId: row.branch_id ?? undefined,
      parentId: row.parent_id ? MessageId(row.parent_id) : undefined,
      isLiked: row.is_liked === 1,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined
    }
  }

  private rowToAttachment(row: AttachmentRow): Attachment {
    return {
      id: row.id,
      messageId: MessageId(row.message_id),
      name: row.name,
      mimeType: row.mime_type,
      size: row.size,
      storagePath: row.storage_path ?? undefined,
      url: row.url ?? undefined,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined
    }
  }

  private rowToToolCall(row: ToolCallRow): ToolCall {
    return {
      id: row.id,
      messageId: MessageId(row.message_id),
      name: row.name,
      input: JSON.parse(row.input),
      output: row.output ? JSON.parse(row.output) : undefined,
      status: row.status as ToolCall['status'],
      error: row.error ?? undefined,
      startedAt: row.started_at ?? undefined,
      completedAt: row.completed_at ?? undefined
    }
  }
}

// ============ Row Types ============

interface ChatRow {
  id: string
  title: string
  prompt_id: string | null
  default_model: string | null
  created_at: string
  updated_at: string
}

interface ChatWithStatsRow extends ChatRow {
  message_count: number
  models: string | null
  last_message_at: string | null
}

interface MessageRow {
  id: string
  chat_id: string
  role: string
  content: string
  model: string | null
  token_count: number | null
  generation_time: number | null
  timestamp: string
  branch_id: string | null
  parent_id: string | null
  is_liked: number
  metadata: string | null
}

interface AttachmentRow {
  id: string
  message_id: string
  name: string
  mime_type: string
  size: number
  storage_path: string | null
  url: string | null
  metadata: string | null
}

interface ToolCallRow {
  id: string
  message_id: string
  name: string
  input: string
  output: string | null
  status: string
  error: string | null
  started_at: string | null
  completed_at: string | null
}

interface SearchResultRow {
  message_id: string
  chat_id: string
  chat_title: string
  snippet: string
  timestamp: string
}

// Singleton export
export const chatStore = new ChatStore()
```

---

## 4. Queries

### 4.1 Common Query Examples

```typescript
// Get recent chats
const result = chatStore.listChats({
  limit: 20,
  orderBy: 'updated_at',
  order: 'desc'
})

// Get messages with pagination
const messages = chatStore.getMessages(chatId, {
  limit: 50,
  offset: 0
})

// Get messages before a timestamp (for infinite scroll)
const olderMessages = chatStore.getMessages(chatId, {
  limit: 50,
  beforeTimestamp: '2026-01-01T00:00:00Z'
})

// Search across all chats
const searchResults = chatStore.searchMessages({
  query: 'typescript async',
  limit: 20
})

// Search within a specific chat
const chatSearchResults = chatStore.searchMessages({
  query: 'typescript',
  chatId: ChatId('abc-123'),
  limit: 20
})
```

---

## 5. Full-Text Search

### 5.1 FTS5 Configuration

The schema uses FTS5 with:
- **porter** stemmer: Matches word variations (running → run)
- **unicode61** tokenizer: Proper Unicode handling

### 5.2 Search Query Syntax

```typescript
// Basic search
searchMessages({ query: 'typescript' })

// Phrase search
searchMessages({ query: '"async function"' })

// AND (implicit)
searchMessages({ query: 'typescript async' })

// OR
searchMessages({ query: 'typescript OR javascript' })

// NOT
searchMessages({ query: 'typescript NOT node' })

// Prefix
searchMessages({ query: 'type*' })

// Column filter (if we had multiple indexed columns)
// searchMessages({ query: 'content:typescript' })
```

---

## 6. Branching

### 6.1 Branch Creation

```typescript
/**
 * Create a branch from a message
 */
createBranch(chatId: ChatId, forkMessageId: MessageId, name?: string): Result<Branch> {
  const id = crypto.randomUUID()

  try {
    this.database
      .prepare(`
        INSERT INTO branches (id, chat_id, fork_message_id, name)
        VALUES (?, ?, ?, ?)
      `)
      .run(id, chatId, forkMessageId, name ?? null)

    return Result.ok({
      id,
      chatId,
      forkMessageId,
      name,
      createdAt: new Date().toISOString()
    })
  } catch (error) {
    return Result.err(Errors.db.queryFailed('INSERT INTO branches', error as Error))
  }
}
```

### 6.2 Getting Branch Messages

```typescript
/**
 * Get messages for a specific branch
 * Returns messages from root to fork point, then branch-specific messages
 */
getBranchMessages(chatId: ChatId, branchId: string): Result<Message[]> {
  try {
    // Get the fork point
    const branch = this.database
      .prepare('SELECT fork_message_id FROM branches WHERE id = ?')
      .get(branchId) as { fork_message_id: string } | null

    if (!branch) {
      return Result.err(Errors.db.notFound('branches', branchId))
    }

    // Get messages up to fork point (main branch) + branch messages
    const rows = this.database
      .prepare(`
        SELECT * FROM messages
        WHERE chat_id = ?
        AND (
          (branch_id IS NULL AND timestamp <= (SELECT timestamp FROM messages WHERE id = ?))
          OR branch_id = ?
        )
        ORDER BY timestamp ASC
      `)
      .all(chatId, branch.fork_message_id, branchId) as MessageRow[]

    return Result.ok(rows.map(row => this.rowToMessage(row)))
  } catch (error) {
    return Result.err(Errors.db.queryFailed('SELECT branch messages', error as Error))
  }
}
```

---

## 7. Migration

### 7.1 Migrating from JSON Files

```typescript
// lib/stores/migrations/migrate-chats-from-json.ts

import { readdir } from 'fs/promises'
import { join } from 'path'
import { chatStore } from '../chat-store'
import { paths, logger } from '../../core'

interface LegacyChat {
  id: string
  title: string
  promptId?: string
  models: string[]
  createdAt: string
  updatedAt: string
  messageCount: number
}

interface LegacyMessage {
  id: string
  chatId: string
  role: 'user' | 'assistant' | 'system'
  content: Array<{ type: string; value: string }>
  model?: string
  tokenCount?: number
  timestamp: string
}

export async function migrateChatsFromJson(): Promise<{ chats: number; messages: number }> {
  const legacyChatsDir = join(paths.root, 'chats')
  let chatCount = 0
  let messageCount = 0

  try {
    const chatDirs = await readdir(legacyChatsDir)

    for (const chatId of chatDirs) {
      const chatDir = join(legacyChatsDir, chatId)

      // Read metadata
      const metadataPath = join(chatDir, 'metadata.json')
      const metadataFile = Bun.file(metadataPath)
      if (!await metadataFile.exists()) continue

      const metadata = await metadataFile.json() as LegacyChat

      // Create chat
      const chatResult = chatStore.createChat({
        title: metadata.title,
        promptId: metadata.promptId
      })

      if (!chatResult.ok) {
        logger.warn('Failed to migrate chat', { chatId, error: chatResult.error.message })
        continue
      }

      chatCount++

      // Read messages
      const messagesPath = join(chatDir, 'messages.json')
      const messagesFile = Bun.file(messagesPath)
      if (!await messagesFile.exists()) continue

      const messages = await messagesFile.json() as LegacyMessage[]

      for (const msg of messages) {
        const msgResult = chatStore.addMessage({
          chatId: chatResult.value.id,
          role: msg.role,
          content: msg.content.map(c => ({
            type: c.type as 'text',
            value: c.value
          })),
          model: msg.model,
          tokenCount: msg.tokenCount
        })

        if (msgResult.ok) {
          messageCount++
        }
      }

      logger.info('Migrated chat', { chatId, messages: messages.length })
    }

    logger.info('Chat migration complete', { chats: chatCount, messages: messageCount })
    return { chats: chatCount, messages: messageCount }
  } catch (error) {
    logger.error('Chat migration failed', error as Error)
    throw error
  }
}
```

---

## 8. WebSocket Handlers

### 8.1 Chat Channel Handlers

```typescript
// lib/ws/handlers/chat-handlers.ts

import { WSServer } from '../server'
import { chatStore } from '../../stores/chat-store'
import { ChatId, MessageId, Result } from '../../core'

export function registerChatHandlers(ws: WSServer): void {
  // List chats
  ws.onRequest('chat:list', async (params) => {
    const result = chatStore.listChats(params)
    if (!result.ok) throw result.error
    return result.value
  })

  // Get chat
  ws.onRequest('chat:get', async ({ id }) => {
    const result = chatStore.getChatWithStats(ChatId(id))
    if (!result.ok) throw result.error
    if (!result.value) throw new Error('Chat not found')
    return result.value
  })

  // Create chat
  ws.onRequest('chat:create', async (input) => {
    const result = chatStore.createChat(input)
    if (!result.ok) throw result.error
    ws.emit('chat:created', result.value)
    return result.value
  })

  // Update chat
  ws.onRequest('chat:update', async ({ id, ...input }) => {
    const result = chatStore.updateChat(ChatId(id), input)
    if (!result.ok) throw result.error
    if (result.value) {
      ws.emit('chat:updated', result.value)
    }
    return result.value
  })

  // Delete chat
  ws.onRequest('chat:delete', async ({ id }) => {
    const result = chatStore.deleteChat(ChatId(id))
    if (!result.ok) throw result.error
    if (result.value) {
      ws.emit('chat:deleted', { id })
    }
    return { deleted: result.value }
  })

  // Get messages
  ws.onRequest('chat:messages', async ({ chatId, ...options }) => {
    const result = chatStore.getMessages(ChatId(chatId), options)
    if (!result.ok) throw result.error
    return result.value
  })

  // Add message
  ws.onRequest('chat:add-message', async (input) => {
    const result = chatStore.addMessage({
      ...input,
      chatId: ChatId(input.chatId)
    })
    if (!result.ok) throw result.error
    ws.emit('chat:message-added', result.value)
    return result.value
  })

  // Search messages
  ws.onRequest('chat:search', async (options) => {
    const result = chatStore.searchMessages({
      ...options,
      chatId: options.chatId ? ChatId(options.chatId) : undefined
    })
    if (!result.ok) throw result.error
    return result.value
  })

  // Toggle like
  ws.onRequest('chat:toggle-like', async ({ messageId }) => {
    const result = chatStore.toggleMessageLike(MessageId(messageId))
    if (!result.ok) throw result.error
    return { isLiked: result.value }
  })
}
```

---

## 9. Analytics Integration

The Chat Store integrates with the Analytics system to track user engagement metrics. See `SPEC_ANALYTICS.md` for full analytics specification.

### 9.1 Engagement Events

The following operations emit analytics events:

| Operation | Event Type | Data Captured |
|-----------|------------|---------------|
| `addMessage()` | `message_sent` | chatId, role, contentLength, model |
| `createChat()` | `chat_created` | chatId, hasPromptId |
| `toggleMessageLike()` | `message_liked` | messageId, chatId, isLiked |
| `searchMessages()` | `search_performed` | queryLength, resultCount, chatId? |

### 9.2 Hook Implementation

```typescript
// lib/stores/chat-store-analytics.ts

import { analyticsStore } from './analytics-store'
import type { ChatStore } from './chat-store'
import type { CreateMessageInput, SearchMessagesOptions } from './chat-store.types'

/**
 * Wrap ChatStore methods to emit analytics events
 */
export function hookChatStore(store: ChatStore): void {
  const originalAddMessage = store.addMessage.bind(store)
  const originalCreateChat = store.createChat.bind(store)
  const originalToggleLike = store.toggleMessageLike.bind(store)
  const originalSearch = store.searchMessages.bind(store)

  // Wrap addMessage
  store.addMessage = function(input: CreateMessageInput) {
    const result = originalAddMessage(input)

    if (result.ok) {
      analyticsStore.recordEngagementEvent({
        eventType: 'message_sent',
        chatId: input.chatId,
        metadata: {
          role: input.role,
          contentLength: JSON.stringify(input.content).length,
          model: input.model,
          hasAttachments: (input.content.some(b => b.type === 'file' || b.type === 'image'))
        }
      })
    }

    return result
  }

  // Wrap createChat
  store.createChat = function(input) {
    const result = originalCreateChat(input)

    if (result.ok) {
      analyticsStore.recordEngagementEvent({
        eventType: 'chat_created',
        chatId: result.value.id,
        metadata: {
          hasPromptId: !!input.promptId,
          hasDefaultModel: !!input.defaultModel
        }
      })
    }

    return result
  }

  // Wrap toggleMessageLike
  store.toggleMessageLike = function(id) {
    const result = originalToggleLike(id)

    if (result.ok) {
      analyticsStore.recordEngagementEvent({
        eventType: 'message_liked',
        metadata: {
          messageId: id,
          isLiked: result.value
        }
      })
    }

    return result
  }

  // Wrap searchMessages
  store.searchMessages = function(options: SearchMessagesOptions) {
    const result = originalSearch(options)

    if (result.ok) {
      analyticsStore.recordEngagementEvent({
        eventType: 'search_performed',
        chatId: options.chatId,
        metadata: {
          queryLength: options.query.length,
          resultCount: result.value.length,
          limit: options.limit
        }
      })
    }

    return result
  }
}
```

### 9.3 Metrics Available

After integration, the following metrics become available in the analytics dashboard:

- **Messages per day/chat**: Track messaging frequency
- **Chat creation rate**: New conversations over time
- **Like ratio**: Percentage of liked messages (quality signal)
- **Search usage**: How often users search, average result counts
- **Content size trends**: Message length patterns

---

*End of Chat Store specification.*
