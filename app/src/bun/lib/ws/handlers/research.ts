// =============================================================================
// RESEARCH WEBSOCKET HANDLERS
// =============================================================================
// Handles WebSocket requests for deep research functionality.

import { logger } from '../../core'
import { ResearchStore } from '../../stores/research-store'
import { CredentialStore } from '../../stores/credential-store'
import { ResearchOrchestrator } from '../../research'
import type { WSServer } from '../../ws-server'
import type {
  CreateSessionRequest,
  GetSessionRequest,
  ApproveSourceRequest,
  RejectSourceRequest,
  ResolveContradictionRequest,
  UpdateGuidanceRequest,
  ResearchEvent,
} from '../../stores/research-store.types'

const log = logger.child({ module: 'ws-research' })

// Active orchestrators by session ID
const activeOrchestrators = new Map<string, ResearchOrchestrator>()

export function registerResearchHandlers(wsServer: WSServer): void {
  // ---------------------------------------------------------------------------
  // SESSION MANAGEMENT
  // ---------------------------------------------------------------------------

  /**
   * Create a new research session
   */
  wsServer.onRequest('research:create-session', async (payload) => {
    const { query, depthProfile, chatId, messageId } = payload as CreateSessionRequest

    if (!query || !depthProfile) {
      throw new Error('Missing required fields: query, depthProfile')
    }

    const result = ResearchStore.createSession({
      query,
      depthProfile,
      chatId: chatId as any,
      messageId,
    })

    if (!result.ok) {
      throw new Error(result.error.message)
    }

    log.info('Research session created', { sessionId: result.value.id, query: query.slice(0, 50) })

    return { session: result.value }
  })

  /**
   * Get a research session with all data
   */
  wsServer.onRequest('research:get-session', async (payload) => {
    const { sessionId } = payload as GetSessionRequest

    if (!sessionId) {
      throw new Error('Missing required field: sessionId')
    }

    const result = ResearchStore.getSessionWithData(sessionId)

    if (!result.ok) {
      throw new Error(result.error.message)
    }

    if (!result.value) {
      throw new Error('Session not found')
    }

    return result.value
  })

  /**
   * List all research sessions
   */
  wsServer.onRequest('research:list-sessions', async (payload) => {
    const options = payload as { limit?: number; offset?: number; status?: string } | undefined

    const result = ResearchStore.listSessions(options)

    if (!result.ok) {
      throw new Error(result.error.message)
    }

    return result.value
  })

  /**
   * Start a research session
   */
  wsServer.onRequest('research:start-session', async (payload) => {
    const { sessionId } = payload as { sessionId: string }

    if (!sessionId) {
      throw new Error('Missing required field: sessionId')
    }

    // Check if already running
    if (activeOrchestrators.has(sessionId)) {
      throw new Error('Session is already running')
    }

    // Get NanoGPT API key
    const nanoGptCredential = CredentialStore.getCredential('nanogpt')
    if (!nanoGptCredential.ok || !nanoGptCredential.value?.apiKey) {
      throw new Error('NanoGPT API key not configured. Please add it in Settings > Credentials.')
    }

    // Create orchestrator
    const orchestrator = new ResearchOrchestrator({
      nanoGptApiKey: nanoGptCredential.value.apiKey,
      onEvent: (event: ResearchEvent) => {
        // Broadcast event to all clients listening for this session
        wsServer.broadcast(`research:event:${sessionId}`, event)
      },
    })

    activeOrchestrators.set(sessionId, orchestrator)

    // Start in background
    orchestrator.start(sessionId).finally(() => {
      activeOrchestrators.delete(sessionId)
    })

    log.info('Research session started', { sessionId })

    return { success: true, sessionId }
  })

  /**
   * Pause a research session
   */
  wsServer.onRequest('research:pause-session', async (payload) => {
    const { sessionId } = payload as { sessionId: string }

    const orchestrator = activeOrchestrators.get(sessionId)
    if (!orchestrator) {
      throw new Error('Session is not running')
    }

    await orchestrator.pause()

    return { success: true }
  })

  /**
   * Resume a paused research session
   */
  wsServer.onRequest('research:resume-session', async (payload) => {
    const { sessionId } = payload as { sessionId: string }

    const orchestrator = activeOrchestrators.get(sessionId)
    if (!orchestrator) {
      // Try to restart if orchestrator was cleaned up
      // Get NanoGPT API key
      const nanoGptCredential = CredentialStore.getCredential('nanogpt')
      if (!nanoGptCredential.ok || !nanoGptCredential.value?.apiKey) {
        throw new Error('NanoGPT API key not configured')
      }

      const newOrchestrator = new ResearchOrchestrator({
        nanoGptApiKey: nanoGptCredential.value.apiKey,
        onEvent: (event: ResearchEvent) => {
          wsServer.broadcast(`research:event:${sessionId}`, event)
        },
      })

      activeOrchestrators.set(sessionId, newOrchestrator)
      newOrchestrator.resume().finally(() => {
        activeOrchestrators.delete(sessionId)
      })

      return { success: true, restarted: true }
    }

    await orchestrator.resume()

    return { success: true }
  })

  /**
   * Cancel a research session
   */
  wsServer.onRequest('research:cancel-session', async (payload) => {
    const { sessionId } = payload as { sessionId: string }

    const orchestrator = activeOrchestrators.get(sessionId)
    if (orchestrator) {
      await orchestrator.cancel()
      activeOrchestrators.delete(sessionId)
    }

    // Update session status
    ResearchStore.updateSessionStatus(sessionId, 'failed')

    return { success: true }
  })

  /**
   * Delete a research session
   */
  wsServer.onRequest('research:delete-session', async (payload) => {
    const { sessionId } = payload as { sessionId: string }

    // Cancel if running
    const orchestrator = activeOrchestrators.get(sessionId)
    if (orchestrator) {
      await orchestrator.cancel()
      activeOrchestrators.delete(sessionId)
    }

    const result = ResearchStore.deleteSession(sessionId)

    if (!result.ok) {
      throw new Error(result.error.message)
    }

    return { success: result.value }
  })

  // ---------------------------------------------------------------------------
  // SOURCE MANAGEMENT
  // ---------------------------------------------------------------------------

  /**
   * Approve a source for reading
   */
  wsServer.onRequest('research:approve-source', async (payload) => {
    const { sessionId, sourceId, comment } = payload as ApproveSourceRequest

    const orchestrator = activeOrchestrators.get(sessionId)
    if (orchestrator) {
      await orchestrator.approveSource(sourceId)
    } else {
      // Direct store update if orchestrator not running
      const result = ResearchStore.approveSource(sessionId, sourceId)
      if (!result.ok) {
        throw new Error(result.error.message)
      }
    }

    // Update comment if provided
    if (comment) {
      ResearchStore.updateSource(sourceId, { userComment: comment })
    }

    return { success: true }
  })

  /**
   * Reject a source
   */
  wsServer.onRequest('research:reject-source', async (payload) => {
    const { sessionId, sourceId, reason, blockDomain } = payload as RejectSourceRequest

    const orchestrator = activeOrchestrators.get(sessionId)
    if (orchestrator) {
      await orchestrator.rejectSource(sourceId, reason, blockDomain)
    } else {
      const result = ResearchStore.rejectSource(sessionId, sourceId, reason, blockDomain)
      if (!result.ok) {
        throw new Error(result.error.message)
      }
    }

    return { success: true }
  })

  /**
   * Bulk approve all pending sources
   */
  wsServer.onRequest('research:approve-all-sources', async (payload) => {
    const { sessionId } = payload as { sessionId: string }

    const sourcesResult = ResearchStore.getSources(sessionId, { state: 'pending' })
    if (!sourcesResult.ok) {
      throw new Error(sourcesResult.error.message)
    }

    const orchestrator = activeOrchestrators.get(sessionId)
    let approved = 0

    for (const source of sourcesResult.value) {
      if (orchestrator) {
        await orchestrator.approveSource(source.id)
      } else {
        const result = ResearchStore.approveSource(sessionId, source.id)
        if (result.ok) approved++
      }
      approved++
    }

    return { success: true, approvedCount: approved }
  })

  // ---------------------------------------------------------------------------
  // CONTRADICTION MANAGEMENT
  // ---------------------------------------------------------------------------

  /**
   * Resolve a contradiction
   */
  wsServer.onRequest('research:resolve-contradiction', async (payload) => {
    const { sessionId, contradictionId, resolution, explanation } = payload as ResolveContradictionRequest

    const orchestrator = activeOrchestrators.get(sessionId)
    if (orchestrator) {
      await orchestrator.resolveContradiction(contradictionId, resolution, explanation)
    } else {
      const result = ResearchStore.resolveContradiction(contradictionId, {
        type: resolution,
        explanation,
      })
      if (!result.ok) {
        throw new Error(result.error.message)
      }
    }

    return { success: true }
  })

  // ---------------------------------------------------------------------------
  // GUIDANCE MANAGEMENT
  // ---------------------------------------------------------------------------

  /**
   * Update session guidance
   */
  wsServer.onRequest('research:update-guidance', async (payload) => {
    const { sessionId, guidance } = payload as UpdateGuidanceRequest

    const result = ResearchStore.updateSessionGuidance(sessionId, guidance)

    if (!result.ok) {
      throw new Error(result.error.message)
    }

    return { success: true }
  })

  /**
   * Add a blocked domain
   */
  wsServer.onRequest('research:block-domain', async (payload) => {
    const { sessionId, domain } = payload as { sessionId: string; domain: string }

    const sessionResult = ResearchStore.getSession(sessionId)
    if (!sessionResult.ok || !sessionResult.value) {
      throw new Error('Session not found')
    }

    const guidance = sessionResult.value.guidance
    if (!guidance.blockedDomains.includes(domain)) {
      guidance.blockedDomains.push(domain)
      ResearchStore.updateSessionGuidance(sessionId, { blockedDomains: guidance.blockedDomains })
    }

    return { success: true }
  })

  /**
   * Remove a blocked domain
   */
  wsServer.onRequest('research:unblock-domain', async (payload) => {
    const { sessionId, domain } = payload as { sessionId: string; domain: string }

    const sessionResult = ResearchStore.getSession(sessionId)
    if (!sessionResult.ok || !sessionResult.value) {
      throw new Error('Session not found')
    }

    const guidance = sessionResult.value.guidance
    guidance.blockedDomains = guidance.blockedDomains.filter(d => d !== domain)
    ResearchStore.updateSessionGuidance(sessionId, { blockedDomains: guidance.blockedDomains })

    return { success: true }
  })

  // ---------------------------------------------------------------------------
  // EXPORT
  // ---------------------------------------------------------------------------

  /**
   * Export report
   */
  wsServer.onRequest('research:export-report', async (payload) => {
    const { sessionId, format } = payload as { sessionId: string; format: 'markdown' | 'json' }

    const dataResult = ResearchStore.getSessionWithData(sessionId)
    if (!dataResult.ok || !dataResult.value) {
      throw new Error('Session not found')
    }

    const { session, sources, report } = dataResult.value

    if (!report) {
      throw new Error('Report not available')
    }

    if (format === 'json') {
      return {
        content: JSON.stringify({ session, sources, report }, null, 2),
        filename: `research-${sessionId}.json`,
      }
    }

    // Markdown format
    let markdown = `# ${report.title}\n\n`
    if (report.subtitle) {
      markdown += `*${report.subtitle}*\n\n`
    }
    markdown += `## Summary\n\n${report.summary}\n\n`

    for (const section of report.sections) {
      markdown += `${'#'.repeat(section.level + 1)} ${section.title}\n\n`
      markdown += `${section.content}\n\n`
    }

    markdown += `---\n\n`
    markdown += `*Generated from ${sources.length} sources with ${report.totalCitations} citations.*\n`

    return {
      content: markdown,
      filename: `research-${sessionId}.md`,
    }
  })

  // ---------------------------------------------------------------------------
  // UTILITY
  // ---------------------------------------------------------------------------

  /**
   * Get NanoGPT rate limit status
   */
  wsServer.onRequest('research:rate-limit-status', async () => {
    const { NanoGPTService } = await import('../../research')
    return NanoGPTService.getRateLimitStatus()
  })

  /**
   * Estimate research cost
   */
  wsServer.onRequest('research:estimate-cost', async (payload) => {
    const { depthProfile, sourceCount } = payload as { depthProfile: string; sourceCount?: number }
    const { NanoGPTService, DEPTH_PROFILE_CONFIG } = await import('../../research')

    const config = DEPTH_PROFILE_CONFIG[depthProfile as keyof typeof DEPTH_PROFILE_CONFIG]
    if (!config) {
      throw new Error('Invalid depth profile')
    }

    const estimate = NanoGPTService.estimateCost({
      webSearches: 1,
      webSearchDepth: depthProfile === 'exhaustive' ? 'deep' : 'standard',
      useBothProviders: true,
      urlScrapes: sourceCount ?? config.maxSources,
    })

    return estimate
  })

  log.info('Research handlers registered')
}
