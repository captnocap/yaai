// =============================================================================
// MOCK RESEARCH SERVICE
// =============================================================================
// Simulates the deep research process with realistic timing and data.
// Used for frontend development until the real backend is implemented.
// =============================================================================

import type {
  ResearchSession,
  ResearchStats,
  ResearchConfig,
  SessionGuidance,
  SessionStatus,
  DepthProfile,
  DEPTH_PROFILE_CONFIG,
  Source,
  SourceState,
  SourceType,
  BiasIndicator,
  Finding,
  FindingCategory,
  Contradiction,
  ContradictionClaim,
  Report,
  ReportSection,
  Citation,
  TOCEntry,
  GalaxyNode,
  GalaxyEdge,
  ScoutAgent,
  ResearchEvent,
  ResearchEventType,
} from '../../../shared/research-types';

// =============================================================================
// MOCK DATA GENERATORS
// =============================================================================

const MOCK_DOMAINS = [
  'nature.com',
  'arxiv.org',
  'sciencedirect.com',
  'ieee.org',
  'researchgate.net',
  'springer.com',
  'wiley.com',
  'plos.org',
  'biorxiv.org',
  'cell.com',
  'science.org',
  'pnas.org',
  'mdpi.com',
  'frontiersin.org',
  'acs.org',
  'rsc.org',
  'nytimes.com',
  'wired.com',
  'arstechnica.com',
  'techcrunch.com',
  'theverge.com',
  'medium.com',
  'dev.to',
  'stackoverflow.com',
  'github.com',
  'wikipedia.org',
];

const MOCK_SOURCE_TYPES: SourceType[] = [
  'article',
  'paper',
  'documentation',
  'news',
  'blog',
  'forum',
];

const MOCK_BIASES: BiasIndicator[] = [
  'left',
  'center-left',
  'center',
  'center-right',
  'right',
  'unknown',
];

const MOCK_FINDING_CATEGORIES: FindingCategory[] = [
  'statistic',
  'claim',
  'quote',
  'definition',
  'methodology',
  'conclusion',
  'background',
  'example',
];

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function generateMockTitle(query: string): string {
  const prefixes = [
    'A Comprehensive Study of',
    'Understanding',
    'Advances in',
    'The Future of',
    'Exploring',
    'Recent Developments in',
    'A Deep Dive into',
    'The Science Behind',
    'Breaking Down',
    'What You Need to Know About',
  ];
  const keywords = query.split(' ').slice(0, 3).join(' ');
  return `${randomChoice(prefixes)} ${keywords}`;
}

function generateMockSnippet(query: string): string {
  const snippets = [
    `Recent research has shown significant advances in ${query}, with new findings suggesting...`,
    `Experts agree that ${query} represents a major breakthrough in the field...`,
    `A comprehensive analysis of ${query} reveals unexpected patterns that could reshape our understanding...`,
    `New data on ${query} challenges previous assumptions about the fundamental mechanisms...`,
    `The latest developments in ${query} point to promising applications across multiple domains...`,
    `Scientists have identified key factors in ${query} that may explain long-standing mysteries...`,
    `Industry leaders predict that ${query} will transform current approaches within the next decade...`,
    `Groundbreaking experiments on ${query} have yielded results that exceed expectations...`,
  ];
  return randomChoice(snippets);
}

