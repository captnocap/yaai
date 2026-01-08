// =============================================================================
// PROJECT STORE
// =============================================================================
// Unified query layer for projects across all modes (chat, code, image, research).
// Uses UNION queries to merge chat projects and Claude Code projects.

import { db } from '../db'
import { Result, Errors, logger, type PaginatedResult } from '../core'
import type { ProjectType, ProjectSummary, ListProjectsOptions } from './chat-store.types'
import { ChatStore } from './chat-store'
import { ClaudeProjectStore } from './claude-project-store'

const log = logger.child({ module: 'project-store' })

// -----------------------------------------------------------------------------
// Project Store
// -----------------------------------------------------------------------------

export const ProjectStore = {
  /**
   * List projects across all types with unified sorting and filtering
   * Uses UNION to merge chat and Claude Code projects
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

      const includeChat = types.includes('chat')
      const includeCode = types.includes('code')

      // If no supported types requested
      if (!includeChat && !includeCode) {
        return Result.ok({
          items: [],
          total: 0,
          limit,
          offset,
          hasMore: false,
        })
      }

      // Build WHERE conditions
      const archiveCondition = !includeArchived ? 'is_archived = 0' : '1=1'
      const searchCondition = options?.search ? 'title LIKE ?' : '1=1'
      const searchParams = options?.search ? [`%${options.search}%`] : []

      // Build UNION query parts
      const unionParts: string[] = []

      if (includeChat) {
        unionParts.push(`
          SELECT
            id,
            'chat' as type,
            title,
            COALESCE(last_interacted_at, updated_at) as last_interacted_at,
            is_pinned,
            is_archived,
            (SELECT content FROM messages WHERE chat_id = chats.id ORDER BY timestamp DESC LIMIT 1) as preview,
            NULL as project_path
          FROM chats
          WHERE ${archiveCondition} AND ${searchCondition}
        `)
      }

      if (includeCode) {
        unionParts.push(`
          SELECT
            id,
            'code' as type,
            title,
            COALESCE(last_interacted_at, updated_at) as last_interacted_at,
            is_pinned,
            is_archived,
            project_path as preview,
            project_path
          FROM claude_projects
          WHERE ${archiveCondition} AND ${searchCondition}
        `)
      }

      // Combine with UNION ALL
      const unionQuery = unionParts.join(' UNION ALL ')

      // Build order clause
      const orderColumn = orderBy === 'title' ? 'title' : 'last_interacted_at'
      const orderClause = pinnedFirst
        ? `ORDER BY is_pinned DESC, ${orderColumn} ${order.toUpperCase()}`
        : `ORDER BY ${orderColumn} ${order.toUpperCase()}`

      // Get total count
      const countQuery = `SELECT COUNT(*) as count FROM (${unionQuery})`
      const countParams = [...searchParams, ...searchParams].slice(0, unionParts.length * searchParams.length)
      const countRow = db.chat.prepare(countQuery).get(...countParams) as { count: number }

      // Get items
      const dataQuery = `
        SELECT * FROM (${unionQuery})
        ${orderClause}
        LIMIT ? OFFSET ?
      `
      const dataParams = [...countParams, limit, offset]
      const rows = db.chat.prepare(dataQuery).all(...dataParams) as Array<{
        id: string
        type: string
        title: string
        last_interacted_at: string
        is_pinned: number
        is_archived: number
        preview: string | null
        project_path: string | null
      }>

      const items: ProjectSummary[] = rows.map((row) => {
        let preview: string | undefined

        if (row.type === 'chat' && row.preview) {
          // Parse chat preview from message content
          try {
            const blocks = JSON.parse(row.preview)
            if (Array.isArray(blocks)) {
              const textBlock = blocks.find((b: { type: string }) => b.type === 'text')
              preview = textBlock?.text?.slice(0, 100)
            }
          } catch {
            preview = row.preview.slice(0, 100)
          }
        } else if (row.type === 'code' && row.project_path) {
          // Use project path as preview for code projects
          preview = row.project_path
        }

        return {
          id: row.id,
          type: row.type as ProjectType,
          title: row.title,
          lastInteractedAt: row.last_interacted_at,
          isPinned: Boolean(row.is_pinned),
          isArchived: Boolean(row.is_archived),
          preview,
          metadata: row.type === 'code' && row.project_path ? { projectPath: row.project_path } : undefined,
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
      if (type === 'code') {
        return ClaudeProjectStore.pinProject(id)
      }
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
      if (type === 'code') {
        return ClaudeProjectStore.unpinProject(id)
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
      if (type === 'code') {
        return ClaudeProjectStore.archiveProject(id)
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
      if (type === 'code') {
        return ClaudeProjectStore.unarchiveProject(id)
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
      if (type === 'code') {
        return ClaudeProjectStore.deleteProject(id)
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
      if (type === 'code') {
        return ClaudeProjectStore.renameProject(id, title)
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
      if (type === 'code') {
        return ClaudeProjectStore.recordInteraction(id)
      }
      log.warn('Record interaction not implemented for project type', { type, id })
      return Result.ok(false)
    } catch (error) {
      log.error('Failed to record project interaction', error instanceof Error ? error : undefined, { id, type })
      return Result.err(Errors.db.queryFailed('RECORD interaction', error instanceof Error ? error : undefined))
    }
  },

  /**
   * Sync Claude Code projects from filesystem
   */
  syncClaudeProjects(): Result<{ added: number; updated: number; removed: number }> {
    return ClaudeProjectStore.syncProjects()
  },

  /**
   * Record interaction by project path (for Claude Code projects)
   */
  recordInteractionByPath(projectPath: string): Result<string> {
    return ClaudeProjectStore.recordInteractionByPath(projectPath)
  },
}
