// =============================================================================
// RESEARCH ORCHESTRATOR
// =============================================================================
// Coordinates the deep research pipeline: scouting, reading, and synthesis.
// Manages state machine transitions, event emission, and pause/resume.

import { logger } from '../core'
import { ResearchStore } from '../stores/research-store'
import {
  NanoGPTService,
  type ScoredSearchResult,
  type ScrapeResult,
  type SearchDepth,
} from './nanogpt-service'
import type {
  ResearchSession,
  ResearchStats,
  SessionStatus,
  Source,
  Finding,
  ResearchEvent,
  ResearchEventType,
  DepthProfile,
  FindingCategory,
  ContradictionClaim,
} from '../stores/research-store.types'
import {
  type SourceId,
  type ResearchSessionId,
  SourceId as toSourceId,
  DEPTH_PROFILE_CONFIG,
} from '../stores/research-store.types'

const log = logger.child({ module: 'research-orchestrator' })

// =============================================================================
// TYPES
// =============================================================================

export interface OrchestratorConfig {
  nanoGptApiKey: string
  onEvent: (event: ResearchEvent) => void
  // Optional AI synthesis config (for finding extraction and report generation)
  synthesisApiKey?: string
  synthesisProvider?: string
  synthesisModel?: string
}

interface OrchestratorState {
  sessionId: ResearchSessionId
  abortController: AbortController
  readQueue: SourceId[]
  activeReaders: Set<SourceId>
  startTime: number
  isPaused: boolean
  totalCost: number
}

// =============================================================================
// ORCHESTRATOR CLASS
// =============================================================================

export class ResearchOrchestrator {
  private config: OrchestratorConfig
  private state: OrchestratorState | null = null

  constructor(config: OrchestratorConfig) {
    this.config = config
  }

  // ---------------------------------------------------------------------------
  // LIFECYCLE
  // ---------------------------------------------------------------------------

  async start(sessionId: string): Promise<void> {
    // Get session
    const sessionResult = ResearchStore.getSession(sessionId)
    if (!sessionResult.ok || !sessionResult.value) {
      throw new Error(`Session not found: ${sessionId}`)
    }

    const session = sessionResult.value

    // Initialize state
    this.state = {
      sessionId: sessionId as ResearchSessionId,
      abortController: new AbortController(),
      readQueue: [],
      activeReaders: new Set(),
      startTime: Date.now(),
      isPaused: false,
      totalCost: 0,
    }

    log.info('Starting research orchestrator', { sessionId, query: session.query })

    try {
      // Update status to initializing
      await this.updateStatus('initializing')

      // Phase 1: Scouting
      await this.updateStatus('scouting')
      await this.runScoutingPhase(session)

      if (this.state.isPaused || this.state.abortController.signal.aborted) {
        return
      }

      // Phase 2: Reading
      await this.updateStatus('reading')
      await this.runReadingPhase(session)

      if (this.state.isPaused || this.state.abortController.signal.aborted) {
        return
      }

      // Phase 3: Synthesis
      await this.updateStatus('synthesizing')
      await this.runSynthesisPhase(session)

      // Complete
      await this.updateStatus('completed')
      this.emit('session:completed', { sessionId })

    } catch (error) {
      if (this.state.abortController.signal.aborted) {
        log.info('Research cancelled', { sessionId })
        return
      }

      log.error('Research failed', error instanceof Error ? error : undefined, { sessionId })
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      ResearchStore.updateSessionError(sessionId, errorMessage)
      this.emit('session:failed', { sessionId, error: errorMessage })
    }
  }

  async pause(): Promise<void> {
    if (!this.state) return

    this.state.isPaused = true
    await this.updateStatus('paused')
    this.emit('session:paused', { sessionId: this.state.sessionId })
    log.info('Research paused', { sessionId: this.state.sessionId })
  }

