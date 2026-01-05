// =============================================================================
// PROJECT HANDLERS
// =============================================================================
// WebSocket handlers for unified project management.

import { ProjectStore } from '../../stores/project-store'
import { logger } from '../../core'
import type { ProjectType, ListProjectsOptions } from '../../stores/chat-store.types'

const log = logger.child({ module: 'ws-projects' })

interface WSServer {
  onRequest(channel: string, handler: (payload: unknown) => Promise<unknown>): void
  broadcast(channel: string, data: unknown): void
}

/**
 * Register project handlers with the WebSocket server
 */
export function registerProjectHandlers(wsServer: WSServer): void {
  // ---------------------------------------------------------------------------
  // Project Queries
  // ---------------------------------------------------------------------------

  // List all projects across types
  wsServer.onRequest('project:list', async (payload) => {
    const options = payload as ListProjectsOptions | undefined

    const result = ProjectStore.listProjects(options)

    if (!result.ok) {
      throw new Error(result.error.message)
    }

    return result.value
  })

  // ---------------------------------------------------------------------------
  // Project Actions
  // ---------------------------------------------------------------------------

  // Pin a project
  wsServer.onRequest('project:pin', async (payload) => {
    const { id, type } = payload as { id: string; type: ProjectType }

    log.info('Pinning project', { id, type })
    const result = ProjectStore.pinProject(id, type)

    if (!result.ok) {
      throw new Error(result.error.message)
    }

    if (result.value) {
      wsServer.broadcast('project:pinned', { id, type })
    }

    return { success: result.value }
  })

  // Unpin a project
  wsServer.onRequest('project:unpin', async (payload) => {
    const { id, type } = payload as { id: string; type: ProjectType }

    log.info('Unpinning project', { id, type })
    const result = ProjectStore.unpinProject(id, type)

    if (!result.ok) {
      throw new Error(result.error.message)
    }

    if (result.value) {
      wsServer.broadcast('project:unpinned', { id, type })
    }

    return { success: result.value }
  })

  // Archive a project
  wsServer.onRequest('project:archive', async (payload) => {
    const { id, type } = payload as { id: string; type: ProjectType }

    log.info('Archiving project', { id, type })
    const result = ProjectStore.archiveProject(id, type)

    if (!result.ok) {
      throw new Error(result.error.message)
    }

    if (result.value) {
      wsServer.broadcast('project:archived', { id, type })
    }

    return { success: result.value }
  })

  // Unarchive a project
  wsServer.onRequest('project:unarchive', async (payload) => {
    const { id, type } = payload as { id: string; type: ProjectType }

    log.info('Unarchiving project', { id, type })
    const result = ProjectStore.unarchiveProject(id, type)

    if (!result.ok) {
      throw new Error(result.error.message)
    }

    if (result.value) {
      wsServer.broadcast('project:unarchived', { id, type })
    }

    return { success: result.value }
  })

  // Delete a project
  wsServer.onRequest('project:delete', async (payload) => {
    const { id, type } = payload as { id: string; type: ProjectType }

    log.info('Deleting project', { id, type })
    const result = ProjectStore.deleteProject(id, type)

    if (!result.ok) {
      throw new Error(result.error.message)
    }

    if (result.value) {
      wsServer.broadcast('project:deleted', { id, type })
    }

    return { success: result.value }
  })

  // Rename a project
  wsServer.onRequest('project:rename', async (payload) => {
    const { id, type, title } = payload as { id: string; type: ProjectType; title: string }

    log.info('Renaming project', { id, type, title })
    const result = ProjectStore.renameProject(id, type, title)

    if (!result.ok) {
      throw new Error(result.error.message)
    }

    if (result.value) {
      wsServer.broadcast('project:renamed', { id, type, title })
    }

    return { success: result.value }
  })

  // Record interaction (updates lastInteractedAt)
  wsServer.onRequest('project:record-interaction', async (payload) => {
    const { id, type } = payload as { id: string; type: ProjectType }

    log.debug('Recording project interaction', { id, type })
    const result = ProjectStore.recordInteraction(id, type)

    if (!result.ok) {
      throw new Error(result.error.message)
    }

    return { success: result.value }
  })
}
