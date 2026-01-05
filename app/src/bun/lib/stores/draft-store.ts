// =============================================================================
// DRAFT STORE
// =============================================================================
// Persists in-progress input drafts across sessions.

import { db } from '../db'
import { Result, Errors, logger } from '../core'
import type { ProjectType } from './chat-store.types'

const log = logger.child({ module: 'draft-store' })

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface Draft {
  projectId: string
  projectType: ProjectType
  content: string
  selectedModel?: string
  attachments?: unknown[]
  metadata?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface SaveDraftInput {
  projectId: string
  projectType: ProjectType
  content?: string
  selectedModel?: string
  attachments?: unknown[]
  metadata?: Record<string, unknown>
}

interface DraftRow {
  project_id: string
  project_type: string
  content: string
  selected_model: string | null
  attachments: string | null
  metadata: string | null
  created_at: string
  updated_at: string
}

// -----------------------------------------------------------------------------
// Row Converter
// -----------------------------------------------------------------------------

function rowToDraft(row: DraftRow): Draft {
  return {
    projectId: row.project_id,
    projectType: row.project_type as ProjectType,
    content: row.content,
    selectedModel: row.selected_model ?? undefined,
    attachments: row.attachments ? JSON.parse(row.attachments) : undefined,
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// -----------------------------------------------------------------------------
// Draft Store
// -----------------------------------------------------------------------------

export const DraftStore = {
  /**
   * Get a draft by project ID
   */
  getDraft(projectId: string): Result<Draft | null> {
    try {
      const row = db.app
        .prepare('SELECT * FROM drafts WHERE project_id = ?')
        .get(projectId) as DraftRow | null

      return Result.ok(row ? rowToDraft(row) : null)
    } catch (error) {
      log.error('Failed to get draft', error instanceof Error ? error : undefined, { projectId })
      return Result.err(Errors.db.queryFailed('SELECT draft', error instanceof Error ? error : undefined))
    }
  },

  /**
   * Save or update a draft (upsert)
   */
  saveDraft(input: SaveDraftInput): Result<Draft> {
    try {
      const now = new Date().toISOString()

      // Check if draft exists
      const existing = db.app
        .prepare('SELECT created_at FROM drafts WHERE project_id = ?')
        .get(input.projectId) as { created_at: string } | null

      const createdAt = existing?.created_at ?? now

      db.app.prepare(`
        INSERT INTO drafts (project_id, project_type, content, selected_model, attachments, metadata, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(project_id) DO UPDATE SET
          content = excluded.content,
          selected_model = excluded.selected_model,
          attachments = excluded.attachments,
          metadata = excluded.metadata,
          updated_at = excluded.updated_at
      `).run(
        input.projectId,
        input.projectType,
        input.content ?? '',
        input.selectedModel ?? null,
        input.attachments ? JSON.stringify(input.attachments) : null,
        input.metadata ? JSON.stringify(input.metadata) : null,
        createdAt,
        now
      )

      log.debug('Draft saved', { projectId: input.projectId, projectType: input.projectType })

      return Result.ok({
        projectId: input.projectId,
        projectType: input.projectType,
        content: input.content ?? '',
        selectedModel: input.selectedModel,
        attachments: input.attachments,
        metadata: input.metadata,
        createdAt,
        updatedAt: now,
      })
    } catch (error) {
      log.error('Failed to save draft', error instanceof Error ? error : undefined, { projectId: input.projectId })
      return Result.err(Errors.db.queryFailed('UPSERT draft', error instanceof Error ? error : undefined))
    }
  },

  /**
   * Delete a draft
   */
  deleteDraft(projectId: string): Result<boolean> {
    try {
      const result = db.app
        .prepare('DELETE FROM drafts WHERE project_id = ?')
        .run(projectId)

      log.debug('Draft deleted', { projectId, deleted: result.changes > 0 })
      return Result.ok(result.changes > 0)
    } catch (error) {
      log.error('Failed to delete draft', error instanceof Error ? error : undefined, { projectId })
      return Result.err(Errors.db.queryFailed('DELETE draft', error instanceof Error ? error : undefined))
    }
  },

  /**
   * List drafts, optionally filtered by project type
   */
  listDrafts(projectType?: ProjectType): Result<Draft[]> {
    try {
      let query = 'SELECT * FROM drafts'
      const params: unknown[] = []

      if (projectType) {
        query += ' WHERE project_type = ?'
        params.push(projectType)
      }

      query += ' ORDER BY updated_at DESC'

      const rows = db.app.prepare(query).all(...params) as DraftRow[]

      return Result.ok(rows.map(rowToDraft))
    } catch (error) {
      log.error('Failed to list drafts', error instanceof Error ? error : undefined)
      return Result.err(Errors.db.queryFailed('SELECT drafts', error instanceof Error ? error : undefined))
    }
  },

  /**
   * Clean up old drafts (older than specified date)
   */
  cleanupOldDrafts(olderThan: Date): Result<number> {
    try {
      const result = db.app
        .prepare('DELETE FROM drafts WHERE updated_at < ?')
        .run(olderThan.toISOString())

      log.info('Old drafts cleaned up', { deleted: result.changes, olderThan: olderThan.toISOString() })
      return Result.ok(result.changes)
    } catch (error) {
      log.error('Failed to cleanup old drafts', error instanceof Error ? error : undefined)
      return Result.err(Errors.db.queryFailed('DELETE old drafts', error instanceof Error ? error : undefined))
    }
  },
}