  async resume(): Promise<void> {
    if (!this.state || !this.state.isPaused) return

    this.state.isPaused = false
    this.emit('session:resumed', { sessionId: this.state.sessionId })
    log.info('Research resumed', { sessionId: this.state.sessionId })

    // Continue from where we left off
    const sessionResult = ResearchStore.getSession(this.state.sessionId)
    if (!sessionResult.ok || !sessionResult.value) return

    const session = sessionResult.value

    // Determine which phase to resume
    const stats = session.stats
    if (stats.sourcesCompleted < stats.sourcesQueued) {
      await this.updateStatus('reading')
      await this.runReadingPhase(session)
    }

    if (!this.state.isPaused && stats.sectionsCompleted < stats.sectionsTotal) {
      await this.updateStatus('synthesizing')
      await this.runSynthesisPhase(session)
    }

    if (!this.state.isPaused) {
      await this.updateStatus('completed')
      this.emit('session:completed', { sessionId: this.state.sessionId })
    }
  }

  async cancel(): Promise<void> {
    if (!this.state) return

    this.state.abortController.abort()
    log.info('Research cancelled', { sessionId: this.state.sessionId })
  }

  // ---------------------------------------------------------------------------
  // USER ACTIONS
  // ---------------------------------------------------------------------------

  async approveSource(sourceId: string): Promise<void> {
    if (!this.state) return

    const result = ResearchStore.approveSource(this.state.sessionId, sourceId)
    if (result.ok) {
      this.state.readQueue.push(toSourceId(sourceId))
      await this.updateStats({ sourcesQueued: this.state.readQueue.length })
      this.emit('source:approved', { sourceId })
    }
  }

  async rejectSource(sourceId: string, reason?: string, blockDomain?: boolean): Promise<void> {
    if (!this.state) return

    const result = ResearchStore.rejectSource(this.state.sessionId, sourceId, reason, blockDomain)
    if (result.ok) {
      const statsResult = ResearchStore.getSession(this.state.sessionId)
      if (statsResult.ok && statsResult.value) {
        await this.updateStats({ sourcesRejected: statsResult.value.stats.sourcesRejected + 1 })
      }
      this.emit('source:rejected', { sourceId, reason, domainBlocked: blockDomain })
    }
  }

  async resolveContradiction(contradictionId: string, resolution: string, explanation?: string): Promise<void> {
    if (!this.state) return

    const result = ResearchStore.resolveContradiction(contradictionId, {
      type: resolution as any,
      explanation,
    })

    if (result.ok) {
      const statsResult = ResearchStore.getSession(this.state.sessionId)
      if (statsResult.ok && statsResult.value) {
        await this.updateStats({
          contradictionsResolved: statsResult.value.stats.contradictionsResolved + 1,
        })
      }
      this.emit('contradiction:resolved', { contradictionId, resolution })
    }
  }

  // ---------------------------------------------------------------------------
  // SCOUTING PHASE
  // ---------------------------------------------------------------------------

  private async runScoutingPhase(session: ResearchSession): Promise<void> {
    if (!this.state) return

    const config = session.config
    const guidance = session.guidance
    const depth: SearchDepth = session.depthProfile === 'exhaustive' ? 'deep' : 'standard'

    log.info('Starting scouting phase', {
      sessionId: this.state.sessionId,
      maxSources: config.maxSources,
      depth,
    })

    // Build exclude domains list
    const excludeDomains = [...guidance.blockedDomains]

    // Run multi-provider search
    const searchResult = await NanoGPTService.multiProviderSearch(
      {
        query: session.query,
        depth,
        useProviders: ['linkup', 'tavily'],
        excludeDomains,
        includeDomains: guidance.preferredDomains.length > 0 ? guidance.preferredDomains : undefined,
      },
      this.config.nanoGptApiKey,
      this.state.abortController.signal
    )

    if (!searchResult.ok) {
      throw new Error(`Search failed: ${searchResult.error.message}`)
    }

    // Track cost
    const costEstimate = NanoGPTService.estimateCost({
      webSearches: 1,
      webSearchDepth: depth,
      useBothProviders: true,
    })
    this.state.totalCost += costEstimate.totalUsd

    // Process search results
    const results = searchResult.value.slice(0, config.maxSources)
    let sourcesDiscovered = 0

    for (const result of results) {
      if (this.state.isPaused || this.state.abortController.signal.aborted) {
        break
      }

      // Add source to store
      const sourceResult = ResearchStore.addSource({
        sessionId: this.state.sessionId,
        url: result.url,
        title: result.title,
        domain: result.domain,
        snippet: result.snippet,
        discoveredBy: 'scout-1',
        providers: result.providers,
        relevanceScore: result.finalScore,
        credibilityScore: result.providers.length > 1 ? 0.7 : 0.5,  // Boost if found by both
        providerBoost: result.providerBoost,
      })

      if (sourceResult.ok) {
        sourcesDiscovered++

        // Emit discovery event
        this.emit('source:discovered', {
          source: sourceResult.value,
          providers: result.providers,
        })

        // Auto-approve if enabled and score is high enough
        if (config.autoApprove && result.finalScore >= config.autoApproveThreshold) {
          await this.approveSource(sourceResult.value.id)
        }
      }
    }

    await this.updateStats({
      sourcesSearched: sourcesDiscovered,
      estimatedCostUsd: this.state.totalCost,
    })

    log.info('Scouting phase complete', {
      sessionId: this.state.sessionId,
      sourcesDiscovered,
      autoApproved: this.state.readQueue.length,
    })
  }

