// =============================================================================
// RESEARCH STORE
// =============================================================================
// SQLite-backed storage for deep research sessions, sources, findings,
// contradictions, and reports.

import { db } from '../db'
import { Result, Errors, logger, type ChatId } from '../core'
import {
  type ResearchSession,
  type ResearchStats,
  type ResearchConfig,
  type SessionGuidance,
  type Source,
  type SourceState,
  type Finding,
  type Contradiction,
  type Report,
  type ReportSection,
  type Citation,
  type TOCEntry,
  type SessionStatus,
  type DepthProfile,
  DEPTH_PROFILE_CONFIG,
  // Row types
  type ResearchSessionRow,
  type SourceRow,
  type FindingRow,
  type ContradictionRow,
  type ReportRow,
  type ReportSectionRow,
  // Input types
  type CreateSessionInput,
  type CreateSourceInput,
  type UpdateSourceInput,
  type CreateFindingInput,
  type CreateContradictionInput,
  type ResolveContradictionInput,
  type CreateReportInput,
  type CreateReportSectionInput,
  type UpdateReportSectionInput,
  // Query options
  type ListSessionsOptions,
  type ListSourcesOptions,
  // Result types
  type SessionWithData,
  type SessionListResult,
  // ID types
  type ResearchSessionId,
  type SourceId,
  type FindingId,
  type ContradictionId,
  type ReportId,
  type ReportSectionId,
  newResearchSessionId,
  newSourceId,
  newFindingId,
  newContradictionId,
  newReportId,
  newReportSectionId,
} from './research-store.types'

const log = logger.child({ module: 'research-store' })

// =============================================================================
// ROW CONVERTERS
// =============================================================================

function rowToSession(row: ResearchSessionRow): ResearchSession {
  return {
    id: row.id,
    query: row.query,
    depthProfile: row.depth_profile as DepthProfile,
    status: row.status as SessionStatus,
    config: JSON.parse(row.config) as ResearchConfig,
    guidance: JSON.parse(row.guidance) as SessionGuidance,
    stats: JSON.parse(row.stats) as ResearchStats,
    chatId: row.chat_id ?? undefined,
    messageId: row.message_id ?? undefined,
    error: row.error ?? undefined,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
    startedAt: row.started_at ? new Date(row.started_at).getTime() : undefined,
    completedAt: row.completed_at ? new Date(row.completed_at).getTime() : undefined,
  }
}

function rowToSource(row: SourceRow, findings: Finding[] = []): Source {
  return {
    id: row.id,
    sessionId: row.session_id,
    url: row.url,
    title: row.title ?? '',
    domain: row.domain,
    path: row.path ?? '',
    favicon: row.favicon ?? undefined,
    thumbnail: row.thumbnail ?? undefined,
    snippet: row.snippet ?? undefined,
    type: row.source_type as Source['type'],
    publishedAt: row.published_at ? new Date(row.published_at).getTime() : undefined,
    author: row.author ?? undefined,
    bias: row.bias as Source['bias'],
    state: row.state as SourceState,
    stateChangedAt: new Date(row.state_changed_at).getTime(),
    discoveredBy: row.discovered_by ?? '',
    readBy: row.read_by ?? undefined,
    relevanceScore: row.relevance_score,
    credibilityScore: row.credibility_score,
    freshnessScore: row.freshness_score,
    readProgress: row.read_progress ?? undefined,
    readStage: row.read_stage as Source['readStage'] ?? undefined,
    findings,
    readTimeMs: row.read_time_ms ?? undefined,
    tokenCount: row.token_count ?? undefined,
    userComment: row.user_comment ?? undefined,
    rejectionReason: row.rejection_reason ?? undefined,
    error: row.error ?? undefined,
    discoveredAt: new Date(row.discovered_at).getTime(),
    approvedAt: row.approved_at ? new Date(row.approved_at).getTime() : undefined,
    completedAt: row.completed_at ? new Date(row.completed_at).getTime() : undefined,
  }
}

function rowToFinding(row: FindingRow): Finding {
  return {
    id: row.id,
    sourceId: row.source_id,
    sessionId: row.session_id,
    content: row.content,
    category: row.category as Finding['category'],
    confidence: row.confidence,
    importance: row.importance,
    pageNumber: row.page_number ?? undefined,
    paragraph: row.paragraph ?? undefined,
    originalText: row.original_text ?? undefined,
    extractedAt: new Date(row.extracted_at).getTime(),
  }
}

function rowToContradiction(row: ContradictionRow): Contradiction {
  const contradiction: Contradiction = {
    id: row.id,
    sessionId: row.session_id,
    claimA: JSON.parse(row.claim_a),
    claimB: JSON.parse(row.claim_b),
    status: row.status as Contradiction['status'],
    topic: row.topic ?? '',
    severity: row.severity as Contradiction['severity'],
    detectedAt: new Date(row.detected_at).getTime(),
  }

  if (row.resolution) {
    contradiction.resolution = JSON.parse(row.resolution)
  }

  return contradiction
}

