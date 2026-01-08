// =============================================================================
// CLAUDE PROJECT STORE
// =============================================================================
// Manages Claude Code projects synced from ~/.claude/projects/
// Integrates with the unified ProjectStore for navigation

import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import { db } from '../db'
import { Result, Errors, logger, type PaginatedResult } from '../core'
import type { ProjectSummary, ListProjectsOptions } from './chat-store.types'

const log = logger.child({ module: 'claude-project-store' })

// Path to Claude Code's projects directory
const CLAUDE_PROJECTS_DIR = path.join(os.homedir(), '.claude', 'projects')

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface ClaudeProject {
  id: string
  projectPath: string
  title: string
  description?: string
  sessionCount: number
  lastSessionId?: string
  isPinned: boolean
  isArchived: boolean
  lastInteractedAt?: string
  lastSyncedAt?: string
  createdAt: string
  updatedAt: string
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

/**
 * Encode a project path to a safe ID
 * /home/user/project -> -home-user-project
 */
function encodePathToId(projectPath: string): string {
  return projectPath.replace(/\//g, '-').replace(/^-/, '')
}

/**
 * Decode an ID back to a project path
 */
function decodeIdToPath(id: string): string {
  // Handle both formats: with and without leading dash
  if (id.startsWith('-')) {
    return id.replace(/-/g, '/')
  }
  return '/' + id.replace(/-/g, '/')
}

/**
 * Get title from project path (last directory name)
 */
function getTitleFromPath(projectPath: string): string {
  return path.basename(projectPath) || projectPath
}

// -----------------------------------------------------------------------------
// Claude Project Store
// -----------------------------------------------------------------------------

export const ClaudeProjectStore = {
  /**
   * Sync projects from ~/.claude/projects/ to database
   * Reads directory structure and updates/creates entries
   */
  syncProjects(): Result<{ added: number; updated: number; removed: number }> {
    try {
      let added = 0
      let updated = 0
      let removed = 0

      // Check if Claude projects directory exists
      if (!fs.existsSync(CLAUDE_PROJECTS_DIR)) {
        log.debug('Claude projects directory does not exist', { path: CLAUDE_PROJECTS_DIR })
        return Result.ok({ added, updated, removed })
      }

      // Read all project directories
      // Claude uses encoded paths as directory names
      const projectDirs = fs.readdirSync(CLAUDE_PROJECTS_DIR)
        .filter(name => {
          const fullPath = path.join(CLAUDE_PROJECTS_DIR, name)
          return fs.statSync(fullPath).isDirectory()
        })

      const now = new Date().toISOString()
      const seenIds = new Set<string>()

      for (const dirName of projectDirs) {
        // Decode the directory name to get the actual project path
        const projectPath = decodeIdToPath(dirName)
        const id = dirName
        seenIds.add(id)

        // Count session files
        const projectDir = path.join(CLAUDE_PROJECTS_DIR, dirName)
        const sessionFiles = fs.readdirSync(projectDir)
          .filter(f => f.endsWith('.jsonl'))
        const sessionCount = sessionFiles.length

        // Get latest session (most recently modified)
        let lastSessionId: string | undefined
        let latestMtime = 0
        for (const sessionFile of sessionFiles) {
          const sessionPath = path.join(projectDir, sessionFile)
          const stat = fs.statSync(sessionPath)
          if (stat.mtimeMs > latestMtime) {
            latestMtime = stat.mtimeMs
            lastSessionId = sessionFile.replace('.jsonl', '')
          }
        }

        // Check if project exists in DB
        const existing = db.chat.prepare(`
          SELECT id FROM claude_projects WHERE id = ?
        `).get(id) as { id: string } | undefined

        if (existing) {
          // Update existing
          db.chat.prepare(`
            UPDATE claude_projects
            SET session_count = ?,
                last_session_id = ?,
                last_synced_at = ?,
                updated_at = ?
            WHERE id = ?
          `).run(sessionCount, lastSessionId || null, now, now, id)
          updated++
        } else {
          // Insert new
          const title = getTitleFromPath(projectPath)
          db.chat.prepare(`
            INSERT INTO claude_projects (
              id, project_path, title, session_count, last_session_id,
              last_synced_at, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(id, projectPath, title, sessionCount, lastSessionId || null, now, now, now)
          added++
        }
      }

      // Remove projects that no longer exist on disk
      const dbProjects = db.chat.prepare(`
        SELECT id FROM claude_projects
      `).all() as Array<{ id: string }>

      for (const dbProject of dbProjects) {
        if (!seenIds.has(dbProject.id)) {
          db.chat.prepare(`
            DELETE FROM claude_projects WHERE id = ?
          `).run(dbProject.id)
          removed++
        }
      }

      log.info('Synced Claude projects', { added, updated, removed })
      return Result.ok({ added, updated, removed })
    } catch (error) {
      log.error('Failed to sync Claude projects', error instanceof Error ? error : undefined)
      return Result.err(Errors.db.queryFailed('SYNC claude_projects', error instanceof Error ? error : undefined))
    }
  },

  /**
   * List Claude Code projects
   */
  listProjects(options?: ListProjectsOptions): Result<PaginatedResult<ProjectSummary>> {
    try {
      const limit = options?.limit ?? 50
      const offset = options?.offset ?? 0
      const orderBy = options?.orderBy ?? 'lastInteractedAt'
      const order = options?.order ?? 'desc'
      const includeArchived = options?.includeArchived ?? false
      const pinnedFirst = options?.pinnedFirst ?? true

      // Map orderBy to column
      const orderColumnMap: Record<string, string> = {
        lastInteractedAt: 'COALESCE(last_interacted_at, updated_at)',
        title: 'title',
        type: "'code'",
      }
      const orderColumn = orderColumnMap[orderBy] || orderColumnMap.lastInteractedAt

      const whereClauses: string[] = []
      const params: unknown[] = []

      if (!includeArchived) {
        whereClauses.push('is_archived = 0')
      }

      if (options?.search) {
        whereClauses.push('(title LIKE ? OR project_path LIKE ?)')
        params.push(`%${options.search}%`, `%${options.search}%`)
      }

      const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : ''

      const orderClause = pinnedFirst
        ? `ORDER BY is_pinned DESC, ${orderColumn} ${order.toUpperCase()}`
        : `ORDER BY ${orderColumn} ${order.toUpperCase()}`

      // Get total count
      const countRow = db.chat.prepare(`
        SELECT COUNT(*) as count FROM claude_projects ${whereClause}
      `).get(...params) as { count: number }

      // Get items
      const rows = db.chat.prepare(`
        SELECT
          id,
          project_path,
          title,
          session_count,
          COALESCE(last_interacted_at, updated_at) as last_interacted_at,
          is_pinned,
          is_archived
        FROM claude_projects
        ${whereClause}
        ${orderClause}
        LIMIT ? OFFSET ?
      `).all(...params, limit, offset) as Array<{
        id: string
        project_path: string
        title: string
        session_count: number
        last_interacted_at: string
        is_pinned: number
        is_archived: number
      }>

      const items: ProjectSummary[] = rows.map((row) => ({
        id: row.id,
        type: 'code' as const,
        title: row.title,
        lastInteractedAt: row.last_interacted_at,
        isPinned: Boolean(row.is_pinned),
        isArchived: Boolean(row.is_archived),
        preview: row.project_path,
        metadata: {
          projectPath: row.project_path,
          sessionCount: row.session_count,
        },
      }))

      return Result.ok({
        items,
        total: countRow.count,
        limit,
        offset,
        hasMore: offset + items.length < countRow.count,
      })
    } catch (error) {
      log.error('Failed to list Claude projects', error instanceof Error ? error : undefined)
      return Result.err(Errors.db.queryFailed('SELECT claude_projects', error instanceof Error ? error : undefined))
    }
  },

  /**
   * Get a project by ID
   */
  getById(id: string): Result<ClaudeProject | null> {
    try {
      const row = db.chat.prepare(`
        SELECT * FROM claude_projects WHERE id = ?
      `).get(id) as any

      if (!row) return Result.ok(null)

      return Result.ok({
        id: row.id,
        projectPath: row.project_path,
        title: row.title,
        description: row.description,
        sessionCount: row.session_count,
        lastSessionId: row.last_session_id,
        isPinned: Boolean(row.is_pinned),
        isArchived: Boolean(row.is_archived),
        lastInteractedAt: row.last_interacted_at,
        lastSyncedAt: row.last_synced_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })
    } catch (error) {
      log.error('Failed to get Claude project', error instanceof Error ? error : undefined, { id })
      return Result.err(Errors.db.queryFailed('SELECT claude_project', error instanceof Error ? error : undefined))
    }
  },

  /**
   * Get a project by path
   */
  getByPath(projectPath: string): Result<ClaudeProject | null> {
    try {
      const row = db.chat.prepare(`
        SELECT * FROM claude_projects WHERE project_path = ?
      `).get(projectPath) as any

      if (!row) return Result.ok(null)

      return Result.ok({
        id: row.id,
        projectPath: row.project_path,
        title: row.title,
        description: row.description,
        sessionCount: row.session_count,
        lastSessionId: row.last_session_id,
        isPinned: Boolean(row.is_pinned),
        isArchived: Boolean(row.is_archived),
        lastInteractedAt: row.last_interacted_at,
        lastSyncedAt: row.last_synced_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })
    } catch (error) {
      log.error('Failed to get Claude project by path', error instanceof Error ? error : undefined, { projectPath })
      return Result.err(Errors.db.queryFailed('SELECT claude_project', error instanceof Error ? error : undefined))
    }
  },

  /**
   * Record interaction (updates lastInteractedAt)
   */
  recordInteraction(id: string): Result<boolean> {
    try {
      const now = new Date().toISOString()
      const result = db.chat.prepare(`
        UPDATE claude_projects
        SET last_interacted_at = ?, updated_at = ?
        WHERE id = ?
      `).run(now, now, id)

      return Result.ok(result.changes > 0)
    } catch (error) {
      log.error('Failed to record interaction', error instanceof Error ? error : undefined, { id })
      return Result.err(Errors.db.queryFailed('UPDATE claude_project', error instanceof Error ? error : undefined))
    }
  },

  /**
   * Record interaction by path (creates entry if needed)
   */
  recordInteractionByPath(projectPath: string): Result<string> {
    try {
      const id = encodePathToId(projectPath)
      const now = new Date().toISOString()

      // Try to update existing
      const result = db.chat.prepare(`
        UPDATE claude_projects
        SET last_interacted_at = ?, updated_at = ?
        WHERE id = ?
      `).run(now, now, id)

      if (result.changes === 0) {
        // Insert new
        const title = getTitleFromPath(projectPath)
        db.chat.prepare(`
          INSERT INTO claude_projects (
            id, project_path, title, session_count,
            last_interacted_at, created_at, updated_at
          ) VALUES (?, ?, ?, 0, ?, ?, ?)
        `).run(id, projectPath, title, now, now, now)
      }

      return Result.ok(id)
    } catch (error) {
      log.error('Failed to record interaction by path', error instanceof Error ? error : undefined, { projectPath })
      return Result.err(Errors.db.queryFailed('UPSERT claude_project', error instanceof Error ? error : undefined))
    }
  },

  /**
   * Pin a project
   */
  pinProject(id: string): Result<boolean> {
    try {
      const result = db.chat.prepare(`
        UPDATE claude_projects SET is_pinned = 1, updated_at = datetime('now') WHERE id = ?
      `).run(id)
      return Result.ok(result.changes > 0)
    } catch (error) {
      log.error('Failed to pin Claude project', error instanceof Error ? error : undefined, { id })
      return Result.err(Errors.db.queryFailed('PIN claude_project', error instanceof Error ? error : undefined))
    }
  },

  /**
   * Unpin a project
   */
  unpinProject(id: string): Result<boolean> {
    try {
      const result = db.chat.prepare(`
        UPDATE claude_projects SET is_pinned = 0, updated_at = datetime('now') WHERE id = ?
      `).run(id)
      return Result.ok(result.changes > 0)
    } catch (error) {
      log.error('Failed to unpin Claude project', error instanceof Error ? error : undefined, { id })
      return Result.err(Errors.db.queryFailed('UNPIN claude_project', error instanceof Error ? error : undefined))
    }
  },

  /**
   * Archive a project
   */
  archiveProject(id: string): Result<boolean> {
    try {
      const result = db.chat.prepare(`
        UPDATE claude_projects SET is_archived = 1, updated_at = datetime('now') WHERE id = ?
      `).run(id)
      return Result.ok(result.changes > 0)
    } catch (error) {
      log.error('Failed to archive Claude project', error instanceof Error ? error : undefined, { id })
      return Result.err(Errors.db.queryFailed('ARCHIVE claude_project', error instanceof Error ? error : undefined))
    }
  },

  /**
   * Unarchive a project
   */
  unarchiveProject(id: string): Result<boolean> {
    try {
      const result = db.chat.prepare(`
        UPDATE claude_projects SET is_archived = 0, updated_at = datetime('now') WHERE id = ?
      `).run(id)
      return Result.ok(result.changes > 0)
    } catch (error) {
      log.error('Failed to unarchive Claude project', error instanceof Error ? error : undefined, { id })
      return Result.err(Errors.db.queryFailed('UNARCHIVE claude_project', error instanceof Error ? error : undefined))
    }
  },

  /**
   * Rename a project
   */
  renameProject(id: string, title: string): Result<boolean> {
    try {
      const result = db.chat.prepare(`
        UPDATE claude_projects SET title = ?, updated_at = datetime('now') WHERE id = ?
      `).run(title, id)
      return Result.ok(result.changes > 0)
    } catch (error) {
      log.error('Failed to rename Claude project', error instanceof Error ? error : undefined, { id })
      return Result.err(Errors.db.queryFailed('RENAME claude_project', error instanceof Error ? error : undefined))
    }
  },

  /**
   * Delete a project (from database only, not filesystem)
   */
  deleteProject(id: string): Result<boolean> {
    try {
      const result = db.chat.prepare(`
        DELETE FROM claude_projects WHERE id = ?
      `).run(id)
      return Result.ok(result.changes > 0)
    } catch (error) {
      log.error('Failed to delete Claude project', error instanceof Error ? error : undefined, { id })
      return Result.err(Errors.db.queryFailed('DELETE claude_project', error instanceof Error ? error : undefined))
    }
  },
}
