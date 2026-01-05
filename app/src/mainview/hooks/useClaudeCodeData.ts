// =============================================================================
// USE CLAUDE CODE DATA
// =============================================================================
// Hook for reading Claude Code's existing data (sessions, transcripts, plans).
// This reads from Claude's files in ~/.claude/ and our archives in ~/.yaai/

import { useState, useCallback, useEffect, useRef } from 'react';
import { sendMessage, onMessage } from '../lib/comm-bridge';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface ClaudeSession {
  id: string;
  projectPath: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  isAgent: boolean;
}

export interface ClaudeTranscriptEntry {
  uuid: string;
  parentUuid: string | null;
  type: 'user' | 'assistant';
  message: {
    role: string;
    content: any[];
  };
  sessionId: string;
  timestamp: string;
  slug?: string;
  cwd?: string;
  gitBranch?: string;
  version?: string;
  toolUseResult?: {
    stdout: string;
    stderr: string;
    interrupted: boolean;
    isImage: boolean;
  };
}

export interface ClaudePlan {
  slug: string;
  path: string;
  createdAt: string;
  updatedAt: string;
  sizeBytes: number;
}

export interface ClaudeHistoryEntry {
  display: string;
  timestamp: number;
  project: string;
}

export interface ArchivedSession {
  sessionId: string;
  projectPath: string;
  slug: string;
  createdAt: string;
  lastArchivedAt: string;
  entryCount: number;
}

export interface UseClaudeCodeDataOptions {
  /** Project path to filter sessions */
  projectPath?: string;
  /** Auto-load on mount */
  autoLoad?: boolean;
}

export interface UseClaudeCodeDataReturn {
  // Installation status
  isInstalled: boolean;
  version: string | null;

  // Projects
  projects: string[];

  // Sessions (from Claude's files)
  sessions: ClaudeSession[];

  // Archived sessions (from our storage - preserved history)
  archivedSessions: ArchivedSession[];

  // Current transcript
  transcript: ClaudeTranscriptEntry[];
  selectedSessionId: string | null;

  // Plans
  plans: ClaudePlan[];
  selectedPlanSlug: string | null;
  planContent: string | null;

  // History
  history: ClaudeHistoryEntry[];

  // Loading states
  loading: boolean;
  loadingTranscript: boolean;
  loadingPlan: boolean;
  error: string | null;

  // Actions
  refresh: () => Promise<void>;
  selectSession: (sessionId: string | null, fromArchive?: boolean) => Promise<void>;
  selectPlan: (slug: string | null) => Promise<void>;
  loadHistory: (limit?: number) => Promise<void>;
  watchSession: (sessionId: string) => Promise<void>;
  unwatchSession: (sessionId: string) => Promise<void>;
  clearError: () => void;
}

// -----------------------------------------------------------------------------
// HOOK
// -----------------------------------------------------------------------------