function rowToReport(row: ReportRow, sections: ReportSection[] = []): Report {
  return {
    id: row.id,
    sessionId: row.session_id,
    title: row.title,
    subtitle: row.subtitle ?? undefined,
    summary: row.summary ?? '',
    sections,
    tableOfContents: JSON.parse(row.table_of_contents) as TOCEntry[],
    totalWordCount: row.total_word_count,
    totalCitations: row.total_citations,
    totalContradictions: row.total_contradictions,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
    completedAt: row.completed_at ? new Date(row.completed_at).getTime() : undefined,
  }
}

function rowToReportSection(row: ReportSectionRow): ReportSection {
  return {
    id: row.id,
    reportId: row.report_id,
    order: row.section_order,
    level: row.level,
    title: row.title,
    content: row.content ?? '',
    summary: row.summary ?? undefined,
    citations: JSON.parse(row.citations) as Citation[],
    contradictions: JSON.parse(row.contradictions) as Contradiction[],
    wordCount: row.word_count,
    findingsUsed: row.findings_used,
    status: row.status as ReportSection['status'],
    generatedAt: row.generated_at ? new Date(row.generated_at).getTime() : undefined,
  }
}

// =============================================================================
// DEFAULT VALUES
// =============================================================================

function getDefaultConfig(depthProfile: DepthProfile): ResearchConfig {
  const profile = DEPTH_PROFILE_CONFIG[depthProfile]

  // Adjust defaults based on depth profile
  const isExhaustive = depthProfile === 'exhaustive'
  const isLight = depthProfile === 'light'

  return {
    // Source limits
    maxSources: profile.maxSources,
    maxConcurrentReaders: profile.maxConcurrentReaders,
    maxConcurrentScouts: isExhaustive ? 5 : isLight ? 2 : 3,
    timeoutPerSourceMs: isExhaustive ? 60000 : 30000,

    // Auto-approval (exhaustive enables by default for efficiency)
    autoApprove: isExhaustive,
    autoApproveThreshold: 0.7,

    // Search providers (exhaustive uses both for better coverage)
    searchProvider: isExhaustive ? 'both' : 'linkup',
    searchDepth: isExhaustive ? 'deep' : 'standard',

    // Source preferences
    sourceTypePreference: 'any',
    freshnessPreference: 'any',

    // Synthesis options
    useLiveSynthesis: false,
    synthesisModel: undefined,

    // Scoring weights (balanced by default)
    relevanceWeight: 0.5,
    credibilityWeight: 0.3,
    freshnessWeight: 0.2,
  }
}

function getDefaultStats(): ResearchStats {
  return {
    sourcesSearched: 0,
    sourcesQueued: 0,
    sourcesReading: 0,
    sourcesCompleted: 0,
    sourcesRejected: 0,
    sourcesFailed: 0,
    sourcesRead: 0,
    findingsExtracted: 0,
    contradictionsFound: 0,
    contradictionsResolved: 0,
    sectionsCompleted: 0,
    sectionsTotal: 0,
    elapsedMs: 0,
    elapsedTime: 0,
    reportProgress: 0,
    estimatedCostUsd: 0,
    activeScouts: 0,
    activeReaders: 0,
  }
}

function getDefaultGuidance(): SessionGuidance {
  return {
    userNotes: [],
    blockedDomains: [],
    preferredDomains: [],
    learnedPatterns: [],
  }
}

// =============================================================================
// RESEARCH STORE
// =============================================================================