  // ---------------------------------------------------------------------------
  // READING PHASE
  // ---------------------------------------------------------------------------

  private async runReadingPhase(session: ResearchSession): Promise<void> {
    if (!this.state) return

    const config = session.config

    log.info('Starting reading phase', {
      sessionId: this.state.sessionId,
      queuedSources: this.state.readQueue.length,
      maxConcurrent: config.maxConcurrentReaders,
    })

    // Process sources with concurrency limit
    while (this.state.readQueue.length > 0 || this.state.activeReaders.size > 0) {
      if (this.state.isPaused || this.state.abortController.signal.aborted) {
        break
      }

      // Start new readers up to limit
      while (
        this.state.readQueue.length > 0 &&
        this.state.activeReaders.size < config.maxConcurrentReaders
      ) {
        const sourceId = this.state.readQueue.shift()!
        this.state.activeReaders.add(sourceId)

        // Start reading in background
        this.readSource(sourceId).finally(() => {
          this.state?.activeReaders.delete(sourceId)
        })
      }

      // Update stats
      await this.updateStats({
        sourcesQueued: this.state.readQueue.length,
        sourcesReading: this.state.activeReaders.size,
        activeReaders: this.state.activeReaders.size,
      })

      // Wait a bit before checking again
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    log.info('Reading phase complete', { sessionId: this.state.sessionId })
  }

  private async readSource(sourceId: SourceId): Promise<void> {
    if (!this.state) return

    const sourceResult = ResearchStore.getSource(sourceId)
    if (!sourceResult.ok || !sourceResult.value) return

    const source = sourceResult.value

    // Emit reading started
    this.emit('source:reading-started', { sourceId, url: source.url })

    // Update state to reading
    ResearchStore.updateSource(sourceId, {
      state: 'reading',
      readStage: 'fetching',
      readProgress: 0,
    })

    this.emit('source:reading-progress', {
      sourceId,
      stage: 'fetching',
      progress: 0.1,
    })

    try {
      const startTime = Date.now()
      let content: string
      let title: string | undefined

      // Check if YouTube
      if (NanoGPTService.isYouTubeUrl(source.url)) {
        const result = await NanoGPTService.transcribeYoutube(
          { urls: [source.url] },
          this.config.nanoGptApiKey,
          this.state.abortController.signal
        )

        if (!result.ok || !result.value[0]?.success) {
          throw new Error(result.ok ? result.value[0]?.error : result.error.message)
        }

        content = result.value[0].transcript!
        title = result.value[0].title
        this.state.totalCost += 0.01  // YouTube cost
      } else {
        // Regular URL scraping
        const result = await NanoGPTService.scrapeUrls(
          { urls: [source.url] },
          this.config.nanoGptApiKey,
          this.state.abortController.signal
        )

        if (!result.ok || !result.value[0]?.success) {
          throw new Error(result.ok ? result.value[0]?.error : result.error.message)
        }

        content = result.value[0].markdown || result.value[0].content || ''
        title = result.value[0].title
        this.state.totalCost += 0.001  // Scrape cost
      }

      // Update progress - parsing
      ResearchStore.updateSource(sourceId, {
        readStage: 'parsing',
        readProgress: 0.3,
      })
      this.emit('source:reading-progress', { sourceId, stage: 'parsing', progress: 0.3 })

      // Update progress - extracting
      ResearchStore.updateSource(sourceId, {
        readStage: 'extracting',
        readProgress: 0.6,
      })
      this.emit('source:reading-progress', { sourceId, stage: 'extracting', progress: 0.6 })

      // Extract findings (simplified - in production would use AI)
      const findings = await this.extractFindings(sourceId, content)

      // Complete
      const readTimeMs = Date.now() - startTime
      ResearchStore.updateSource(sourceId, {
        state: 'complete',
        readStage: 'complete',
        readProgress: 1,
        content,
        title: title || source.title,
        readTimeMs,
        tokenCount: Math.ceil(content.length / 4),  // Rough estimate
        completedAt: new Date().toISOString(),
      })

      // Update stats
      const statsResult = ResearchStore.getSession(this.state.sessionId)
      if (statsResult.ok && statsResult.value) {
        await this.updateStats({
          sourcesCompleted: statsResult.value.stats.sourcesCompleted + 1,
          sourcesRead: statsResult.value.stats.sourcesRead + 1,
          findingsExtracted: statsResult.value.stats.findingsExtracted + findings.length,
          estimatedCostUsd: this.state.totalCost,
        })
      }

      this.emit('source:completed', {
        sourceId,
        findingsCount: findings.length,
        readTimeMs,
      })

      log.debug('Source reading complete', { sourceId, findingsCount: findings.length, readTimeMs })

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      ResearchStore.updateSource(sourceId, {
        state: 'failed',
        error: errorMessage,
      })

      const statsResult = ResearchStore.getSession(this.state.sessionId)
      if (statsResult.ok && statsResult.value) {
        await this.updateStats({
          sourcesFailed: statsResult.value.stats.sourcesFailed + 1,
        })
      }

      this.emit('source:failed', { sourceId, error: errorMessage })
      log.warn('Source reading failed', { sourceId, error: errorMessage })
    }
  }

  private async extractFindings(sourceId: SourceId, content: string): Promise<Finding[]> {
    if (!this.state) return []

    // Simplified extraction - in production would use AI with structured output
    // For now, extract paragraphs as potential findings
    const findings: Finding[] = []
    const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 50)

    // Take top paragraphs as findings (max 5)
    for (let i = 0; i < Math.min(paragraphs.length, 5); i++) {
      const paragraph = paragraphs[i].trim()
      if (paragraph.length < 50) continue

      const findingResult = ResearchStore.addFinding({
        sourceId,
        sessionId: this.state.sessionId,
        content: paragraph.slice(0, 500),
        category: this.categorizeContent(paragraph),
        confidence: 0.6,
        importance: 0.5,
        originalText: paragraph.slice(0, 200),
      })

      if (findingResult.ok) {
        findings.push(findingResult.value)
        this.emit('finding:extracted', { finding: findingResult.value })
      }
    }

    return findings
  }

