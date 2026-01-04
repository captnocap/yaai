// =============================================================================
// CHAT STORE
// =============================================================================
// SQLite-backed chat and message storage with FTS search.

import { db } from '../db'
import {
  Result,
  Errors,
  logger,
  newChatId,
  newMessageId,
  generateId,
  type ChatId,
  type MessageId,
  type PaginatedResult,
} from '../core'
import type {
  Chat,
  ChatWithStats,
  Message,
  Attachment,
  ToolCall,
  Branch,
  ContentBlock,
  CreateChatInput,
  UpdateChatInput,
  CreateMessageInput,
  UpdateMessageInput,
  CreateAttachmentInput,
  CreateToolCallInput,
  UpdateToolCallInput,
  CreateBranchInput,
  ListChatsOptions,
  ListMessagesOptions,
  SearchMessagesOptions,
  SearchResult,
} from './chat-store.types'

const log = logger.child({ module: 'chat-store' })

// -----------------------------------------------------------------------------
// Row Types (DB schema)
// -----------------------------------------------------------------------------

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
  last_message_at: string | null
  last_message_preview: string | null
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

interface BranchRow {
  id: string
  chat_id: string
  parent_branch_id: string | null
  fork_message_id: string
  name: string | null
  created_at: string
}

// -----------------------------------------------------------------------------
// Row Converters
// -----------------------------------------------------------------------------