function generateMockFinding(sourceId: string, sessionId: string, query: string): Finding {
  const categories = MOCK_FINDING_CATEGORIES;
  const category = randomChoice(categories);

  const contentByCategory: Record<FindingCategory, string[]> = {
    statistic: [
      `Studies show a ${randomInt(15, 85)}% improvement in ${query} efficiency`,
      `Data indicates ${randomInt(2, 10)}x increase in performance metrics`,
      `Analysis reveals ${randomInt(60, 95)}% accuracy rate for ${query}`,
    ],
    claim: [
      `Researchers assert that ${query} is fundamentally changing the paradigm`,
      `Evidence suggests ${query} could revolutionize current approaches`,
      `Experts claim ${query} represents a significant advancement`,
    ],
    quote: [
      `"This is the most significant development in ${query} we've seen in years"`,
      `"The implications for ${query} are far-reaching and profound"`,
      `"We're witnessing a paradigm shift in how we approach ${query}"`,
    ],
    definition: [
      `${query} refers to the process of systematically analyzing and synthesizing information`,
      `The term encompasses various methodologies for understanding complex systems`,
      `Technically defined as the integration of multiple data sources for insight generation`,
    ],
    methodology: [
      `The standard approach involves iterative refinement of ${query} parameters`,
      `Researchers employed a novel technique combining ${query} with machine learning`,
      `The methodology relies on systematic validation through controlled experiments`,
    ],
    conclusion: [
      `The findings conclusively demonstrate the viability of ${query}`,
      `Results indicate strong potential for widespread adoption of ${query}`,
      `The study concludes that ${query} meets or exceeds performance benchmarks`,
    ],
    background: [
      `Historical development of ${query} began in the early 2000s`,
      `The foundational principles of ${query} were established through decades of research`,
      `Understanding ${query} requires context from multiple scientific disciplines`,
    ],
    example: [
      `A notable implementation of ${query} achieved remarkable results at Scale Corp`,
      `Case study: How TechGiant leveraged ${query} for 10x efficiency gains`,
      `Real-world application: ${query} in action at leading research institutions`,
    ],
  };

  return {
    id: generateId(),
    sourceId,
    sessionId,
    content: randomChoice(contentByCategory[category]),
    category,
    confidence: randomFloat(0.6, 0.98),
    importance: randomFloat(0.4, 0.95),
    extractedAt: Date.now(),
  };
}

function generateMockSource(
  sessionId: string,
  query: string,
  scoutId: string
): Source {
  const domain = randomChoice(MOCK_DOMAINS);
  const path = `/articles/${query.toLowerCase().replace(/\s+/g, '-')}-${generateId()}`;

  return {
    id: generateId(),
    sessionId,
    url: `https://${domain}${path}`,
    title: generateMockTitle(query),
    domain,
    path,
    snippet: generateMockSnippet(query),
    type: randomChoice(MOCK_SOURCE_TYPES),
    publishedAt: Date.now() - randomInt(0, 365 * 24 * 60 * 60 * 1000), // Up to 1 year ago
    author: `Dr. ${randomChoice(['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'])}`,
    bias: randomChoice(MOCK_BIASES),
    state: 'pending',
    stateChangedAt: Date.now(),
    discoveredBy: scoutId,
    relevanceScore: randomFloat(0.5, 0.98),
    credibilityScore: randomFloat(0.6, 0.95),
    freshnessScore: randomFloat(0.3, 1.0),
    findings: [],
    discoveredAt: Date.now(),
  };
}

function generateMockContradiction(
  sessionId: string,
  sourceA: Source,
  sourceB: Source,
  findingA: Finding,
  findingB: Finding
): Contradiction {
  return {
    id: generateId(),
    sessionId,
    claimA: {
      findingId: findingA.id,
      sourceId: sourceA.id,
      text: findingA.content,
      sourceTitle: sourceA.title,
      sourceDomain: sourceA.domain,
      sourceBias: sourceA.bias,
      sourceDate: sourceA.publishedAt,
      sourceType: sourceA.type,
    },
    claimB: {
      findingId: findingB.id,
      sourceId: sourceB.id,
      text: findingB.content,
      sourceTitle: sourceB.title,
      sourceDomain: sourceB.domain,
      sourceBias: sourceB.bias,
      sourceDate: sourceB.publishedAt,
      sourceType: sourceB.type,
    },
    status: 'unresolved',
    topic: `Disagreement on ${sourceA.title.split(' ').slice(0, 3).join(' ')}`,
    severity: randomChoice(['minor', 'moderate', 'major']),
    detectedAt: Date.now(),
  };
}