  private categorizeContent(text: string): FindingCategory {
    // Simple heuristics for categorization
    const lower = text.toLowerCase()

    if (/\d+%|\d+\.\d+|statistics?|data|survey|study found/i.test(lower)) {
      return 'statistic'
    }
    if (/according to|said|stated|".*"/i.test(lower)) {
      return 'quote'
    }
    if (/defined as|refers to|is a|means/i.test(lower)) {
      return 'definition'
    }
    if (/method|approach|technique|procedure/i.test(lower)) {
      return 'methodology'
    }
    if (/conclude|therefore|thus|in conclusion/i.test(lower)) {
      return 'conclusion'
    }
    if (/for example|such as|instance/i.test(lower)) {
      return 'example'
    }
    if (/background|history|previously|originally/i.test(lower)) {
      return 'background'
    }

    return 'claim'
  }

  // ---------------------------------------------------------------------------
  // SYNTHESIS PHASE
  // ---------------------------------------------------------------------------

  private async runSynthesisPhase(session: ResearchSession): Promise<void> {
    if (!this.state) return

    log.info('Starting synthesis phase', { sessionId: this.state.sessionId })

    // Get all findings
    const findingsResult = ResearchStore.getSessionFindings(this.state.sessionId)
    if (!findingsResult.ok) {
      throw new Error('Failed to get findings for synthesis')
    }

    const findings = findingsResult.value

    // Create report
    const reportResult = ResearchStore.createReport({
      sessionId: this.state.sessionId,
      title: `Research Report: ${session.query}`,
      summary: `Research findings for: ${session.query}`,
    })

    if (!reportResult.ok) {
      throw new Error('Failed to create report')
    }

    const report = reportResult.value

    // Generate sections based on finding categories
    const categories = [...new Set(findings.map(f => f.category))]
    const sectionsTotal = categories.length + 2  // +2 for intro and conclusion

    await this.updateStats({ sectionsTotal })

    // Introduction section
    await this.generateSection(report.id, 1, 'Introduction', findings.slice(0, 3))

    // Category sections
    let sectionOrder = 2
    for (const category of categories) {
      if (this.state.isPaused || this.state.abortController.signal.aborted) {
        break
      }

      const categoryFindings = findings.filter(f => f.category === category)
      const title = this.categoryToTitle(category)
      await this.generateSection(report.id, sectionOrder++, title, categoryFindings)
    }

    // Conclusion section
    if (!this.state.isPaused && !this.state.abortController.signal.aborted) {
      await this.generateSection(report.id, sectionOrder, 'Conclusion', findings.slice(-3))
    }

    // Complete report
    if (!this.state.isPaused && !this.state.abortController.signal.aborted) {
      ResearchStore.completeReport(this.state.sessionId)
      this.emit('report:completed', { reportId: report.id })
    }

    log.info('Synthesis phase complete', { sessionId: this.state.sessionId })
  }

