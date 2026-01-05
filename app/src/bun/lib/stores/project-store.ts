// =============================================================================
// PROJECT STORE
// =============================================================================
// Unified query layer for projects across all modes (chat, code, image, research).
// Currently only chat is fully implemented; others will follow.

import { db } from '../db'
import { Result, Errors, logger, type PaginatedResult } from '../core'
import type { ProjectType, ProjectSummary, ListProjectsOptions } from './chat-store.types'
import { ChatStore } from './chat-store'

const log = logger.child({ module: 'project-store' })

// -----------------------------------------------------------------------------
// Project Store
// -----------------------------------------------------------------------------

export const ProjectStore = {
  /**
   * List projects across all types with unified sorting and filtering
   */
  listProjects(options?: ListProjectsOptions): Result<PaginatedResult<ProjectSummary>> {
    try {
      const limit = options?.limit ?? 50
      const offset = options?.offset ?? 0
      const orderBy = options?.orderBy ?? 'lastInteractedAt'
      const order = options?.order ?? 'desc'
      const includeArchived = options?.includeArchived ?? false
      const pinnedFirst = options?.pinnedFirst ?? true
      const types = options?.types ?? ['chat', 'code', 'image', 'research']

      // For now, only chat is implemented
      // In the future, this will UNION across multiple tables
      if (!types.includes('chat')) {
        // No supported types requested
        return Result.ok({
          items: [],
          total: 0,
          limit,
          offset,
          hasMore: false,
        })
      }

      // Map orderBy to column
      const orderColumnMap: Record<string, string> = {
        lastInteractedAt: 'COALESCE(last_interacted_at, updated_at)',
        title: 'title',
        type: "'chat'", // All are chat for now
      }
      const orderColumn = orderColumnMap[orderBy] || orderColumnMap.lastInteractedAt

      const whereClauses: string[] = []
      const params: unknown[] = []

      // Filter archived
      if (!includeArchived) {
        whereClauses.push('is_archived = 0')
      }

      // Search filter
      if (options?.search) {
        whereClauses.push('title LIKE ?')
        params.push(`%${options.search}%`)
      }

      const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : ''

      // Build order clause - pinned first if requested
      const orderClause = pinnedFirst
        ? `ORDER BY is_pinned DESC, ${orderColumn} ${order.toUpperCase()}`
        : `ORDER BY ${orderColumn} ${order.toUpperCase()}`

      // Get total count
      const countRow = db.chat.prepare(`
        SELECT COUNT(*) as count FROM chats ${whereClause}
      `).get(...params) as { count: number }

      // Get items with preview (last message text)
      const rows = db.chat.prepare(`
        SELECT
          id,
          title,
          COALESCE(last_interacted_at, updated_at) as last_interacted_at,
          is_pinned,
          is_archived,
          (SELECT content FROM messages WHERE chat_id = chats.id ORDER BY timestamp DESC LIMIT 1) as preview
        FROM chats
        ${whereClause}
        ${orderClause}
        LIMIT ? OFFSET ?
      `).all(...params, limit, offset) as Array<{
        id: string
        title: string
        last_interacted_at: string
        is_pinned: number
        is_archived: number
        preview: string | null
      }>

      const items: ProjectSummary[] = rows.map((row) => {
        let preview: string | undefined
        if (row.preview) {
          try {
            const blocks = JSON.parse(row.preview)
            if (Array.isArray(blocks)) {
              const textBlock = blocks.find((b: { type: string }) => b.type === 'text')
              preview = textBlock?.text?.slice(0, 100)
            }
          } catch {
            preview = row.preview.slice(0, 100)
          }
        }

        return {
          id: row.id,
          type: 'chat' as ProjectType,
          title: row.title,
          lastInteractedAt: row.last_interacted_at,
          isPinned: Boolean(row.is_pinned),
          isArchived: Boolean(row.is_archived),
          preview,
        }
      })

      return Result.ok({
        items,
        total: countRow.count,
        limit,
        offset,
        hasMore: offset + items.length < countRow.count,
      })
    } catch (error) {
      log.error('Failed to list projects', error instanceof Error ? error : undefined)
      return Result.err(Errors.db.queryFailed('SELECT projects', error instanceof Error ? error : undefined))
    }
  },

  /**
   * Pin a project
   */
  pinProject(id: string, type: ProjectType): Result<boolean> {
    try {
      if (type === 'chat') {
        return ChatStore.pinChat(id as any)
      }
      // Other types not yet implemented
      log.warn('Pin not implemented for project type', { type, id })
      return Result.ok(false)
    } catch (error) {
      log.error('Failed to pin project', error instanceof Error ? error : undefined, { id, type })
      return Result.err(Errors.db.queryFailed('PIN project', error instanceof Error ? error : undefined))
    }
  },

  /**
   * Unpin a project
   */
  unpinProject(id: string, type: ProjectType): Result<boolean> {
    try {
      if (type === 'chat') {
        return ChatStore.unpinChat(id as any)
      }
      log.warn('Unpin not implemented for project type', { type, id })
      return Result.ok(false)
    } catch (error) {
      log.error('Failed to unpin project', error instanceof Error ? error : undefined, { id, type })
      return Result.err(Errors.db.queryFailed('UNPIN project', error instanceof Error ? error : undefined))
    }
  },

  /**
   * Archive a project
   */
  archiveProject(id: string, type: ProjectType): Result<boolean> {
    try {
      if (type === 'chat') {
        return ChatStore.archiveChat(id as any)
      }
      log.warn('Archive not implemented for project type', { type, id })
      return Result.ok(false)
    } catch (error) {
      log.error('Failed to archive project', error instanceof Error ? error : undefined, { id, type })
      return Result.err(Errors.db.queryFailed('ARCHIVE project', error instanceof Error ? error : undefined))
    }
  },

  /**
   * Unarchive a project
   */
  unarchiveProject(id: string, type: ProjectType): Result<boolean> {
    try {
      if (type === 'chat') {
        return ChatStore.unarchiveChat(id as any)
      }
      log.warn('Unarchive not implemented for project type', { type, id })
      return Result.ok(false)
    } catch (error) {
      log.error('Failed to unarchive project', error instanceof Error ? error : undefined, { id, type })
      return Result.err(Errors.db.queryFailed('UNARCHIVE project', error instanceof Error ? error : undefined))
    }
  },

  /**
   * Delete a project
   */
  deleteProject(id: string, type: ProjectType): Result<boolean> {
    try {
      if (type === 'chat') {
        return ChatStore.deleteChat(id as any)
      }
      log.warn('Delete not implemented for project type', { type, id })
      return Result.ok(false)
    } catch (error) {
      log.error('Failed to delete project', error instanceof Error ? error : undefined, { id, type })
      return Result.err(Errors.db.queryFailed('DELETE project', error instanceof Error ? error : undefined))
    }
  },

  /**
   * Rename a project
   */
  renameProject(id: string, type: ProjectType, title: string): Result<boolean> {
    try {
      if (type === 'chat') {
        return ChatStore.renameChat(id as any, title)
      }
      log.warn('Rename not implemented for project type', { type, id })
      return Result.ok(false)
    } catch (error) {
      log.error('Failed to rename project', error instanceof Error ? error : undefined, { id, type })
      return Result.err(Errors.db.queryFailed('RENAME project', error instanceof Error ? error : undefined))
    }
  },

  /**
   * Record an interaction with a project (updates lastInteractedAt)
   */
  recordInteraction(id: string, type: ProjectType): Result<boolean> {
    try {
      if (type === 'chat') {
        return ChatStore.recordInteraction(id as any)
      }
      log.warn('Record interaction not implemented for project type', { type, id })
      return Result.ok(false)
    } catch (error) {
      log.error('Failed to record project interaction', error instanceof Error ? error : undefined, { id, type })
      return Result.err(Errors.db.queryFailed('RECORD interaction', error instanceof Error ? error : undefined))
    }
  },
}
