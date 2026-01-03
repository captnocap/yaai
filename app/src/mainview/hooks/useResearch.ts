// =============================================================================
// USE RESEARCH
// =============================================================================
// Hook for interacting with the deep research system.
// Manages sessions, sources, report generation, and real-time updates.
// Currently uses mock service - structured for easy WebSocket swap later.

import { useState, useCallback, useEffect, useRef } from 'react';
import { mockResearchService } from '../lib/research/mock-research-service';
import type {
  ResearchSession,
  ResearchStats,
  SessionStatus,
  DepthProfile,
  Source,
  SourceState,
  Finding,
  Contradiction,
  Report,
  ReportSection,
  SessionGuidance,
  GuidanceNote,
  ResearchEvent,
  ResearchEventType,
  GalaxyNode,
  GalaxyEdge,
  ScoutAgent,
  GalaxyViewMode,
} from '../../shared/research-types';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export type ViewMode = 'list' | 'galaxy' | 'cinematic';

export interface UseResearchReturn {
  // Session state
  session: ResearchSession | null;
  sources: Source[];
  report: Report | null;
  loading: boolean;
  error: string | null;

  // Derived state
  pendingSources: Source[];
  approvedSources: Source[];
  readingSources: Source[];
  completedSources: Source[];
  rejectedSources: Source[];
  unresolvedContradictions: Contradiction[];

  // View state
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  selectedSourceId: string | null;
  setSelectedSourceId: (id: string | null) => void;

  // Session operations
  createSession: (query: string, depthProfile: DepthProfile, chatId?: string, messageId?: string) => Promise<ResearchSession>;
  loadSession: (sessionId: string) => Promise<void>;
  startSession: () => Promise<void>;
  pauseSession: () => Promise<void>;
  resumeSession: () => Promise<void>;
  deleteSession: () => Promise<void>;

  // Source operations
  approveSource: (sourceId: string, comment?: string) => Promise<void>;
  rejectSource: (sourceId: string, reason?: string, blockDomain?: boolean) => Promise<void>;
  approveAll: () => Promise<void>;

  // Contradiction operations
  resolveContradiction: (
    contradictionId: string,
    resolution: 'trust_a' | 'trust_b' | 'use_both' | 'dismiss'
  ) => Promise<void>;

  // Guidance operations
  addNote: (content: string) => Promise<void>;
  removeNote: (noteId: string) => Promise<void>;
  blockDomain: (domain: string) => Promise<void>;
  unblockDomain: (domain: string) => Promise<void>;

  // Galaxy state (for visualization)
  galaxyNodes: GalaxyNode[];
  galaxyEdges: GalaxyEdge[];
  galaxyScouts: ScoutAgent[];
  galaxyViewMode: GalaxyViewMode;
  setGalaxyViewMode: (mode: GalaxyViewMode) => void;

  // Utility
  getSourceById: (id: string) => Source | undefined;
  refresh: () => Promise<void>;
}

// -----------------------------------------------------------------------------
// HOOK IMPLEMENTATION
// -----------------------------------------------------------------------------