  private async generateSection(
    reportId: string,
    order: number,
    title: string,
    findings: Finding[]
  ): Promise<void> {
    if (!this.state) return

    this.emit('report:section-started', { reportId, title, order })

    // Add section
    const sectionResult = ResearchStore.addReportSection({
      reportId: reportId as any,
      order,
      title,
      level: 1,
    })

    if (!sectionResult.ok) return

    const section = sectionResult.value

    // Generate content (simplified - in production would use AI)
    let content = `## ${title}\n\n`

    for (const finding of findings) {
      content += `${finding.content}\n\n`
    }

    // Update section with content
    ResearchStore.updateReportSection(section.id, {
      content,
      status: 'complete',
      wordCount: content.split(/\s+/).length,
      findingsUsed: findings.length,
    })

    // Update stats
    const statsResult = ResearchStore.getSession(this.state.sessionId)
    if (statsResult.ok && statsResult.value) {
      const progress = Math.round(
        ((statsResult.value.stats.sectionsCompleted + 1) / statsResult.value.stats.sectionsTotal) * 100
      )
      await this.updateStats({
        sectionsCompleted: statsResult.value.stats.sectionsCompleted + 1,
        reportProgress: progress,
      })
    }

    this.emit('report:section-completed', {
      reportId,
      sectionId: section.id,
      title,
    })
  }

  private categoryToTitle(category: FindingCategory): string {
    const titles: Record<FindingCategory, string> = {
      statistic: 'Key Statistics',
      claim: 'Main Claims',
      quote: 'Notable Quotes',
      definition: 'Definitions',
      methodology: 'Methodology',
      conclusion: 'Conclusions',
      background: 'Background',
      example: 'Examples',
    }
    return titles[category] || category
  }

  // ---------------------------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------------------------

  private async updateStatus(status: SessionStatus): Promise<void> {
    if (!this.state) return
    ResearchStore.updateSessionStatus(this.state.sessionId, status)
  }

  private async updateStats(stats: Partial<ResearchStats>): Promise<void> {
    if (!this.state) return

    // Add elapsed time
    const elapsedMs = Date.now() - this.state.startTime
    const updatedStats = {
      ...stats,
      elapsedMs,
      elapsedTime: elapsedMs,
    }

    ResearchStore.updateSessionStats(this.state.sessionId, updatedStats)
    this.emit('session:stats-updated', { stats: updatedStats })
  }

  private emit<T>(type: ResearchEventType, data: T): void {
    if (!this.state) return

    const event: ResearchEvent<T> = {
      type,
      sessionId: this.state.sessionId,
      timestamp: Date.now(),
      data,
    }

    this.config.onEvent(event)
  }
}
