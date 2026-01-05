// =============================================================================
// DRAFT HANDLERS
// =============================================================================
// WebSocket handlers for draft persistence.

import { DraftStore, type SaveDraftInput } from '../../stores/draft-store'
import { logger } from '../../core'
import type { ProjectType } from '../../stores/chat-store.types'

const log = logger.child({ module: 'ws-drafts' })

interface WSServer {
  onRequest(channel: string, handler: (payload: unknown) => Promise<unknown>): void
  broadcast(channel: string, data: unknown): void
}

/**
 * Register draft handlers with the WebSocket server
 */
export function registerDraftHandlers(wsServer: WSServer): void {
  // Get a draft by project ID
  wsServer.onRequest('draft:get', async (payload) => {
    const { projectId } = payload as { projectId: string }

    const result = DraftStore.getDraft(projectId)

    if (!result.ok) {
      throw new Error(result.error.message)
    }

    return result.value
  })

  // Save or update a draft
  wsServer.onRequest('draft:save', async (payload) => {
    const input = payload as SaveDraftInput

    log.debug('Saving draft', { projectId: input.projectId, projectType: input.projectType })
    const result = DraftStore.saveDraft(input)

    if (!result.ok) {
      throw new Error(result.error.message)
    }

    return result.value
  })

  // Delete a draft
  wsServer.onRequest('draft:delete', async (payload) => {
    const { projectId } = payload as { projectId: string }

    log.debug('Deleting draft', { projectId })
    const result = DraftStore.deleteDraft(projectId)

    if (!result.ok) {
      throw new Error(result.error.message)
    }

    return { success: result.value }
  })

  // List drafts (optionally by project type)
  wsServer.onRequest('draft:list', async (payload) => {
    const { projectType } = (payload || {}) as { projectType?: ProjectType }

    const result = DraftStore.listDrafts(projectType)

    if (!result.ok) {
      throw new Error(result.error.message)
    }

    return result.value
  })
}