export const ResearchStore = {
  // ---------------------------------------------------------------------------
  // SESSION OPERATIONS
  // ---------------------------------------------------------------------------

  createSession(input: CreateSessionInput): Result<ResearchSession> {
    try {
      const id = newResearchSessionId()
      const now = new Date().toISOString()
      const config = { ...getDefaultConfig(input.depthProfile), ...input.config }
      const stats = getDefaultStats()
      const defaultGuidance = getDefaultGuidance()
      const guidance = input.guidance
        ? {
            ...defaultGuidance,
            ...input.guidance,
            // Merge arrays rather than replace
            blockedDomains: [...defaultGuidance.blockedDomains, ...(input.guidance.blockedDomains ?? [])],
            preferredDomains: [...defaultGuidance.preferredDomains, ...(input.guidance.preferredDomains ?? [])],
          }
        : defaultGuidance

      db.chat.prepare(`
        INSERT INTO research_sessions (
          id, query, depth_profile, status, config, guidance, stats,
          chat_id, message_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        input.query,
        input.depthProfile,
        'idle',
        JSON.stringify(config),
        JSON.stringify(guidance),
        JSON.stringify(stats),
        input.chatId ?? null,
        input.messageId ?? null,
        now,
        now
      )

      log.info('Research session created', { sessionId: id, query: input.query.slice(0, 50) })

      return Result.ok({
        id,
        query: input.query,
        depthProfile: input.depthProfile,
        status: 'idle',
        config,
        guidance,
        stats,
        chatId: input.chatId,
        messageId: input.messageId,
        createdAt: new Date(now).getTime(),
        updatedAt: new Date(now).getTime(),
      })
    } catch (error) {
      log.error('Failed to create research session', error instanceof Error ? error : undefined)
      return Result.err(Errors.db.queryFailed('INSERT research_sessions', error instanceof Error ? error : undefined))
    }
  },

  getSession(sessionId: string): Result<ResearchSession | null> {
    try {
      const row = db.chat.prepare(`
        SELECT * FROM research_sessions WHERE id = ?
      `).get(sessionId) as ResearchSessionRow | null

      return Result.ok(row ? rowToSession(row) : null)
    } catch (error) {
      log.error('Failed to get research session', error instanceof Error ? error : undefined, { sessionId })
      return Result.err(Errors.db.queryFailed('SELECT research_sessions', error instanceof Error ? error : undefined))
    }
  },

  getSessionWithData(sessionId: string): Result<SessionWithData | null> {
    try {
      const sessionRow = db.chat.prepare(`
        SELECT * FROM research_sessions WHERE id = ?
      `).get(sessionId) as ResearchSessionRow | null

      if (!sessionRow) {
        return Result.ok(null)
      }

      const session = rowToSession(sessionRow)

      // Get sources with their findings
      const sourceRows = db.chat.prepare(`
        SELECT * FROM research_sources WHERE session_id = ? ORDER BY discovered_at DESC
      `).all(sessionId) as SourceRow[]

      const sources: Source[] = sourceRows.map(sourceRow => {
        const findingRows = db.chat.prepare(`
          SELECT * FROM research_findings WHERE source_id = ? ORDER BY extracted_at
        `).all(sourceRow.id) as FindingRow[]

        return rowToSource(sourceRow, findingRows.map(rowToFinding))
      })

      // Get report if exists
      const reportRow = db.chat.prepare(`
        SELECT * FROM research_reports WHERE session_id = ?
      `).get(sessionId) as ReportRow | null

      let report: Report | undefined
      if (reportRow) {
        const sectionRows = db.chat.prepare(`
          SELECT * FROM research_report_sections WHERE report_id = ? ORDER BY section_order
        `).all(reportRow.id) as ReportSectionRow[]

        report = rowToReport(reportRow, sectionRows.map(rowToReportSection))
      }

      return Result.ok({ session, sources, report })
    } catch (error) {
      log.error('Failed to get session with data', error instanceof Error ? error : undefined, { sessionId })
      return Result.err(Errors.db.queryFailed('SELECT session with data', error instanceof Error ? error : undefined))
    }
  },

  listSessions(options?: ListSessionsOptions): Result<SessionListResult> {
    try {
      const limit = options?.limit ?? 50
      const offset = options?.offset ?? 0
      const orderBy = options?.orderBy ?? 'createdAt'
      const order = options?.order ?? 'desc'

      const orderColumn = {
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        startedAt: 'started_at',
      }[orderBy]

      const whereClauses: string[] = []
      const params: unknown[] = []

      if (options?.status) {
        whereClauses.push('status = ?')
        params.push(options.status)
      }

      if (options?.chatId) {
        whereClauses.push('chat_id = ?')
        params.push(options.chatId)
      }

      const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : ''

      // Count total
      const countRow = db.chat.prepare(`
        SELECT COUNT(*) as count FROM research_sessions ${whereClause}
      `).get(...params) as { count: number }

      // Get items
      const rows = db.chat.prepare(`
        SELECT * FROM research_sessions ${whereClause}
        ORDER BY ${orderColumn} ${order.toUpperCase()}
        LIMIT ? OFFSET ?
      `).all(...params, limit, offset) as ResearchSessionRow[]

      const items = rows.map(rowToSession)

      return Result.ok({
        items,
        total: countRow.count,
        limit,
        offset,
        hasMore: offset + items.length < countRow.count,
      })
    } catch (error) {
      log.error('Failed to list research sessions', error instanceof Error ? error : undefined)
      return Result.err(Errors.db.queryFailed('SELECT research_sessions', error instanceof Error ? error : undefined))
    }
  },

  updateSessionStatus(sessionId: string, status: SessionStatus): Result<void> {
    try {
      const now = new Date().toISOString()
      const updates: string[] = ['status = ?', 'updated_at = ?']
      const params: unknown[] = [status, now]

      if (status === 'initializing' || status === 'scouting') {
        updates.push('started_at = COALESCE(started_at, ?)')
        params.push(now)
      }

      if (status === 'completed' || status === 'failed') {
        updates.push('completed_at = ?')
        params.push(now)
      }

      params.push(sessionId)

      const result = db.chat.prepare(`
        UPDATE research_sessions SET ${updates.join(', ')} WHERE id = ?
      `).run(...params)

      if (result.changes === 0) {
        return Result.err(Errors.store.notFound('session', sessionId))
      }

      log.info('Session status updated', { sessionId, status })
      return Result.ok(undefined)
    } catch (error) {
      log.error('Failed to update session status', error instanceof Error ? error : undefined, { sessionId })
      return Result.err(Errors.db.queryFailed('UPDATE research_sessions', error instanceof Error ? error : undefined))
    }
  },

  updateSessionStats(sessionId: string, stats: Partial<ResearchStats>): Result<void> {
    try {
      // Get current stats
      const row = db.chat.prepare(`
        SELECT stats FROM research_sessions WHERE id = ?
      `).get(sessionId) as { stats: string } | null

      if (!row) {
        return Result.err(Errors.store.notFound('session', sessionId))
      }

      const currentStats = JSON.parse(row.stats) as ResearchStats
      const newStats = { ...currentStats, ...stats }

      db.chat.prepare(`
        UPDATE research_sessions SET stats = ?, updated_at = datetime('now') WHERE id = ?
      `).run(JSON.stringify(newStats), sessionId)

      return Result.ok(undefined)
    } catch (error) {
      log.error('Failed to update session stats', error instanceof Error ? error : undefined, { sessionId })
      return Result.err(Errors.db.queryFailed('UPDATE research_sessions stats', error instanceof Error ? error : undefined))
    }
  },

  updateSessionConfig(sessionId: string, config: Partial<ResearchConfig>): Result<ResearchConfig> {
    try {
      // Get current config
      const row = db.chat.prepare(`
        SELECT config FROM research_sessions WHERE id = ?
      `).get(sessionId) as { config: string } | null

      if (!row) {
        return Result.err(Errors.store.notFound('session', sessionId))
      }

      const currentConfig = JSON.parse(row.config) as ResearchConfig
      const newConfig = { ...currentConfig, ...config }

      db.chat.prepare(`
        UPDATE research_sessions SET config = ?, updated_at = datetime('now') WHERE id = ?
      `).run(JSON.stringify(newConfig), sessionId)

      log.info('Session config updated', { sessionId, updatedFields: Object.keys(config) })

      return Result.ok(newConfig)
    } catch (error) {
      log.error('Failed to update session config', error instanceof Error ? error : undefined, { sessionId })
      return Result.err(Errors.db.queryFailed('UPDATE research_sessions config', error instanceof Error ? error : undefined))
    }
  },

  updateSessionGuidance(sessionId: string, guidance: Partial<SessionGuidance>): Result<void> {
    try {
      // Get current guidance
      const row = db.chat.prepare(`
        SELECT guidance FROM research_sessions WHERE id = ?
      `).get(sessionId) as { guidance: string } | null

      if (!row) {
        return Result.err(Errors.store.notFound('session', sessionId))
      }

      const currentGuidance = JSON.parse(row.guidance) as SessionGuidance
      const newGuidance = { ...currentGuidance, ...guidance }

      db.chat.prepare(`
        UPDATE research_sessions SET guidance = ?, updated_at = datetime('now') WHERE id = ?
      `).run(JSON.stringify(newGuidance), sessionId)

      return Result.ok(undefined)
    } catch (error) {
      log.error('Failed to update session guidance', error instanceof Error ? error : undefined, { sessionId })
      return Result.err(Errors.db.queryFailed('UPDATE research_sessions guidance', error instanceof Error ? error : undefined))
    }
  },

  updateSessionError(sessionId: string, error: string): Result<void> {
    try {
      db.chat.prepare(`
        UPDATE research_sessions
        SET error = ?, status = 'failed', updated_at = datetime('now'), completed_at = datetime('now')
        WHERE id = ?
      `).run(error, sessionId)

      return Result.ok(undefined)
    } catch (err) {
      log.error('Failed to update session error', err instanceof Error ? err : undefined, { sessionId })
      return Result.err(Errors.db.queryFailed('UPDATE research_sessions error', err instanceof Error ? err : undefined))
    }
  },

  deleteSession(sessionId: string): Result<boolean> {
    try {
      const result = db.chat.prepare(`
        DELETE FROM research_sessions WHERE id = ?
      `).run(sessionId)

      log.info('Research session deleted', { sessionId, deleted: result.changes > 0 })
      return Result.ok(result.changes > 0)
    } catch (error) {
      log.error('Failed to delete research session', error instanceof Error ? error : undefined, { sessionId })
      return Result.err(Errors.db.queryFailed('DELETE research_sessions', error instanceof Error ? error : undefined))
    }
  },

  // ---------------------------------------------------------------------------
  // SOURCE OPERATIONS
  // ---------------------------------------------------------------------------

  addSource(input: CreateSourceInput): Result<Source> {
    try {
      const id = newSourceId()
      const now = new Date().toISOString()

      db.chat.prepare(`
        INSERT INTO research_sources (
          id, session_id, url, title, domain, path, favicon, thumbnail, snippet,
          source_type, published_at, author, bias, state, state_changed_at,
          discovered_by, providers, relevance_score, credibility_score, freshness_score,
          provider_boost, discovered_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        input.sessionId,
        input.url,
        input.title ?? null,
        input.domain,
        input.path ?? null,
        input.favicon ?? null,
        input.thumbnail ?? null,
        input.snippet ?? null,
        input.type ?? 'unknown',
        input.publishedAt ? new Date(input.publishedAt).toISOString() : null,
        input.author ?? null,
        input.bias ?? 'unknown',
        'pending',
        now,
        input.discoveredBy ?? null,
        JSON.stringify(input.providers ?? []),
        input.relevanceScore ?? 0.5,
        input.credibilityScore ?? 0.5,
        input.freshnessScore ?? 0.5,
        input.providerBoost ?? 0,
        now
      )

      log.debug('Source added', { sourceId: id, url: input.url })

      return Result.ok({
        id,
        sessionId: input.sessionId,
        url: input.url,
        title: input.title ?? '',
        domain: input.domain,
        path: input.path ?? '',
        favicon: input.favicon,
        thumbnail: input.thumbnail,
        snippet: input.snippet,
        type: input.type ?? 'unknown',
        publishedAt: input.publishedAt,
        author: input.author,
        bias: input.bias ?? 'unknown',
        state: 'pending',
        stateChangedAt: new Date(now).getTime(),
        discoveredBy: input.discoveredBy ?? '',
        relevanceScore: input.relevanceScore ?? 0.5,
        credibilityScore: input.credibilityScore ?? 0.5,
        freshnessScore: input.freshnessScore ?? 0.5,
        findings: [],
        discoveredAt: new Date(now).getTime(),
      })
    } catch (error) {
      log.error('Failed to add source', error instanceof Error ? error : undefined, { url: input.url })
      return Result.err(Errors.db.queryFailed('INSERT research_sources', error instanceof Error ? error : undefined))
    }
  },

  getSource(sourceId: string): Result<Source | null> {
    try {
      const row = db.chat.prepare(`
        SELECT * FROM research_sources WHERE id = ?
      `).get(sourceId) as SourceRow | null

      if (!row) {
        return Result.ok(null)
      }

      const findingRows = db.chat.prepare(`
        SELECT * FROM research_findings WHERE source_id = ? ORDER BY extracted_at
      `).all(sourceId) as FindingRow[]

      return Result.ok(rowToSource(row, findingRows.map(rowToFinding)))
    } catch (error) {
      log.error('Failed to get source', error instanceof Error ? error : undefined, { sourceId })
      return Result.err(Errors.db.queryFailed('SELECT research_sources', error instanceof Error ? error : undefined))
    }
  },

  getSources(sessionId: string, options?: ListSourcesOptions): Result<Source[]> {
    try {
      const orderBy = options?.orderBy ?? 'discoveredAt'
      const order = options?.order ?? 'desc'

      const orderColumn = {
        discoveredAt: 'discovered_at',
        relevanceScore: 'relevance_score',
        state: 'state',
      }[orderBy]

      let whereClause = 'session_id = ?'
      const params: unknown[] = [sessionId]

      if (options?.state) {
        const states = Array.isArray(options.state) ? options.state : [options.state]
        whereClause += ` AND state IN (${states.map(() => '?').join(', ')})`
        params.push(...states)
      }

      const rows = db.chat.prepare(`
        SELECT * FROM research_sources
        WHERE ${whereClause}
        ORDER BY ${orderColumn} ${order.toUpperCase()}
      `).all(...params) as SourceRow[]

      // Get findings for each source
      const sources = rows.map(row => {
        const findingRows = db.chat.prepare(`
          SELECT * FROM research_findings WHERE source_id = ? ORDER BY extracted_at
        `).all(row.id) as FindingRow[]

        return rowToSource(row, findingRows.map(rowToFinding))
      })

      return Result.ok(sources)
    } catch (error) {
      log.error('Failed to get sources', error instanceof Error ? error : undefined, { sessionId })
      return Result.err(Errors.db.queryFailed('SELECT research_sources', error instanceof Error ? error : undefined))
    }
  },

  updateSource(sourceId: string, input: UpdateSourceInput): Result<void> {
    try {
      const sets: string[] = []
      const params: unknown[] = []

      if (input.title !== undefined) {
        sets.push('title = ?')
        params.push(input.title)
      }
      if (input.state !== undefined) {
        sets.push('state = ?', 'state_changed_at = datetime("now")')
        params.push(input.state)
      }
      if (input.readBy !== undefined) {
        sets.push('read_by = ?')
        params.push(input.readBy)
      }
      if (input.readProgress !== undefined) {
        sets.push('read_progress = ?')
        params.push(input.readProgress)
      }
      if (input.readStage !== undefined) {
        sets.push('read_stage = ?')
        params.push(input.readStage)
      }
      if (input.content !== undefined) {
        sets.push('content = ?')
        params.push(input.content)
      }
      if (input.readTimeMs !== undefined) {
        sets.push('read_time_ms = ?')
        params.push(input.readTimeMs)
      }
      if (input.tokenCount !== undefined) {
        sets.push('token_count = ?')
        params.push(input.tokenCount)
      }
      if (input.userComment !== undefined) {
        sets.push('user_comment = ?')
        params.push(input.userComment)
      }
      if (input.rejectionReason !== undefined) {
        sets.push('rejection_reason = ?')
        params.push(input.rejectionReason)
      }
      if (input.error !== undefined) {
        sets.push('error = ?')
        params.push(input.error)
      }
      if (input.approvedAt !== undefined) {
        sets.push('approved_at = ?')
        params.push(input.approvedAt)
      }
      if (input.completedAt !== undefined) {
        sets.push('completed_at = ?')
        params.push(input.completedAt)
      }

      if (sets.length === 0) {
        return Result.ok(undefined)
      }

      params.push(sourceId)

      db.chat.prepare(`
        UPDATE research_sources SET ${sets.join(', ')} WHERE id = ?
      `).run(...params)

      return Result.ok(undefined)
    } catch (error) {
      log.error('Failed to update source', error instanceof Error ? error : undefined, { sourceId })
      return Result.err(Errors.db.queryFailed('UPDATE research_sources', error instanceof Error ? error : undefined))
    }
  },

  approveSource(sessionId: string, sourceId: string): Result<void> {
    try {
      const now = new Date().toISOString()

      const result = db.chat.prepare(`
        UPDATE research_sources
        SET state = 'approved', state_changed_at = ?, approved_at = ?
        WHERE id = ? AND session_id = ? AND state = 'pending'
      `).run(now, now, sourceId, sessionId)

      if (result.changes === 0) {
        return Result.err(Errors.store.notFound('source', sourceId))
      }

      log.info('Source approved', { sessionId, sourceId })
      return Result.ok(undefined)
    } catch (error) {
      log.error('Failed to approve source', error instanceof Error ? error : undefined, { sourceId })
      return Result.err(Errors.db.queryFailed('UPDATE research_sources approve', error instanceof Error ? error : undefined))
    }
  },

  rejectSource(sessionId: string, sourceId: string, reason?: string, blockDomain?: boolean): Result<void> {
    try {
      const now = new Date().toISOString()

      db.chat.prepare(`
        UPDATE research_sources
        SET state = 'rejected', state_changed_at = ?, rejection_reason = ?
        WHERE id = ? AND session_id = ?
      `).run(now, reason ?? null, sourceId, sessionId)

      // Optionally block the domain
      if (blockDomain) {
        const sourceRow = db.chat.prepare(`
          SELECT domain FROM research_sources WHERE id = ?
        `).get(sourceId) as { domain: string } | null

        if (sourceRow) {
          const guidanceRow = db.chat.prepare(`
            SELECT guidance FROM research_sessions WHERE id = ?
          `).get(sessionId) as { guidance: string } | null

          if (guidanceRow) {
            const guidance = JSON.parse(guidanceRow.guidance) as SessionGuidance
            if (!guidance.blockedDomains.includes(sourceRow.domain)) {
              guidance.blockedDomains.push(sourceRow.domain)
              db.chat.prepare(`
                UPDATE research_sessions SET guidance = ? WHERE id = ?
              `).run(JSON.stringify(guidance), sessionId)
            }
          }
        }
      }

      log.info('Source rejected', { sessionId, sourceId, blockDomain })
      return Result.ok(undefined)
    } catch (error) {
      log.error('Failed to reject source', error instanceof Error ? error : undefined, { sourceId })
      return Result.err(Errors.db.queryFailed('UPDATE research_sources reject', error instanceof Error ? error : undefined))
    }
  },

  // ---------------------------------------------------------------------------
  // FINDING OPERATIONS
  // ---------------------------------------------------------------------------

  addFinding(input: CreateFindingInput): Result<Finding> {
    try {
      const id = newFindingId()
      const now = new Date().toISOString()

      db.chat.prepare(`
        INSERT INTO research_findings (
          id, source_id, session_id, content, category, confidence, importance,
          page_number, paragraph, original_text, extracted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        input.sourceId,
        input.sessionId,
        input.content,
        input.category,
        input.confidence ?? 0.5,
        input.importance ?? 0.5,
        input.pageNumber ?? null,
        input.paragraph ?? null,
        input.originalText ?? null,
        now
      )

      return Result.ok({
        id,
        sourceId: input.sourceId,
        sessionId: input.sessionId,
        content: input.content,
        category: input.category,
        confidence: input.confidence ?? 0.5,
        importance: input.importance ?? 0.5,
        pageNumber: input.pageNumber,
        paragraph: input.paragraph,
        originalText: input.originalText,
        extractedAt: new Date(now).getTime(),
      })
    } catch (error) {
      log.error('Failed to add finding', error instanceof Error ? error : undefined)
      return Result.err(Errors.db.queryFailed('INSERT research_findings', error instanceof Error ? error : undefined))
    }
  },

  getFindings(sourceId: string): Result<Finding[]> {
    try {
      const rows = db.chat.prepare(`
        SELECT * FROM research_findings WHERE source_id = ? ORDER BY extracted_at
      `).all(sourceId) as FindingRow[]

      return Result.ok(rows.map(rowToFinding))
    } catch (error) {
      log.error('Failed to get findings', error instanceof Error ? error : undefined, { sourceId })
      return Result.err(Errors.db.queryFailed('SELECT research_findings', error instanceof Error ? error : undefined))
    }
  },

  getSessionFindings(sessionId: string): Result<Finding[]> {
    try {
      const rows = db.chat.prepare(`
        SELECT * FROM research_findings WHERE session_id = ? ORDER BY extracted_at
      `).all(sessionId) as FindingRow[]

      return Result.ok(rows.map(rowToFinding))
    } catch (error) {
      log.error('Failed to get session findings', error instanceof Error ? error : undefined, { sessionId })
      return Result.err(Errors.db.queryFailed('SELECT research_findings', error instanceof Error ? error : undefined))
    }
  },

  // ---------------------------------------------------------------------------
  // CONTRADICTION OPERATIONS
  // ---------------------------------------------------------------------------

  addContradiction(input: CreateContradictionInput): Result<Contradiction> {
    try {
      const id = newContradictionId()
      const now = new Date().toISOString()

      db.chat.prepare(`
        INSERT INTO research_contradictions (
          id, session_id, claim_a, claim_b, status, topic, severity, detected_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        input.sessionId,
        JSON.stringify(input.claimA),
        JSON.stringify(input.claimB),
        'unresolved',
        input.topic ?? null,
        input.severity ?? 'moderate',
        now
      )

      return Result.ok({
        id,
        sessionId: input.sessionId,
        claimA: input.claimA,
        claimB: input.claimB,
        status: 'unresolved',
        topic: input.topic ?? '',
        severity: input.severity ?? 'moderate',
        detectedAt: new Date(now).getTime(),
      })
    } catch (error) {
      log.error('Failed to add contradiction', error instanceof Error ? error : undefined)
      return Result.err(Errors.db.queryFailed('INSERT research_contradictions', error instanceof Error ? error : undefined))
    }
  },

  getContradictions(sessionId: string): Result<Contradiction[]> {
    try {
      const rows = db.chat.prepare(`
        SELECT * FROM research_contradictions WHERE session_id = ? ORDER BY detected_at DESC
      `).all(sessionId) as ContradictionRow[]

      return Result.ok(rows.map(rowToContradiction))
    } catch (error) {
      log.error('Failed to get contradictions', error instanceof Error ? error : undefined, { sessionId })
      return Result.err(Errors.db.queryFailed('SELECT research_contradictions', error instanceof Error ? error : undefined))
    }
  },

  resolveContradiction(contradictionId: string, input: ResolveContradictionInput): Result<void> {
    try {
      const resolution = {
        type: input.type,
        explanation: input.explanation,
        tiebreakerSourceId: input.tiebreakerSourceId,
        resolvedAt: Date.now(),
      }

      db.chat.prepare(`
        UPDATE research_contradictions
        SET status = 'resolved', resolution = ?
        WHERE id = ?
      `).run(JSON.stringify(resolution), contradictionId)

      log.info('Contradiction resolved', { contradictionId, type: input.type })
      return Result.ok(undefined)
    } catch (error) {
      log.error('Failed to resolve contradiction', error instanceof Error ? error : undefined, { contradictionId })
      return Result.err(Errors.db.queryFailed('UPDATE research_contradictions', error instanceof Error ? error : undefined))
    }
  },

  // ---------------------------------------------------------------------------
  // REPORT OPERATIONS
  // ---------------------------------------------------------------------------

  createReport(input: CreateReportInput): Result<Report> {
    try {
      const id = newReportId()
      const now = new Date().toISOString()

      db.chat.prepare(`
        INSERT INTO research_reports (
          id, session_id, title, subtitle, summary, table_of_contents,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        input.sessionId,
        input.title,
        input.subtitle ?? null,
        input.summary ?? null,
        '[]',
        now,
        now
      )

      return Result.ok({
        id,
        sessionId: input.sessionId,
        title: input.title,
        subtitle: input.subtitle,
        summary: input.summary ?? '',
        sections: [],
        tableOfContents: [],
        totalWordCount: 0,
        totalCitations: 0,
        totalContradictions: 0,
        createdAt: new Date(now).getTime(),
        updatedAt: new Date(now).getTime(),
      })
    } catch (error) {
      log.error('Failed to create report', error instanceof Error ? error : undefined)
      return Result.err(Errors.db.queryFailed('INSERT research_reports', error instanceof Error ? error : undefined))
    }
  },

  getReport(sessionId: string): Result<Report | null> {
    try {
      const row = db.chat.prepare(`
        SELECT * FROM research_reports WHERE session_id = ?
      `).get(sessionId) as ReportRow | null

      if (!row) {
        return Result.ok(null)
      }

      const sectionRows = db.chat.prepare(`
        SELECT * FROM research_report_sections WHERE report_id = ? ORDER BY section_order
      `).all(row.id) as ReportSectionRow[]

      return Result.ok(rowToReport(row, sectionRows.map(rowToReportSection)))
    } catch (error) {
      log.error('Failed to get report', error instanceof Error ? error : undefined, { sessionId })
      return Result.err(Errors.db.queryFailed('SELECT research_reports', error instanceof Error ? error : undefined))
    }
  },

  addReportSection(input: CreateReportSectionInput): Result<ReportSection> {
    try {
      const id = newReportSectionId()

      db.chat.prepare(`
        INSERT INTO research_report_sections (
          id, report_id, section_order, level, title, content, summary, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        input.reportId,
        input.order,
        input.level ?? 1,
        input.title,
        input.content ?? null,
        input.summary ?? null,
        'pending'
      )

      // Update TOC
      const reportRow = db.chat.prepare(`
        SELECT id, table_of_contents FROM research_reports WHERE id = ?
      `).get(input.reportId) as { id: string; table_of_contents: string } | null

      if (reportRow) {
        const toc = JSON.parse(reportRow.table_of_contents) as TOCEntry[]
        toc.push({
          id: crypto.randomUUID(),
          sectionId: id,
          title: input.title,
          level: input.level ?? 1,
          status: 'pending',
        })
        db.chat.prepare(`
          UPDATE research_reports SET table_of_contents = ? WHERE id = ?
        `).run(JSON.stringify(toc), input.reportId)
      }

      return Result.ok({
        id,
        reportId: input.reportId,
        order: input.order,
        level: input.level ?? 1,
        title: input.title,
        content: input.content ?? '',
        summary: input.summary,
        citations: [],
        contradictions: [],
        wordCount: 0,
        findingsUsed: 0,
        status: 'pending',
      })
    } catch (error) {
      log.error('Failed to add report section', error instanceof Error ? error : undefined)
      return Result.err(Errors.db.queryFailed('INSERT research_report_sections', error instanceof Error ? error : undefined))
    }
  },

  updateReportSection(sectionId: string, input: UpdateReportSectionInput): Result<void> {
    try {
      const sets: string[] = []
      const params: unknown[] = []

      if (input.content !== undefined) {
        sets.push('content = ?')
        params.push(input.content)
      }
      if (input.summary !== undefined) {
        sets.push('summary = ?')
        params.push(input.summary)
      }
      if (input.citations !== undefined) {
        sets.push('citations = ?')
        params.push(JSON.stringify(input.citations))
      }
      if (input.contradictions !== undefined) {
        sets.push('contradictions = ?')
        params.push(JSON.stringify(input.contradictions))
      }
      if (input.wordCount !== undefined) {
        sets.push('word_count = ?')
        params.push(input.wordCount)
      }
      if (input.findingsUsed !== undefined) {
        sets.push('findings_used = ?')
        params.push(input.findingsUsed)
      }
      if (input.status !== undefined) {
        sets.push('status = ?')
        params.push(input.status)
        if (input.status === 'complete') {
          sets.push('generated_at = datetime("now")')
        }
      }

      if (sets.length === 0) {
        return Result.ok(undefined)
      }

      params.push(sectionId)

      db.chat.prepare(`
        UPDATE research_report_sections SET ${sets.join(', ')} WHERE id = ?
      `).run(...params)

      return Result.ok(undefined)
    } catch (error) {
      log.error('Failed to update report section', error instanceof Error ? error : undefined, { sectionId })
      return Result.err(Errors.db.queryFailed('UPDATE research_report_sections', error instanceof Error ? error : undefined))
    }
  },

  completeReport(sessionId: string): Result<void> {
    try {
      // Get report
      const reportRow = db.chat.prepare(`
        SELECT id FROM research_reports WHERE session_id = ?
      `).get(sessionId) as { id: string } | null

      if (!reportRow) {
        return Result.err(Errors.store.notFound('report', sessionId))
      }

      // Calculate totals from sections
      const totals = db.chat.prepare(`
        SELECT
          COALESCE(SUM(word_count), 0) as total_words,
          COALESCE(SUM(json_array_length(citations)), 0) as total_citations,
          COALESCE(SUM(json_array_length(contradictions)), 0) as total_contradictions
        FROM research_report_sections WHERE report_id = ?
      `).get(reportRow.id) as { total_words: number; total_citations: number; total_contradictions: number }

      db.chat.prepare(`
        UPDATE research_reports
        SET total_word_count = ?, total_citations = ?, total_contradictions = ?,
            completed_at = datetime('now'), updated_at = datetime('now')
        WHERE id = ?
      `).run(totals.total_words, totals.total_citations, totals.total_contradictions, reportRow.id)

      log.info('Report completed', { sessionId, reportId: reportRow.id })
      return Result.ok(undefined)
    } catch (error) {
      log.error('Failed to complete report', error instanceof Error ? error : undefined, { sessionId })
      return Result.err(Errors.db.queryFailed('UPDATE research_reports complete', error instanceof Error ? error : undefined))
    }
  },
}
