// =============================================================================
// RESPONSE GROUP STORE
// =============================================================================
// SQLite-backed storage for parallel response groups.
// Manages the mapping between user messages and their alternative responses.

import { db } from '../db'
import { Result, Errors, logger, type ChatId, type MessageId } from '../core'
import type {
  ResponseGroupId,
  ResponseGroup,
  ResponseGroupWithMessages,
  CreateResponseGroupInput,
  SelectResponseInput,
  AddResponseToGroupInput,
} from './response-group-store.types'
import { newResponseGroupId } from './response-group-store.types'

const log = logger.child({ module: 'response-group-store' })

// =============================================================================
// Row Types (Database schema)
// =============================================================================

interface ResponseGroupRow {
  id: string
  chat_id: string
  user_message_id: string
  selected_response_id: string | null
  created_at: string
  updated_at: string
}

interface MemberRow {
  response_group_id: string
  message_id: string
  position: number
}

// =============================================================================
// Converters
// =============================================================================

function rowToResponseGroup(row: ResponseGroupRow): ResponseGroup {
  return {
    id: row.id as ResponseGroupId,
    chatId: row.chat_id as ChatId,
    userMessageId: row.user_message_id as MessageId,
    selectedResponseId: row.selected_response_id ? (row.selected_response_id as MessageId) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// =============================================================================
// ResponseGroupStore
// =============================================================================

export const ResponseGroupStore = {
  /**
   * Create a new response group with initial responses
   */
  createGroup(input: CreateResponseGroupInput): Result<ResponseGroup> {
    try {
      const id = newResponseGroupId()
      const now = new Date().toISOString()

      // Insert response group
      db.chat.prepare(`
        INSERT INTO response_groups (id, chat_id, user_message_id, selected_response_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        id,
        input.chatId,
        input.userMessageId,
        input.selectedResponseId ?? null,
        now,
        now
      )

      // Insert members with position
      const insertMember = db.chat.prepare(`
        INSERT INTO response_group_members (response_group_id, message_id, position)
        VALUES (?, ?, ?)
      `)

      input.responseIds.forEach((msgId, index) => {
        insertMember.run(id, msgId, index)
      })

      // Update messages with response_group_id
      const updateMsg = db.chat.prepare('UPDATE messages SET response_group_id = ? WHERE id = ?')
      input.responseIds.forEach(msgId => {
        updateMsg.run(id, msgId)
      })

      log.info('Response group created', {
        groupId: id,
        responseCount: input.responseIds.length,
        chatId: input.chatId,
      })

      return Result.ok({
        id,
        chatId: input.chatId,
        userMessageId: input.userMessageId,
        selectedResponseId: input.selectedResponseId ?? null,
        createdAt: now,
        updatedAt: now,
      })
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      log.error('Failed to create response group', err)
      return Result.err(Errors.db.queryFailed('INSERT response_group', err))
    }
  },

  /**
   * Get a response group with all its message IDs
   */
  getGroupWithMessages(groupId: ResponseGroupId): Result<ResponseGroupWithMessages | null> {
    try {
      // Get group
      const groupRow = db.chat.prepare('SELECT * FROM response_groups WHERE id = ?').get(groupId) as
        | ResponseGroupRow
        | undefined

      if (!groupRow) return Result.ok(null)

      // Get member message IDs (ordered by position)
      const memberRows = db.chat
        .prepare(
          `
        SELECT message_id, position
        FROM response_group_members
        WHERE response_group_id = ?
        ORDER BY position
      `
        )
        .all(groupId) as MemberRow[]

      const group = rowToResponseGroup(groupRow)
      const responseIds = memberRows.map(r => r.message_id as MessageId)

      return Result.ok({
        ...group,
        responseIds,
      })
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      log.error('Failed to get response group', err)
      return Result.err(Errors.db.queryFailed('SELECT response_group', err))
    }
  },

  /**
   * Select which response in the group continues the conversation
   */
  selectResponse(input: SelectResponseInput): Result<ResponseGroup | null> {
    try {
      // Verify the message is in the group
      const member = db.chat
        .prepare(
          `
        SELECT 1 FROM response_group_members
        WHERE response_group_id = ? AND message_id = ?
      `
        )
        .get(input.responseGroupId, input.messageId)

      if (!member) {
        return Result.err(Errors.store.notFound('message in response group', input.messageId))
      }

      // Update selection
      const result = db.chat
        .prepare(
          `
        UPDATE response_groups
        SET selected_response_id = ?, updated_at = datetime('now')
        WHERE id = ?
      `
        )
        .run(input.messageId, input.responseGroupId)

      if (result.changes === 0) {
        return Result.ok(null)
      }

      // Fetch updated group
      const row = db.chat.prepare('SELECT * FROM response_groups WHERE id = ?').get(input.responseGroupId) as
        | ResponseGroupRow
        | undefined

      log.info('Response selected', {
        groupId: input.responseGroupId,
        messageId: input.messageId,
      })

      return Result.ok(row ? rowToResponseGroup(row) : null)
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      log.error('Failed to select response', err)
      return Result.err(Errors.db.queryFailed('UPDATE response selection', err))
    }
  },

  /**
   * Add a response to an existing group (e.g., user regenerates with another model)
   */
  addResponseToGroup(input: AddResponseToGroupInput): Result<boolean> {
    try {
      // Get next position
      const maxPos = db.chat
        .prepare(
          `
        SELECT COALESCE(MAX(position), -1) as max_pos
        FROM response_group_members
        WHERE response_group_id = ?
      `
        )
        .get(input.responseGroupId) as { max_pos: number }

      const position = input.position ?? maxPos.max_pos + 1

      db.chat
        .prepare(
          `
        INSERT INTO response_group_members (response_group_id, message_id, position)
        VALUES (?, ?, ?)
      `
        )
        .run(input.responseGroupId, input.messageId, position)

      // Update message with group ID
      db.chat.prepare('UPDATE messages SET response_group_id = ? WHERE id = ?').run(input.responseGroupId, input.messageId)

      log.info('Response added to group', {
        groupId: input.responseGroupId,
        messageId: input.messageId,
        position,
      })

      return Result.ok(true)
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      log.error('Failed to add response to group', err)
      return Result.err(Errors.db.queryFailed('INSERT response member', err))
    }
  },

  /**
   * Get all response groups for a chat (for loading conversation history)
   */
  getGroupsForChat(chatId: ChatId): Result<ResponseGroupWithMessages[]> {
    try {
      const groupRows = db.chat
        .prepare(
          `
        SELECT * FROM response_groups
        WHERE chat_id = ?
        ORDER BY created_at ASC
      `
        )
        .all(chatId) as ResponseGroupRow[]

      const groups: ResponseGroupWithMessages[] = []

      for (const groupRow of groupRows) {
        const memberRows = db.chat
          .prepare(
            `
          SELECT message_id, position
          FROM response_group_members
          WHERE response_group_id = ?
          ORDER BY position
        `
          )
          .all(groupRow.id) as MemberRow[]

        groups.push({
          ...rowToResponseGroup(groupRow),
          responseIds: memberRows.map(r => r.message_id as MessageId),
        })
      }

      log.info('Retrieved groups for chat', { chatId, groupCount: groups.length })

      return Result.ok(groups)
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      log.error('Failed to get groups for chat', err)
      return Result.err(Errors.db.queryFailed('SELECT response_groups', err))
    }
  },

  /**
   * Build conversation context (only selected responses)
   * Returns array of message IDs in chronological order for context building
   */
  buildConversationContext(chatId: ChatId): Result<MessageId[]> {
    try {
      // Get all user messages and their selected responses
      const contextRows = db.chat
        .prepare(
          `
        SELECT m.id as user_msg_id, rg.selected_response_id
        FROM messages m
        LEFT JOIN response_groups rg ON rg.user_message_id = m.id
        WHERE m.chat_id = ? AND m.role = 'user'
        ORDER BY m.timestamp ASC
      `
        )
        .all(chatId) as Array<{ user_msg_id: string; selected_response_id: string | null }>

      const messageIds: MessageId[] = []

      for (const row of contextRows) {
        messageIds.push(row.user_msg_id as MessageId)
        if (row.selected_response_id) {
          messageIds.push(row.selected_response_id as MessageId)
        }
      }

      log.info('Built conversation context', { chatId, messageCount: messageIds.length })

      return Result.ok(messageIds)
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      log.error('Failed to build conversation context', err)
      return Result.err(Errors.db.queryFailed('SELECT context messages', err))
    }
  },

  /**
   * Get response group by user message ID (convenience method)
   */
  getGroupByUserMessage(userMessageId: MessageId): Result<ResponseGroupWithMessages | null> {
    try {
      const groupRow = db.chat
        .prepare('SELECT * FROM response_groups WHERE user_message_id = ?')
        .get(userMessageId) as ResponseGroupRow | undefined

      if (!groupRow) return Result.ok(null)

      // Get members
      const memberRows = db.chat
        .prepare(
          `
        SELECT message_id, position
        FROM response_group_members
        WHERE response_group_id = ?
        ORDER BY position
      `
        )
        .all(groupRow.id) as MemberRow[]

      return Result.ok({
        ...rowToResponseGroup(groupRow),
        responseIds: memberRows.map(r => r.message_id as MessageId),
      })
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      log.error('Failed to get group by user message', err)
      return Result.err(Errors.db.queryFailed('SELECT response_group', err))
    }
  },
}