export function useClaudeCodeData(
  options: UseClaudeCodeDataOptions = {}
): UseClaudeCodeDataReturn {
  const { projectPath, autoLoad = true } = options;

  // Installation status
  const [isInstalled, setIsInstalled] = useState(false);
  const [version, setVersion] = useState<string | null>(null);

  // Projects
  const [projects, setProjects] = useState<string[]>([]);

  // Sessions
  const [sessions, setSessions] = useState<ClaudeSession[]>([]);
  const [archivedSessions, setArchivedSessions] = useState<ArchivedSession[]>([]);

  // Current transcript
  const [transcript, setTranscript] = useState<ClaudeTranscriptEntry[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [usingArchive, setUsingArchive] = useState(false);

  // Plans
  const [plans, setPlans] = useState<ClaudePlan[]>([]);
  const [selectedPlanSlug, setSelectedPlanSlug] = useState<string | null>(null);
  const [planContent, setPlanContent] = useState<string | null>(null);

  // History
  const [history, setHistory] = useState<ClaudeHistoryEntry[]>([]);

  // Loading states
  const [loading, setLoading] = useState(false);
  const [loadingTranscript, setLoadingTranscript] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialized = useRef(false);
  const currentProjectPath = useRef(projectPath);

  // ---------------------------------------------------------------------------
  // WEBSOCKET EVENT LISTENERS
  // ---------------------------------------------------------------------------

  useEffect(() => {
    // Listen for new entries being archived
    const unsubArchived = onMessage('claude-code:entry-archived', (data: any) => {
      if (data?.sessionId === selectedSessionId && usingArchive) {
        // Add new entry to transcript
        setTranscript(prev => [...prev, data.entry]);
      }
    });

    // Listen for compaction events
    const unsubCompacted = onMessage('claude-code:session-compacted', (data: any) => {
      console.log(`[ClaudeCode] Session ${data.sessionId} compacted, ${data.entriesLost} entries in archive only`);
    });

    return () => {
      unsubArchived();
      unsubCompacted();
    };
  }, [selectedSessionId, usingArchive]);

  // ---------------------------------------------------------------------------
  // LOAD DATA
  // ---------------------------------------------------------------------------

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Check installation
      const installed = await sendMessage<boolean>('claude-code:is-installed');
      setIsInstalled(installed);

      if (!installed) {
        setLoading(false);
        return;
      }

      // Get version
      const ver = await sendMessage<string | null>('claude-code:get-version');
      setVersion(ver);

      // Load projects
      const projs = await sendMessage<string[]>('claude-code:list-projects');
      setProjects(projs);

      // Load sessions for current/specified project
      const targetProject = currentProjectPath.current || projs[0];
      if (targetProject) {
        const sess = await sendMessage<ClaudeSession[]>('claude-code:list-sessions', {
          projectPath: targetProject,
        });
        setSessions(sess);
      }

      // Load archived sessions
      const archived = await sendMessage<ArchivedSession[]>('claude-code:list-archived-sessions');
      setArchivedSessions(archived);

      // Load plans
      const planList = await sendMessage<ClaudePlan[]>('claude-code:list-plans');
      setPlans(planList);
    } catch (err) {
      console.warn('[useClaudeCodeData] Failed to load data:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // SELECT SESSION
  // ---------------------------------------------------------------------------

  const selectSession = useCallback(async (
    sessionId: string | null,
    fromArchive = true
  ) => {
    setSelectedSessionId(sessionId);
    setUsingArchive(fromArchive);

    if (!sessionId) {
      setTranscript([]);
      return;
    }

    setLoadingTranscript(true);
    setError(null);

    try {
      // Find the session to get the project path
      const session = sessions.find(s => s.id === sessionId)
        || archivedSessions.find(s => s.sessionId === sessionId);

      const projPath = session
        ? ('projectPath' in session ? session.projectPath : session.projectPath)
        : currentProjectPath.current;

      if (!projPath) {
        throw new Error('Could not determine project path for session');
      }

      const entries = await sendMessage<ClaudeTranscriptEntry[]>(
        'claude-code:get-transcript',
        {
          projectPath: projPath,
          sessionId,
          fromArchive,
        }
      );

      setTranscript(entries || []);

      // Start watching for live updates if using archive
      if (fromArchive) {
        await sendMessage('claude-code:watch-session', {
          projectPath: projPath,
          sessionId,
        });
      }
    } catch (err) {
      setError((err as Error).message);
      setTranscript([]);
    } finally {
      setLoadingTranscript(false);
    }
  }, [sessions, archivedSessions]);

  // ---------------------------------------------------------------------------
  // SELECT PLAN
  // ---------------------------------------------------------------------------

  const selectPlan = useCallback(async (slug: string | null) => {
    setSelectedPlanSlug(slug);

    if (!slug) {
      setPlanContent(null);
      return;
    }

    setLoadingPlan(true);
    setError(null);

    try {
      const content = await sendMessage<string | null>('claude-code:get-plan', { slug });
      setPlanContent(content);
    } catch (err) {
      setError((err as Error).message);
      setPlanContent(null);
    } finally {
      setLoadingPlan(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // HISTORY
  // ---------------------------------------------------------------------------

  const loadHistory = useCallback(async (limit = 100) => {
    try {
      const hist = await sendMessage<ClaudeHistoryEntry[]>('claude-code:get-history', { limit });
      setHistory(hist || []);
    } catch (err) {
      console.warn('[useClaudeCodeData] Failed to load history:', err);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // WATCH/UNWATCH
  // ---------------------------------------------------------------------------

  const watchSession = useCallback(async (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    await sendMessage('claude-code:watch-session', {
      projectPath: session.projectPath,
      sessionId,
    });
  }, [sessions]);

  const unwatchSession = useCallback(async (sessionId: string) => {
    await sendMessage('claude-code:unwatch-session', sessionId);
  }, []);

  // ---------------------------------------------------------------------------
  // INITIALIZATION
  // ---------------------------------------------------------------------------

  useEffect(() => {
    currentProjectPath.current = projectPath;
  }, [projectPath]);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    if (autoLoad) {
      refresh();
    }
  }, [autoLoad, refresh]);

  // Refresh when project path changes
  useEffect(() => {
    if (projectPath && initialized.current) {
      refresh();
    }
  }, [projectPath, refresh]);

  return {
    isInstalled,
    version,
    projects,
    sessions,
    archivedSessions,
    transcript,
    selectedSessionId,
    plans,
    selectedPlanSlug,
    planContent,
    history,
    loading,
    loadingTranscript,
    loadingPlan,
    error,
    refresh,
    selectSession,
    selectPlan,
    loadHistory,
    watchSession,
    unwatchSession,
    clearError: () => setError(null),
  };
}