export function useResearch(initialSessionId?: string): UseResearchReturn {
  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  const [session, setSession] = useState<ResearchSession | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [galaxyViewMode, setGalaxyViewMode] = useState<GalaxyViewMode>('galaxy');

  // Galaxy state
  const [galaxyNodes, setGalaxyNodes] = useState<GalaxyNode[]>([]);
  const [galaxyEdges, setGalaxyEdges] = useState<GalaxyEdge[]>([]);
  const [galaxyScouts, setGalaxyScouts] = useState<ScoutAgent[]>([]);

  // Refs
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  // ---------------------------------------------------------------------------
  // DERIVED STATE
  // ---------------------------------------------------------------------------

  const pendingSources = sources.filter(s => s.state === 'pending');
  const approvedSources = sources.filter(s => s.state === 'approved');
  const readingSources = sources.filter(s => s.state === 'reading');
  const completedSources = sources.filter(s => s.state === 'complete');
  const rejectedSources = sources.filter(s => s.state === 'rejected');

  const unresolvedContradictions: Contradiction[] = report?.sections
    .flatMap(s => s.contradictions)
    .filter(c => c.status === 'unresolved') || [];

  // ---------------------------------------------------------------------------
  // EVENT HANDLING
  // ---------------------------------------------------------------------------

  const handleEvent = useCallback((event: ResearchEvent) => {
    switch (event.type) {
      // Session events
      case 'session:created':
      case 'session:started':
      case 'session:paused':
      case 'session:resumed':
      case 'session:completed':
      case 'session:failed': {
        const data = event.data as { session?: ResearchSession; status?: SessionStatus };
        if (data.session) {
          setSession(data.session);
        }
        break;
      }

      case 'session:stats-updated': {
        const data = event.data as { stats: ResearchStats };
        setSession(prev => prev ? { ...prev, stats: data.stats, updatedAt: Date.now() } : null);
        break;
      }

      // Source events
      case 'source:discovered': {
        const data = event.data as { source: Source };
        setSources(prev => [...prev, data.source]);
        addGalaxyNode(data.source);
        break;
      }

      case 'source:approved':
      case 'source:rejected':
      case 'source:reading-started':
      case 'source:completed':
      case 'source:failed': {
        const data = event.data as { source: Source };
        setSources(prev => prev.map(s => s.id === data.source.id ? data.source : s));
        updateGalaxyNode(data.source);
        break;
      }

      case 'source:reading-progress': {
        const data = event.data as { sourceId: string; stage: string; progress: number };
        setSources(prev => prev.map(s =>
          s.id === data.sourceId
            ? { ...s, readStage: data.stage as Source['readStage'], readProgress: data.progress }
            : s
        ));
        break;
      }

      // Finding events
      case 'finding:extracted': {
        const data = event.data as { finding: Finding };
        setSources(prev => prev.map(s =>
          s.id === data.finding.sourceId
            ? { ...s, findings: [...s.findings, data.finding] }
            : s
        ));
        break;
      }

      // Contradiction events
      case 'contradiction:detected': {
        const data = event.data as { contradiction: Contradiction };
        // Contradictions are stored in report sections
        // This is primarily for UI notifications
        break;
      }

      case 'contradiction:resolved': {
        const data = event.data as { contradictionId: string; resolution: string };
        setReport(prev => {
          if (!prev) return null;
          return {
            ...prev,
            sections: prev.sections.map(section => ({
              ...section,
              contradictions: section.contradictions.map(c =>
                c.id === data.contradictionId
                  ? { ...c, status: 'resolved' as const, resolution: { type: data.resolution as any, resolvedAt: Date.now() } }
                  : c
              ),
            })),
          };
        });
        break;
      }

      // Report events
      case 'report:section-started': {
        // Could show loading indicator for section
        break;
      }

      case 'report:section-completed': {
        const data = event.data as { section: ReportSection };
        setReport(prev => {
          if (!prev) {
            // First section - create report
            return {
              id: `report-${sessionIdRef.current}`,
              sessionId: sessionIdRef.current || '',
              title: `Research Report`,
              summary: '',
              sections: [data.section],
              tableOfContents: [{
                id: `toc-${data.section.order}`,
                sectionId: data.section.id,
                title: data.section.title,
                level: data.section.level,
                status: 'complete',
              }],
              totalWordCount: data.section.wordCount,
              totalCitations: data.section.citations.length,
              totalContradictions: data.section.contradictions.length,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            };
          }

          // Add to existing report
          const existingIndex = prev.sections.findIndex(s => s.id === data.section.id);
          const newSections = existingIndex >= 0
            ? prev.sections.map((s, i) => i === existingIndex ? data.section : s)
            : [...prev.sections, data.section];

          return {
            ...prev,
            sections: newSections,
            tableOfContents: newSections.map(s => ({
              id: `toc-${s.order}`,
              sectionId: s.id,
              title: s.title,
              level: s.level,
              status: s.status,
            })),
            totalWordCount: newSections.reduce((sum, s) => sum + s.wordCount, 0),
            totalCitations: newSections.reduce((sum, s) => sum + s.citations.length, 0),
            totalContradictions: newSections.reduce((sum, s) => sum + s.contradictions.length, 0),
            updatedAt: Date.now(),
          };
        });
        break;
      }

      case 'report:completed': {
        const data = event.data as { report: Report };
        setReport(data.report);
        break;
      }
    }
  }, []);

  // ---------------------------------------------------------------------------
  // GALAXY HELPERS
  // ---------------------------------------------------------------------------

  const addGalaxyNode = useCallback((source: Source) => {
    // Position nodes in a spiral pattern from center
    const existingCount = galaxyNodes.length;
    const angle = existingCount * 0.5;
    const radius = 20 + existingCount * 3;

    const node: GalaxyNode = {
      id: `node-${source.id}`,
      type: 'source',
      position: [
        Math.cos(angle) * radius,
        (Math.random() - 0.5) * 20,
        Math.sin(angle) * radius,
      ],
      targetPosition: [
        Math.cos(angle) * radius,
        (Math.random() - 0.5) * 20,
        Math.sin(angle) * radius,
      ],
      velocity: [0, 0, 0],
      radius: 2 + source.relevanceScore * 2,
      color: getStateColor(source.state),
      emissiveIntensity: 0.5,
      opacity: 1,
      sourceId: source.id,
      state: source.state,
      relevance: source.relevanceScore,
      thumbnail: source.thumbnail ? { url: source.thumbnail, loaded: false } : undefined,
      connections: [],
    };

    setGalaxyNodes(prev => [...prev, node]);
  }, [galaxyNodes.length]);

  const updateGalaxyNode = useCallback((source: Source) => {
    setGalaxyNodes(prev => prev.map(node =>
      node.sourceId === source.id
        ? {
            ...node,
            state: source.state,
            color: getStateColor(source.state),
            emissiveIntensity: source.state === 'reading' ? 1.5 : 0.5,
          }
        : node
    ));
  }, []);

  // ---------------------------------------------------------------------------
  // SESSION OPERATIONS
  // ---------------------------------------------------------------------------

  const createSession = useCallback(async (
    query: string,
    depthProfile: DepthProfile,
    chatId?: string,
    messageId?: string
  ): Promise<ResearchSession> => {
    try {
      setLoading(true);
      setError(null);

      const newSession = await mockResearchService.createSession(query, depthProfile, chatId, messageId);
      sessionIdRef.current = newSession.id;
      setSession(newSession);
      setSources([]);
      setReport(null);
      setGalaxyNodes([]);
      setGalaxyEdges([]);

      // Subscribe to events
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      unsubscribeRef.current = mockResearchService.subscribe(newSession.id, handleEvent);

      return newSession;
    } catch (err) {
      setError((err as Error).message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [handleEvent]);

  const loadSession = useCallback(async (sessionId: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const result = await mockResearchService.getSession(sessionId);
      if (!result) {
        throw new Error('Session not found');
      }

      sessionIdRef.current = sessionId;
      setSession(result.session);
      setSources(result.sources);
      setReport(result.report || null);

      // Rebuild galaxy state from sources
      setGalaxyNodes([]);
      setGalaxyEdges([]);
      result.sources.forEach(source => {
        addGalaxyNode(source);
      });

      // Subscribe to events
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      unsubscribeRef.current = mockResearchService.subscribe(sessionId, handleEvent);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [handleEvent, addGalaxyNode]);

  const startSession = useCallback(async (): Promise<void> => {
    if (!session) return;
    try {
      setError(null);
      await mockResearchService.startSession(session.id);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [session]);

  const pauseSession = useCallback(async (): Promise<void> => {
    if (!session) return;
    try {
      setError(null);
      await mockResearchService.pauseSession(session.id);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [session]);

  const resumeSession = useCallback(async (): Promise<void> => {
    if (!session) return;
    try {
      setError(null);
      await mockResearchService.resumeSession(session.id);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [session]);

  const deleteSession = useCallback(async (): Promise<void> => {
    if (!session) return;
    // Reset state
    setSession(null);
    setSources([]);
    setReport(null);
    setGalaxyNodes([]);
    setGalaxyEdges([]);
    sessionIdRef.current = null;

    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
  }, [session]);

  // ---------------------------------------------------------------------------
  // SOURCE OPERATIONS
  // ---------------------------------------------------------------------------

  const approveSource = useCallback(async (sourceId: string, comment?: string): Promise<void> => {
    if (!session) return;
    try {
      setError(null);
      await mockResearchService.approveSource(session.id, sourceId);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [session]);

  const rejectSource = useCallback(async (
    sourceId: string,
    reason?: string,
    blockDomain?: boolean
  ): Promise<void> => {
    if (!session) return;
    try {
      setError(null);
      await mockResearchService.rejectSource(session.id, sourceId, reason, blockDomain);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [session]);

  const approveAll = useCallback(async (): Promise<void> => {
    if (!session) return;
    try {
      setError(null);
      for (const source of pendingSources) {
        await mockResearchService.approveSource(session.id, source.id);
      }
    } catch (err) {
      setError((err as Error).message);
    }
  }, [session, pendingSources]);

  // ---------------------------------------------------------------------------
  // CONTRADICTION OPERATIONS
  // ---------------------------------------------------------------------------

  const resolveContradiction = useCallback(async (
    contradictionId: string,
    resolution: 'trust_a' | 'trust_b' | 'use_both' | 'dismiss'
  ): Promise<void> => {
    if (!session) return;
    try {
      setError(null);
      await mockResearchService.resolveContradiction(session.id, contradictionId, resolution);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [session]);

  // ---------------------------------------------------------------------------
  // GUIDANCE OPERATIONS
  // ---------------------------------------------------------------------------

  const addNote = useCallback(async (content: string): Promise<void> => {
    if (!session) return;
    const newNote: GuidanceNote = {
      id: `note-${Date.now()}`,
      content,
      createdAt: Date.now(),
    };
    setSession(prev => prev ? {
      ...prev,
      guidance: {
        ...prev.guidance,
        userNotes: [...prev.guidance.userNotes, newNote],
      },
    } : null);
  }, [session]);

  const removeNote = useCallback(async (noteId: string): Promise<void> => {
    if (!session) return;
    setSession(prev => prev ? {
      ...prev,
      guidance: {
        ...prev.guidance,
        userNotes: prev.guidance.userNotes.filter(n => n.id !== noteId),
      },
    } : null);
  }, [session]);

  const blockDomain = useCallback(async (domain: string): Promise<void> => {
    if (!session) return;
    setSession(prev => prev ? {
      ...prev,
      guidance: {
        ...prev.guidance,
        blockedDomains: [...prev.guidance.blockedDomains, domain],
      },
    } : null);
  }, [session]);

  const unblockDomain = useCallback(async (domain: string): Promise<void> => {
    if (!session) return;
    setSession(prev => prev ? {
      ...prev,
      guidance: {
        ...prev.guidance,
        blockedDomains: prev.guidance.blockedDomains.filter(d => d !== domain),
      },
    } : null);
  }, [session]);

  // ---------------------------------------------------------------------------
  // UTILITY
  // ---------------------------------------------------------------------------

  const getSourceById = useCallback((id: string): Source | undefined => {
    return sources.find(s => s.id === id);
  }, [sources]);

  const refresh = useCallback(async (): Promise<void> => {
    if (sessionIdRef.current) {
      await loadSession(sessionIdRef.current);
    }
  }, [loadSession]);

  // ---------------------------------------------------------------------------
  // EFFECTS
  // ---------------------------------------------------------------------------

  // Load initial session if provided
  useEffect(() => {
    if (initialSessionId) {
      loadSession(initialSessionId);
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [initialSessionId]);

  // ---------------------------------------------------------------------------
  // RETURN
  // ---------------------------------------------------------------------------

  return {
    // Session state
    session,
    sources,
    report,
    loading,
    error,

    // Derived state
    pendingSources,
    approvedSources,
    readingSources,
    completedSources,
    rejectedSources,
    unresolvedContradictions,

    // View state
    viewMode,
    setViewMode,
    selectedSourceId,
    setSelectedSourceId,

    // Session operations
    createSession,
    loadSession,
    startSession,
    pauseSession,
    resumeSession,
    deleteSession,

    // Source operations
    approveSource,
    rejectSource,
    approveAll,

    // Contradiction operations
    resolveContradiction,

    // Guidance operations
    addNote,
    removeNote,
    blockDomain,
    unblockDomain,

    // Galaxy state
    galaxyNodes,
    galaxyEdges,
    galaxyScouts,
    galaxyViewMode,
    setGalaxyViewMode,

    // Utility
    getSourceById,
    refresh,
  };
}

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

function getStateColor(state: SourceState): string {
  switch (state) {
    case 'pending':
      return '#F59E0B'; // Amber
    case 'approved':
      return '#3B82F6'; // Blue
    case 'reading':
      return '#8B5CF6'; // Purple
    case 'complete':
      return '#10B981'; // Emerald
    case 'rejected':
      return '#EF4444'; // Red
    case 'failed':
      return '#F97316'; // Orange
    default:
      return '#6B7280'; // Gray
  }
}

// -----------------------------------------------------------------------------
// EXPORT HOOK FOR CREATING NEW SESSIONS (Simpler API)
// -----------------------------------------------------------------------------

export function useCreateResearch() {
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = useCallback(async (
    query: string,
    depthProfile: DepthProfile = 'general',
    chatId?: string,
    messageId?: string
  ): Promise<ResearchSession | null> => {
    try {
      setCreating(true);
      setError(null);
      const session = await mockResearchService.createSession(query, depthProfile, chatId, messageId);
      return session;
    } catch (err) {
      setError((err as Error).message);
      return null;
    } finally {
      setCreating(false);
    }
  }, []);

  return { create, creating, error };
}

// -----------------------------------------------------------------------------
// EXPORT HOOK FOR LISTING SESSIONS
// -----------------------------------------------------------------------------

export function useResearchSessions() {
  const [sessions, setSessions] = useState<ResearchSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const list = await mockResearchService.listSessions();
      setSessions(list);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { sessions, loading, error, refresh };
}