function rowToChat(row: ChatRow): Chat {
  return {
    id: row.id as ChatId,
    title: row.title,
    promptId: row.prompt_id ?? undefined,
    defaultModel: row.default_model ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function rowToChatWithStats(row: ChatWithStatsRow): ChatWithStats {
  return {
    ...rowToChat(row),
    messageCount: row.message_count ?? 0,
    lastMessageAt: row.last_message_at ?? undefined,
    lastMessagePreview: row.last_message_preview ?? undefined,
  }
}

function rowToMessage(row: MessageRow): Message {
  let content: ContentBlock[]
  try {
    content = JSON.parse(row.content)
  } catch {
    // Fallback for plain text content
    content = [{ type: 'text', text: row.content }]
  }

  return {
    id: row.id as MessageId,
    chatId: row.chat_id as ChatId,
    role: row.role as Message['role'],
    content,
    model: row.model ?? undefined,
    tokenCount: row.token_count ?? undefined,
    generationTime: row.generation_time ?? undefined,
    timestamp: row.timestamp,
    branchId: row.branch_id ?? undefined,
    parentId: row.parent_id ? (row.parent_id as MessageId) : undefined,
    isLiked: Boolean(row.is_liked),
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
  }
}

function rowToAttachment(row: AttachmentRow): Attachment {
  return {
    id: row.id,
    messageId: row.message_id as MessageId,
    name: row.name,
    mimeType: row.mime_type,
    size: row.size,
    storagePath: row.storage_path ?? undefined,
    url: row.url ?? undefined,
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
  }
}

function rowToToolCall(row: ToolCallRow): ToolCall {
  return {
    id: row.id,
    messageId: row.message_id as MessageId,
    name: row.name,
    input: JSON.parse(row.input),
    output: row.output ?? undefined,
    status: row.status as ToolCall['status'],
    error: row.error ?? undefined,
    startedAt: row.started_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
  }
}

function rowToBranch(row: BranchRow): Branch {
  return {
    id: row.id,
    chatId: row.chat_id as ChatId,
    parentBranchId: row.parent_branch_id ?? undefined,
    forkMessageId: row.fork_message_id as MessageId,
    name: row.name ?? undefined,
    createdAt: row.created_at,
  }
}

// -----------------------------------------------------------------------------
// Content Helpers
// -----------------------------------------------------------------------------

/** Extract plain text from content blocks for FTS indexing */
function extractTextFromContent(blocks: ContentBlock[]): string {
  return blocks
    .map((block) => {
      switch (block.type) {
        case 'text':
          return block.text
        case 'code':
          return block.code
        case 'tool_result':
          if (typeof block.content === 'string') return block.content
          if (Array.isArray(block.content)) return extractTextFromContent(block.content)
          return ''
        default:
          return ''
      }
    })
    .filter(Boolean)
    .join(' ')
}

// -----------------------------------------------------------------------------
// Chat Store
// -----------------------------------------------------------------------------

export const ChatStore = {
  // ---------------------------------------------------------------------------
  // Chat CRUD
  // ---------------------------------------------------------------------------

  createChat(input: CreateChatInput): Result<Chat> {
    try {
      const id = newChatId()
      const now = new Date().toISOString()

      db.chat.prepare(`
        INSERT INTO chats (id, title, prompt_id, default_model, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, input.title, input.promptId ?? null, input.defaultModel ?? null, now, now)

      log.info('Chat created', { chatId: id, title: input.title })

      return Result.ok({
        id,
        title: input.title,
        promptId: input.promptId,
        defaultModel: input.defaultModel,
        createdAt: now,
        updatedAt: now,
      })
    } catch (error) {
      log.error('Failed to create chat', error instanceof Error ? error : undefined)
      return Result.err(Errors.db.queryFailed('INSERT chat', error instanceof Error ? error : undefined))
    }
  },

  getChatById(chatId: ChatId): Result<Chat | null> {
    try {
      const row = db.chat
        .prepare('SELECT * FROM chats WHERE id = ?')
        .get(chatId) as ChatRow | null

      return Result.ok(row ? rowToChat(row) : null)
    } catch (error) {
      log.error('Failed to get chat', error instanceof Error ? error : undefined, { chatId })
      return Result.err(Errors.db.queryFailed('SELECT chat', error instanceof Error ? error : undefined))
    }
  },

  getChatWithStats(chatId: ChatId): Result<ChatWithStats | null> {
    try {
      const row = db.chat.prepare(`
        SELECT
          c.*,
          COUNT(m.id) as message_count,
          MAX(m.timestamp) as last_message_at,
          (SELECT content FROM messages WHERE chat_id = c.id ORDER BY timestamp DESC LIMIT 1) as last_message_preview
        FROM chats c
        LEFT JOIN messages m ON m.chat_id = c.id
        WHERE c.id = ?
        GROUP BY c.id
      `).get(chatId) as ChatWithStatsRow | null

      if (!row) return Result.ok(null)

      const chat = rowToChatWithStats(row)

      // Parse the last message preview to extract text
      if (chat.lastMessagePreview) {
        try {
          const blocks = JSON.parse(chat.lastMessagePreview) as ContentBlock[]
          chat.lastMessagePreview = extractTextFromContent(blocks).slice(0, 100)
        } catch {
          // Keep as-is if not JSON
          chat.lastMessagePreview = chat.lastMessagePreview.slice(0, 100)
        }
      }

      return Result.ok(chat)
    } catch (error) {
      log.error('Failed to get chat with stats', error instanceof Error ? error : undefined, { chatId })
      return Result.err(Errors.db.queryFailed('SELECT chat with stats', error instanceof Error ? error : undefined))
    }
  },

  listChats(options?: ListChatsOptions): Result<PaginatedResult<ChatWithStats>> {
    try {
      const limit = options?.limit ?? 50
      const offset = options?.offset ?? 0
      const orderBy = options?.orderBy ?? 'updatedAt'
      const order = options?.order ?? 'desc'
      const orderColumn = orderBy === 'createdAt' ? 'c.created_at' : 'c.updated_at'

      let whereClause = ''
      const params: unknown[] = []

      if (options?.search) {
        whereClause = 'WHERE c.title LIKE ?'
        params.push(`%${options.search}%`)
      }

      // Get total count
      const countRow = db.chat.prepare(`
        SELECT COUNT(*) as count FROM chats c ${whereClause}
      `).get(...params) as { count: number }

      // Get items
      const rows = db.chat.prepare(`
        SELECT
          c.*,
          COUNT(m.id) as message_count,
          MAX(m.timestamp) as last_message_at,
          (SELECT content FROM messages WHERE chat_id = c.id ORDER BY timestamp DESC LIMIT 1) as last_message_preview
        FROM chats c
        LEFT JOIN messages m ON m.chat_id = c.id
        ${whereClause}
        GROUP BY c.id
        ORDER BY ${orderColumn} ${order.toUpperCase()}
        LIMIT ? OFFSET ?
      `).all(...params, limit, offset) as ChatWithStatsRow[]

      const items = rows.map((row) => {
        const chat = rowToChatWithStats(row)
        if (chat.lastMessagePreview) {
          try {
            const blocks = JSON.parse(chat.lastMessagePreview) as ContentBlock[]
            chat.lastMessagePreview = extractTextFromContent(blocks).slice(0, 100)
          } catch {
            chat.lastMessagePreview = chat.lastMessagePreview.slice(0, 100)
          }
        }
        return chat
      })

      return Result.ok({
        items,
        total: countRow.count,
        limit,
        offset,
        hasMore: offset + items.length < countRow.count,
      })
    } catch (error) {
      log.error('Failed to list chats', error instanceof Error ? error : undefined)
      return Result.err(Errors.db.queryFailed('SELECT chats', error instanceof Error ? error : undefined))
    }
  },

  updateChat(chatId: ChatId, input: UpdateChatInput): Result<Chat | null> {
    try {
      const now = new Date().toISOString()
      const sets: string[] = ['updated_at = ?']
      const params: unknown[] = [now]

      if (input.title !== undefined) {
        sets.push('title = ?')
        params.push(input.title)
      }
      if (input.promptId !== undefined) {
        sets.push('prompt_id = ?')
        params.push(input.promptId)
      }
      if (input.defaultModel !== undefined) {
        sets.push('default_model = ?')
        params.push(input.defaultModel)
      }

      params.push(chatId)

      const result = db.chat.prepare(`
        UPDATE chats SET ${sets.join(', ')} WHERE id = ?
      `).run(...params)

      if (result.changes === 0) {
        return Result.ok(null)
      }

      return this.getChatById(chatId)
    } catch (error) {
      log.error('Failed to update chat', error instanceof Error ? error : undefined, { chatId })
      return Result.err(Errors.db.queryFailed('UPDATE chat', error instanceof Error ? error : undefined))
    }
  },

  deleteChat(chatId: ChatId): Result<boolean> {
    try {
      const result = db.chat
        .prepare('DELETE FROM chats WHERE id = ?')
        .run(chatId)

      log.info('Chat deleted', { chatId, deleted: result.changes > 0 })
      return Result.ok(result.changes > 0)
    } catch (error) {
      log.error('Failed to delete chat', error instanceof Error ? error : undefined, { chatId })
      return Result.err(Errors.db.queryFailed('DELETE chat', error instanceof Error ? error : undefined))
    }
  },

  // ---------------------------------------------------------------------------
  // Message CRUD
  // ---------------------------------------------------------------------------

  addMessage(input: CreateMessageInput): Result<Message> {
    try {
      const id = newMessageId()
      const now = new Date().toISOString()
      const contentJson = JSON.stringify(input.content)
      const metadataJson = input.metadata ? JSON.stringify(input.metadata) : null

      db.chat.prepare(`
        INSERT INTO messages (id, chat_id, role, content, model, token_count, generation_time, timestamp, branch_id, parent_id, is_liked, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
      `).run(
        id,
        input.chatId,
        input.role,
        contentJson,
        input.model ?? null,
        input.tokenCount ?? null,
        input.generationTime ?? null,
        now,
        input.branchId ?? null,
        input.parentId ?? null,
        metadataJson
      )

      log.debug('Message added', { messageId: id, chatId: input.chatId, role: input.role })

      return Result.ok({
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
        metadata: input.metadata,
      })
    } catch (error) {
      log.error('Failed to add message', error instanceof Error ? error : undefined, { chatId: input.chatId })
      return Result.err(Errors.db.queryFailed('INSERT message', error instanceof Error ? error : undefined))
    }
  },

  getMessages(chatId: ChatId, options?: ListMessagesOptions): Result<Message[]> {
    try {
      const limit = options?.limit ?? 100
      const offset = options?.offset ?? 0

      let whereClause = 'WHERE chat_id = ?'
      const params: unknown[] = [chatId]

      if (options?.branchId) {
        whereClause += ' AND (branch_id = ? OR branch_id IS NULL)'
        params.push(options.branchId)
      }

      if (options?.afterId) {
        whereClause += ' AND timestamp > (SELECT timestamp FROM messages WHERE id = ?)'
        params.push(options.afterId)
      }

      if (options?.beforeId) {
        whereClause += ' AND timestamp < (SELECT timestamp FROM messages WHERE id = ?)'
        params.push(options.beforeId)
      }

      const rows = db.chat.prepare(`
        SELECT * FROM messages
        ${whereClause}
        ORDER BY timestamp ASC
        LIMIT ? OFFSET ?
      `).all(...params, limit, offset) as MessageRow[]

      const messages = rows.map(rowToMessage)

      // Load attachments and tool calls for each message
      for (const msg of messages) {
        const attachmentRows = db.chat
          .prepare('SELECT * FROM attachments WHERE message_id = ?')
          .all(msg.id) as AttachmentRow[]
        msg.attachments = attachmentRows.map(rowToAttachment)

        const toolCallRows = db.chat
          .prepare('SELECT * FROM tool_calls WHERE message_id = ?')
          .all(msg.id) as ToolCallRow[]
        msg.toolCalls = toolCallRows.map(rowToToolCall)
      }

      return Result.ok(messages)
    } catch (error) {
      log.error('Failed to get messages', error instanceof Error ? error : undefined, { chatId })
      return Result.err(Errors.db.queryFailed('SELECT messages', error instanceof Error ? error : undefined))
    }
  },

  updateMessage(messageId: MessageId, input: UpdateMessageInput): Result<Message | null> {
    try {
      const sets: string[] = []
      const params: unknown[] = []

      if (input.content !== undefined) {
        sets.push('content = ?')
        params.push(JSON.stringify(input.content))
      }
      if (input.isLiked !== undefined) {
        sets.push('is_liked = ?')
        params.push(input.isLiked ? 1 : 0)
      }
      if (input.metadata !== undefined) {
        sets.push('metadata = ?')
        params.push(JSON.stringify(input.metadata))
      }

      if (sets.length === 0) {
        // Nothing to update, fetch and return existing
        const row = db.chat
          .prepare('SELECT * FROM messages WHERE id = ?')
          .get(messageId) as MessageRow | null
        return Result.ok(row ? rowToMessage(row) : null)
      }

      params.push(messageId)

      const result = db.chat.prepare(`
        UPDATE messages SET ${sets.join(', ')} WHERE id = ?
      `).run(...params)

      if (result.changes === 0) {
        return Result.ok(null)
      }

      const row = db.chat
        .prepare('SELECT * FROM messages WHERE id = ?')
        .get(messageId) as MessageRow | null

      return Result.ok(row ? rowToMessage(row) : null)
    } catch (error) {
      log.error('Failed to update message', error instanceof Error ? error : undefined, { messageId })
      return Result.err(Errors.db.queryFailed('UPDATE message', error instanceof Error ? error : undefined))
    }
  },

  deleteMessage(messageId: MessageId): Result<boolean> {
    try {
      const result = db.chat
        .prepare('DELETE FROM messages WHERE id = ?')
        .run(messageId)

      return Result.ok(result.changes > 0)
    } catch (error) {
      log.error('Failed to delete message', error instanceof Error ? error : undefined, { messageId })
      return Result.err(Errors.db.queryFailed('DELETE message', error instanceof Error ? error : undefined))
    }
  },

  clearMessages(chatId: ChatId): Result<void> {
    try {
      db.chat
        .prepare('DELETE FROM messages WHERE chat_id = ?')
        .run(chatId)

      log.info('Messages cleared', { chatId })
      return Result.ok(undefined)
    } catch (error) {
      log.error('Failed to clear messages', error instanceof Error ? error : undefined, { chatId })
      return Result.err(Errors.db.queryFailed('DELETE messages', error instanceof Error ? error : undefined))
    }
  },

  // ---------------------------------------------------------------------------
  // Utility Methods
  // ---------------------------------------------------------------------------

  toggleMessageLike(messageId: MessageId): Result<boolean> {
    try {
      const row = db.chat
        .prepare('SELECT is_liked FROM messages WHERE id = ?')
        .get(messageId) as { is_liked: number } | null

      if (!row) {
        return Result.err(Errors.store.notFound('message', messageId))
      }

      const newValue = row.is_liked ? 0 : 1

      db.chat
        .prepare('UPDATE messages SET is_liked = ? WHERE id = ?')
        .run(newValue, messageId)

      return Result.ok(Boolean(newValue))
    } catch (error) {
      log.error('Failed to toggle message like', error instanceof Error ? error : undefined, { messageId })
      return Result.err(Errors.db.queryFailed('UPDATE message like', error instanceof Error ? error : undefined))
    }
  },

  searchMessages(options: SearchMessagesOptions): Result<PaginatedResult<SearchResult>> {
    try {
      const limit = options.limit ?? 20
      const offset = options.offset ?? 0

      let whereClause = ''
      const params: unknown[] = [options.query]

      if (options.chatId) {
        whereClause = 'AND fts.chat_id = ?'
        params.push(options.chatId)
      }

      // Get total count
      const countRow = db.chat.prepare(`
        SELECT COUNT(*) as count
        FROM messages_fts fts
        WHERE fts.content MATCH ?
        ${whereClause}
      `).get(...params) as { count: number }

      // Get results
      params.push(limit, offset)
      const rows = db.chat.prepare(`
        SELECT
          fts.message_id,
          fts.chat_id,
          c.title as chat_title,
          snippet(messages_fts, 0, '<mark>', '</mark>', '...', 32) as snippet,
          m.timestamp
        FROM messages_fts fts
        JOIN chats c ON c.id = fts.chat_id
        JOIN messages m ON m.id = fts.message_id
        WHERE fts.content MATCH ?
        ${whereClause}
        ORDER BY rank
        LIMIT ? OFFSET ?
      `).all(...params) as Array<{
        message_id: string
        chat_id: string
        chat_title: string
        snippet: string
        timestamp: string
      }>

      const items: SearchResult[] = rows.map((row) => ({
        messageId: row.message_id as MessageId,
        chatId: row.chat_id as ChatId,
        chatTitle: row.chat_title,
        snippet: row.snippet,
        timestamp: row.timestamp,
      }))

      return Result.ok({
        items,
        total: countRow.count,
        limit,
        offset,
        hasMore: offset + items.length < countRow.count,
      })
    } catch (error) {
      log.error('Failed to search messages', error instanceof Error ? error : undefined, { query: options.query })
      return Result.err(Errors.db.queryFailed('FTS search', error instanceof Error ? error : undefined))
    }
  },

  // ---------------------------------------------------------------------------
  // Attachment Methods
  // ---------------------------------------------------------------------------

  addAttachment(input: CreateAttachmentInput): Result<Attachment> {
    try {
      const id = generateId()

      db.chat.prepare(`
        INSERT INTO attachments (id, message_id, name, mime_type, size, storage_path, url, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        input.messageId,
        input.name,
        input.mimeType,
        input.size,
        input.storagePath ?? null,
        input.url ?? null,
        input.metadata ? JSON.stringify(input.metadata) : null
      )

      return Result.ok({
        id,
        messageId: input.messageId,
        name: input.name,
        mimeType: input.mimeType,
        size: input.size,
        storagePath: input.storagePath,
        url: input.url,
        metadata: input.metadata,
      })
    } catch (error) {
      log.error('Failed to add attachment', error instanceof Error ? error : undefined)
      return Result.err(Errors.db.queryFailed('INSERT attachment', error instanceof Error ? error : undefined))
    }
  },

  // ---------------------------------------------------------------------------
  // Tool Call Methods
  // ---------------------------------------------------------------------------

  addToolCall(input: CreateToolCallInput): Result<ToolCall> {
    try {
      const id = generateId()
      const now = new Date().toISOString()

      db.chat.prepare(`
        INSERT INTO tool_calls (id, message_id, name, input, status, started_at)
        VALUES (?, ?, ?, ?, 'pending', ?)
      `).run(id, input.messageId, input.name, JSON.stringify(input.input), now)

      return Result.ok({
        id,
        messageId: input.messageId,
        name: input.name,
        input: input.input,
        status: 'pending',
        startedAt: now,
      })
    } catch (error) {
      log.error('Failed to add tool call', error instanceof Error ? error : undefined)
      return Result.err(Errors.db.queryFailed('INSERT tool_call', error instanceof Error ? error : undefined))
    }
  },

  updateToolCall(toolCallId: string, input: UpdateToolCallInput): Result<ToolCall | null> {
    try {
      const sets: string[] = []
      const params: unknown[] = []

      if (input.output !== undefined) {
        sets.push('output = ?')
        params.push(input.output)
      }
      if (input.status !== undefined) {
        sets.push('status = ?')
        params.push(input.status)
      }
      if (input.error !== undefined) {
        sets.push('error = ?')
        params.push(input.error)
      }
      if (input.completedAt !== undefined) {
        sets.push('completed_at = ?')
        params.push(input.completedAt)
      }

      if (sets.length === 0) {
        const row = db.chat
          .prepare('SELECT * FROM tool_calls WHERE id = ?')
          .get(toolCallId) as ToolCallRow | null
        return Result.ok(row ? rowToToolCall(row) : null)
      }

      params.push(toolCallId)

      const result = db.chat.prepare(`
        UPDATE tool_calls SET ${sets.join(', ')} WHERE id = ?
      `).run(...params)

      if (result.changes === 0) {
        return Result.ok(null)
      }

      const row = db.chat
        .prepare('SELECT * FROM tool_calls WHERE id = ?')
        .get(toolCallId) as ToolCallRow | null

      return Result.ok(row ? rowToToolCall(row) : null)
    } catch (error) {
      log.error('Failed to update tool call', error instanceof Error ? error : undefined, { toolCallId })
      return Result.err(Errors.db.queryFailed('UPDATE tool_call', error instanceof Error ? error : undefined))
    }
  },

  // ---------------------------------------------------------------------------
  // Branch Methods
  // ---------------------------------------------------------------------------

  createBranch(input: CreateBranchInput): Result<Branch> {
    try {
      const id = generateId()
      const now = new Date().toISOString()

      db.chat.prepare(`
        INSERT INTO branches (id, chat_id, parent_branch_id, fork_message_id, name, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        id,
        input.chatId,
        input.parentBranchId ?? null,
        input.forkMessageId,
        input.name ?? null,
        now
      )

      return Result.ok({
        id,
        chatId: input.chatId,
        parentBranchId: input.parentBranchId,
        forkMessageId: input.forkMessageId,
        name: input.name,
        createdAt: now,
      })
    } catch (error) {
      log.error('Failed to create branch', error instanceof Error ? error : undefined)
      return Result.err(Errors.db.queryFailed('INSERT branch', error instanceof Error ? error : undefined))
    }
  },

  getBranches(chatId: ChatId): Result<Branch[]> {
    try {
      const rows = db.chat
        .prepare('SELECT * FROM branches WHERE chat_id = ? ORDER BY created_at')
        .all(chatId) as BranchRow[]

      return Result.ok(rows.map(rowToBranch))
    } catch (error) {
      log.error('Failed to get branches', error instanceof Error ? error : undefined, { chatId })
      return Result.err(Errors.db.queryFailed('SELECT branches', error instanceof Error ? error : undefined))
    }
  },
}