function generateMockReportSection(
  reportId: string,
  order: number,
  title: string,
  sources: Source[],
  query: string
): ReportSection {
  // Generate content with citations
  const usedSources = sources.slice(0, randomInt(2, 5));
  const citations: Citation[] = [];

  let content = `This section explores ${title.toLowerCase()} in the context of ${query}.\n\n`;

  usedSources.forEach((source, idx) => {
    const marker = `[${idx + 1}]`;
    const sentence = randomChoice([
      `According to research from ${source.domain}, significant progress has been made ${marker}.`,
      `Studies indicate that key developments are underway ${marker}.`,
      `Experts at ${source.domain} have documented important findings ${marker}.`,
      `Recent analysis suggests promising directions ${marker}.`,
    ]);
    content += sentence + ' ';

    citations.push({
      id: generateId(),
      marker,
      sourceId: source.id,
      text: sentence,
      sourceTitle: source.title,
      sourceUrl: source.url,
      sourceDomain: source.domain,
      sectionId: `section-${order}`,
      position: content.length - sentence.length,
    });
  });

  content += '\n\n';
  content += `The evidence presented demonstrates the importance of continued research in this area. `;
  content += `Multiple sources corroborate these findings, suggesting a strong consensus in the field.`;

  return {
    id: `section-${order}`,
    reportId,
    order,
    level: 1,
    title,
    content,
    summary: `Key insights on ${title.toLowerCase()}`,
    citations,
    contradictions: [],
    wordCount: content.split(/\s+/).length,
    findingsUsed: usedSources.length,
    status: 'complete',
    generatedAt: Date.now(),
  };
}

// =============================================================================
// MOCK RESEARCH SERVICE CLASS
// =============================================================================

type EventCallback = (event: ResearchEvent) => void;

export class MockResearchService {
  private sessions: Map<string, ResearchSession> = new Map();
  private sources: Map<string, Source[]> = new Map();
  private reports: Map<string, Report> = new Map();
  private eventListeners: Map<string, Set<EventCallback>> = new Map();
  private activeIntervals: Map<string, NodeJS.Timeout[]> = new Map();

  // Timing configuration (ms)
  private readonly SCOUT_INTERVAL = 800;      // How often scouts find sources
  private readonly READER_INTERVAL = 1500;    // How long to read a source
  private readonly SECTION_INTERVAL = 2000;   // How long to generate a section
  private readonly SCOUT_DURATION = 15000;    // Total scouting time

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================

  async createSession(
    query: string,
    depthProfile: DepthProfile,
    chatId?: string,
    messageId?: string
  ): Promise<ResearchSession> {
    const config = this.getConfigForDepth(depthProfile);

    const session: ResearchSession = {
      id: generateId(),
      query,
      depthProfile,
      status: 'idle',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      stats: this.createInitialStats(),
      config,
      guidance: {
        userNotes: [],
        blockedDomains: [],
        preferredDomains: [],
        learnedPatterns: [],
      },
      chatId,
      messageId,
    };

    this.sessions.set(session.id, session);
    this.sources.set(session.id, []);
    this.activeIntervals.set(session.id, []);

    this.emit(session.id, {
      type: 'session:created',
      sessionId: session.id,
      timestamp: Date.now(),
      data: { session },
    });

    return session;
  }

  async getSession(sessionId: string): Promise<{
    session: ResearchSession;
    sources: Source[];
    report?: Report;
  } | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    return {
      session,
      sources: this.sources.get(sessionId) || [],
      report: this.reports.get(sessionId),
    };
  }

  async listSessions(): Promise<ResearchSession[]> {
    return Array.from(this.sessions.values());
  }

  async startSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    session.status = 'initializing';
    session.startedAt = Date.now();
    session.updatedAt = Date.now();

    this.emit(sessionId, {
      type: 'session:started',
      sessionId,
      timestamp: Date.now(),
      data: { status: 'initializing' },
    });

    // Start the research simulation
    await this.simulateResearch(sessionId);
  }

  async pauseSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    session.status = 'paused';
    session.updatedAt = Date.now();

    // Clear all intervals
    const intervals = this.activeIntervals.get(sessionId) || [];
    intervals.forEach(clearInterval);
    this.activeIntervals.set(sessionId, []);

    this.emit(sessionId, {
      type: 'session:paused',
      sessionId,
      timestamp: Date.now(),
      data: {},
    });
  }

  async resumeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    session.status = 'reading';
    session.updatedAt = Date.now();

    this.emit(sessionId, {
      type: 'session:resumed',
      sessionId,
      timestamp: Date.now(),
      data: {},
    });

    // Resume simulation
    await this.simulateReading(sessionId);
  }

  async approveSource(sessionId: string, sourceId: string): Promise<void> {
    const sources = this.sources.get(sessionId);
    if (!sources) throw new Error('Session not found');

    const source = sources.find(s => s.id === sourceId);
    if (!source) throw new Error('Source not found');

    source.state = 'approved';
    source.stateChangedAt = Date.now();
    source.approvedAt = Date.now();

    const session = this.sessions.get(sessionId)!;
    session.stats.sourcesQueued++;
    session.updatedAt = Date.now();

    this.emit(sessionId, {
      type: 'source:approved',
      sessionId,
      timestamp: Date.now(),
      data: { source },
    });
  }

  async rejectSource(
    sessionId: string,
    sourceId: string,
    reason?: string,
    blockDomain?: boolean
  ): Promise<void> {
    const sources = this.sources.get(sessionId);
    if (!sources) throw new Error('Session not found');

    const source = sources.find(s => s.id === sourceId);
    if (!source) throw new Error('Source not found');

    source.state = 'rejected';
    source.stateChangedAt = Date.now();
    source.rejectionReason = reason;

    const session = this.sessions.get(sessionId)!;
    session.stats.sourcesRejected++;
    session.updatedAt = Date.now();

    if (blockDomain) {
      session.guidance.blockedDomains.push(source.domain);
    }

    this.emit(sessionId, {
      type: 'source:rejected',
      sessionId,
      timestamp: Date.now(),
      data: { source },
    });
  }

  async resolveContradiction(
    sessionId: string,
    contradictionId: string,
    resolution: 'trust_a' | 'trust_b' | 'use_both' | 'dismiss'
  ): Promise<void> {
    const report = this.reports.get(sessionId);
    if (!report) throw new Error('Report not found');

    // Find and resolve contradiction
    for (const section of report.sections) {
      const contradiction = section.contradictions.find(c => c.id === contradictionId);
      if (contradiction) {
        contradiction.status = resolution === 'dismiss' ? 'dismissed' : 'resolved';
        contradiction.resolution = {
          type: resolution,
          resolvedAt: Date.now(),
        };

        const session = this.sessions.get(sessionId)!;
        session.stats.contradictionsResolved++;

        this.emit(sessionId, {
          type: 'contradiction:resolved',
          sessionId,
          timestamp: Date.now(),
          data: { contradictionId, resolution },
        });
        return;
      }
    }
  }

  // ==========================================================================
  // EVENT HANDLING
  // ==========================================================================

  subscribe(sessionId: string, callback: EventCallback): () => void {
    if (!this.eventListeners.has(sessionId)) {
      this.eventListeners.set(sessionId, new Set());
    }
    this.eventListeners.get(sessionId)!.add(callback);

    return () => {
      this.eventListeners.get(sessionId)?.delete(callback);
    };
  }

  private emit(sessionId: string, event: ResearchEvent): void {
    const listeners = this.eventListeners.get(sessionId);
    if (listeners) {
      listeners.forEach(callback => callback(event));
    }
  }

  // ==========================================================================
  // SIMULATION LOGIC
  // ==========================================================================

  private async simulateResearch(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId)!;

    // Phase 1: Scouting
    session.status = 'scouting';
    session.stats.activeScouts = 3;
    this.emit(sessionId, {
      type: 'session:stats-updated',
      sessionId,
      timestamp: Date.now(),
      data: { stats: session.stats },
    });

    await this.simulateScouting(sessionId);

    // Phase 2: Reading
    session.status = 'reading';
    session.stats.activeScouts = 0;
    await this.simulateReading(sessionId);

    // Phase 3: Synthesis
    session.status = 'synthesizing';
    await this.simulateSynthesis(sessionId);

    // Complete
    session.status = 'completed';
    session.completedAt = Date.now();
    session.stats.elapsedMs = Date.now() - (session.startedAt || session.createdAt);

    this.emit(sessionId, {
      type: 'session:completed',
      sessionId,
      timestamp: Date.now(),
      data: { session },
    });
  }

  private async simulateScouting(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId)!;
    const sources = this.sources.get(sessionId)!;
    const maxSources = session.config.maxSources;

    return new Promise(resolve => {
      const scoutIds = ['scout-a', 'scout-b', 'scout-c'];
      let discovered = 0;

      const interval = setInterval(() => {
        if (session.status === 'paused') return;

        if (discovered >= maxSources || session.status !== 'scouting') {
          clearInterval(interval);
          resolve();
          return;
        }

        // Discover a new source
        const scoutId = randomChoice(scoutIds);
        const source = generateMockSource(sessionId, session.query, scoutId);

        // Auto-approve high relevance sources if configured
        if (session.config.autoApprove && source.relevanceScore > session.config.autoApproveThreshold) {
          source.state = 'approved';
          source.approvedAt = Date.now();
          session.stats.sourcesQueued++;
        }

        sources.push(source);
        discovered++;
        session.stats.sourcesSearched++;
        session.stats.elapsedMs = Date.now() - (session.startedAt || session.createdAt);

        this.emit(sessionId, {
          type: 'source:discovered',
          sessionId,
          timestamp: Date.now(),
          data: { source },
        });

        this.emit(sessionId, {
          type: 'session:stats-updated',
          sessionId,
          timestamp: Date.now(),
          data: { stats: session.stats },
        });
      }, this.SCOUT_INTERVAL);

      this.activeIntervals.get(sessionId)?.push(interval);

      // End scouting after duration
      setTimeout(() => {
        clearInterval(interval);
        resolve();
      }, this.SCOUT_DURATION);
    });
  }

  private async simulateReading(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId)!;
    const sources = this.sources.get(sessionId)!;

    session.stats.activeReaders = session.config.maxConcurrentReaders;

    return new Promise(resolve => {
      const processNextSource = () => {
        if (session.status === 'paused') return;

        const pendingOrApproved = sources.filter(
          s => s.state === 'pending' || s.state === 'approved'
        );

        if (pendingOrApproved.length === 0) {
          session.stats.activeReaders = 0;
          resolve();
          return;
        }

        // Take up to maxConcurrentReaders sources
        const toRead = pendingOrApproved.slice(0, session.config.maxConcurrentReaders);

        toRead.forEach(source => {
          // Auto-approve pending sources for reading
          if (source.state === 'pending') {
            source.state = 'approved';
            source.approvedAt = Date.now();
          }

          source.state = 'reading';
          source.stateChangedAt = Date.now();
          source.readStage = 'fetching';
          session.stats.sourcesReading++;

          this.emit(sessionId, {
            type: 'source:reading-started',
            sessionId,
            timestamp: Date.now(),
            data: { source },
          });

          // Simulate reading stages
          this.simulateReadingStages(sessionId, source).then(() => {
            processNextSource();
          });
        });
      };

      processNextSource();
    });
  }

  private async simulateReadingStages(sessionId: string, source: Source): Promise<void> {
    const session = this.sessions.get(sessionId)!;
    const stages: Array<'fetching' | 'parsing' | 'extracting' | 'complete'> = [
      'fetching',
      'parsing',
      'extracting',
      'complete',
    ];

    for (let i = 0; i < stages.length; i++) {
      await new Promise(r => setTimeout(r, this.READER_INTERVAL / stages.length));

      if (session.status === 'paused') return;

      source.readStage = stages[i];
      source.readProgress = (i + 1) / stages.length;

      this.emit(sessionId, {
        type: 'source:reading-progress',
        sessionId,
        timestamp: Date.now(),
        data: { sourceId: source.id, stage: stages[i], progress: source.readProgress },
      });
    }

    // Generate findings
    const findingCount = randomInt(2, 6);
    for (let i = 0; i < findingCount; i++) {
      const finding = generateMockFinding(source.id, sessionId, session.query);
      source.findings.push(finding);
      session.stats.findingsExtracted++;

      this.emit(sessionId, {
        type: 'finding:extracted',
        sessionId,
        timestamp: Date.now(),
        data: { finding },
      });
    }

    // Complete the source
    source.state = 'complete';
    source.stateChangedAt = Date.now();
    source.completedAt = Date.now();
    source.readTimeMs = this.READER_INTERVAL;
    source.tokenCount = randomInt(500, 2000);

    session.stats.sourcesReading--;
    session.stats.sourcesCompleted++;

    this.emit(sessionId, {
      type: 'source:completed',
      sessionId,
      timestamp: Date.now(),
      data: { source },
    });

    // Possibly detect a contradiction
    if (Math.random() < 0.15 && source.findings.length > 0) {
      const completedSources = this.sources.get(sessionId)!.filter(s => s.state === 'complete' && s.id !== source.id);
      if (completedSources.length > 0) {
        const otherSource = randomChoice(completedSources);
        if (otherSource.findings.length > 0) {
          const contradiction = generateMockContradiction(
            sessionId,
            source,
            otherSource,
            randomChoice(source.findings),
            randomChoice(otherSource.findings)
          );
          session.stats.contradictionsFound++;

          this.emit(sessionId, {
            type: 'contradiction:detected',
            sessionId,
            timestamp: Date.now(),
            data: { contradiction },
          });
        }
      }
    }
  }

  private async simulateSynthesis(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId)!;
    const sources = this.sources.get(sessionId)!;
    const completedSources = sources.filter(s => s.state === 'complete');

    // Create report structure
    const reportId = generateId();
    const sectionTitles = [
      'Executive Summary',
      'Background & Context',
      'Key Findings',
      'Analysis & Implications',
      'Conclusions & Recommendations',
    ];

    session.stats.sectionsTotal = sectionTitles.length;

    const sections: ReportSection[] = [];
    const toc: TOCEntry[] = [];

    // Generate sections progressively
    for (let i = 0; i < sectionTitles.length; i++) {
      const title = sectionTitles[i];

      // Add TOC entry as pending
      toc.push({
        id: `toc-${i}`,
        sectionId: `section-${i}`,
        title,
        level: 1,
        status: 'generating',
      });

      this.emit(sessionId, {
        type: 'report:section-started',
        sessionId,
        timestamp: Date.now(),
        data: { sectionId: `section-${i}`, title },
      });

      await new Promise(r => setTimeout(r, this.SECTION_INTERVAL));

      if (session.status === 'paused') return;

      // Generate section
      const section = generateMockReportSection(
        reportId,
        i,
        title,
        completedSources,
        session.query
      );
      sections.push(section);

      // Update TOC
      toc[i].status = 'complete';
      session.stats.sectionsCompleted++;

      this.emit(sessionId, {
        type: 'report:section-completed',
        sessionId,
        timestamp: Date.now(),
        data: { section },
      });
    }

    // Create final report
    const report: Report = {
      id: reportId,
      sessionId,
      title: `Deep Research: ${session.query}`,
      subtitle: `Generated ${new Date().toLocaleDateString()}`,
      summary: `This report synthesizes ${completedSources.length} sources to provide a comprehensive analysis of ${session.query}.`,
      sections,
      tableOfContents: toc,
      totalWordCount: sections.reduce((sum, s) => sum + s.wordCount, 0),
      totalCitations: sections.reduce((sum, s) => sum + s.citations.length, 0),
      totalContradictions: session.stats.contradictionsFound,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      completedAt: Date.now(),
    };

    this.reports.set(sessionId, report);
    session.report = report;

    this.emit(sessionId, {
      type: 'report:completed',
      sessionId,
      timestamp: Date.now(),
      data: { report },
    });
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private getConfigForDepth(depth: DepthProfile): ResearchConfig {
    const base = {
      light: { maxSources: 10, maxConcurrentReaders: 2, maxConcurrentScouts: 2 },
      general: { maxSources: 30, maxConcurrentReaders: 3, maxConcurrentScouts: 3 },
      exhaustive: { maxSources: 100, maxConcurrentReaders: 5, maxConcurrentScouts: 5 },
    };

    const cfg = base[depth];

    return {
      maxSources: cfg.maxSources,
      maxConcurrentReaders: cfg.maxConcurrentReaders,
      maxConcurrentScouts: cfg.maxConcurrentScouts,
      timeoutPerSourceMs: 30000,
      autoApprove: true,
      autoApproveThreshold: 0.7,
    };
  }

  private createInitialStats(): ResearchStats {
    return {
      sourcesSearched: 0,
      sourcesQueued: 0,
      sourcesReading: 0,
      sourcesCompleted: 0,
      sourcesRejected: 0,
      sourcesFailed: 0,
      findingsExtracted: 0,
      contradictionsFound: 0,
      contradictionsResolved: 0,
      sectionsCompleted: 0,
      sectionsTotal: 0,
      elapsedMs: 0,
      estimatedCostUsd: 0,
      activeScouts: 0,
      activeReaders: 0,
    };
  }
}

// Singleton instance
export const mockResearchService = new MockResearchService();
