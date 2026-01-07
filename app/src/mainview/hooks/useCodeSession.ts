// =============================================================================
// USE CODE SESSION
// =============================================================================
// Hook for managing Claude Code CLI sessions.
// Handles session lifecycle, transcript, prompts, and restore points.

import { useState, useCallback, useEffect, useRef } from 'react';
import type {
  CodeSession,
  CodeSessionStatus,
  SessionOptions,
  TranscriptEntry,
  InputPrompt,
  ParsedOutput,
  FileEditData,
  CompactMarkerData,
} from '../types/code-session';
import type { RestorePoint } from '../types/snapshot';
import type { Plan } from '../types/plan';
import { sendMessage, onMessage, isConnected } from '../lib/comm-bridge';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface UseCodeSessionOptions {
  /** Auto-load transcript on session select */
  autoLoadTranscript?: boolean;
  /** Auto-load restore points on session select */
  autoLoadRestorePoints?: boolean;
}

export interface UseCodeSessionReturn {
  // State
  session: CodeSession | null;
  transcript: TranscriptEntry[];
  currentPrompt: InputPrompt | null;
  restorePoints: RestorePoint[];
  plan: Plan | null;
  loading: boolean;
  error: string | null;
  isStreaming: boolean;

  // Session lifecycle
  startSession: (projectPath: string, options?: SessionOptions) => Promise<CodeSession>;
  stopSession: () => Promise<void>;
  pauseSession: () => Promise<void>;
  resumeSession: () => Promise<void>;

  // Input
  sendInput: (input: string) => Promise<void>;
  sendYesNo: (answer: boolean) => Promise<void>;
  sendSelection: (index: number) => Promise<void>;

  // Restore points
  createRestorePoint: (description: string) => Promise<RestorePoint>;
  restoreToPoint: (restorePointId: string) => Promise<void>;
  refreshRestorePoints: () => Promise<void>;

  // Session management
  selectSession: (sessionId: string | null) => Promise<void>;
  deleteSession: () => Promise<boolean>;
  refreshTranscript: () => Promise<void>;

  // Utilities
  clearError: () => void;
}

// -----------------------------------------------------------------------------
// WEBSOCKET COMMUNICATION WITH DEMO FALLBACK
// -----------------------------------------------------------------------------

// Track if we're in demo mode (WebSocket not connected)
let isDemoMode = false;

async function sendWS<T>(channel: string, data?: unknown): Promise<T> {
  try {
    return await sendMessage<T>(channel, data);
  } catch (err) {
    // Fall back to mock in demo mode
    console.warn('[useCodeSession] WebSocket not available, using mock');
    isDemoMode = true;
    return handleMockWS<T>(channel, data);
  }
}

// -----------------------------------------------------------------------------
// MOCK WS FOR DEMO MODE
// -----------------------------------------------------------------------------

// In-memory mock state
const mockState = {
  sessions: new Map<string, CodeSession>(),
  transcripts: new Map<string, TranscriptEntry[]>(),
  restorePoints: new Map<string, import('../types/snapshot').RestorePoint[]>(),
};

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

async function handleMockWS<T>(channel: string, data?: unknown): Promise<T> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 100));

  switch (channel) {
    case 'code-session:start': {
      const { projectPath } = data as { projectPath: string };
      const session: CodeSession = {
        id: generateId('session'),
        projectPath,
        status: 'running',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      mockState.sessions.set(session.id, session);
      mockState.transcripts.set(session.id, []);
      mockState.restorePoints.set(session.id, []);

      // Simulate initial Claude response after a delay
      setTimeout(() => {
        const transcript = mockState.transcripts.get(session.id) || [];
        transcript.push({
          id: generateId('entry'),
          sessionId: session.id,
          type: 'assistant_output',
          content: `Welcome! I'm Claude Code running in demo mode.\n\nProject: ${projectPath}\n\nThis is a simulated session - WebSocket to the backend is not connected. In a real session, I would be able to:\n- Read and edit files\n- Run commands\n- Help you code\n\nTry sending a message to see how the UI works!`,
          timestamp: new Date().toISOString(),
        });
        mockState.transcripts.set(session.id, transcript);
      }, 500);

      return session as T;
    }

    case 'code-session:stop': {
      const sessionId = data as string;
      const session = mockState.sessions.get(sessionId);
      if (session) {
        session.status = 'stopped';
      }
      return undefined as T;
    }

    case 'code-session:list': {
      return Array.from(mockState.sessions.values()) as T;
    }

    case 'code-session:get': {
      const sessionId = data as string;
      return (mockState.sessions.get(sessionId) || null) as T;
    }

    case 'code-session:transcript': {
      const sessionId = data as string;
      return (mockState.transcripts.get(sessionId) || []) as T;
    }

    case 'code-session:current-prompt': {
      return null as T;
    }

    case 'code-session:restore-points': {
      const sessionId = data as string;
      return (mockState.restorePoints.get(sessionId) || []) as T;
    }

    case 'code-session:input': {
      const { sessionId, input } = data as { sessionId: string; input: string };
      const transcript = mockState.transcripts.get(sessionId) || [];

      // Add user input
      transcript.push({
        id: generateId('entry'),
        sessionId,
        type: 'user_input',
        content: input,
        timestamp: new Date().toISOString(),
      });

      // Simulate Claude response
      setTimeout(() => {
        transcript.push({
          id: generateId('entry'),
          sessionId,
          type: 'assistant_output',
          content: `[Demo Mode] I received your message: "${input}"\n\nIn a real session, I would process this and help you with your coding task. The UI you're seeing demonstrates:\n- Message threading\n- Streaming indicators\n- Interactive prompts\n- Restore points`,
          timestamp: new Date().toISOString(),
        });
        mockState.transcripts.set(sessionId, transcript);
      }, 800);

      mockState.transcripts.set(sessionId, transcript);
      return undefined as T;
    }

    case 'code-session:create-restore': {
      const { sessionId, description } = data as { sessionId: string; description: string };
      const restorePoint: import('../types/snapshot').RestorePoint = {
        id: generateId('rp'),
        sessionId,
        description,
        timestamp: new Date().toISOString(),
        files: [],
        transcriptEntryId: '',
        totalSize: 0,
        fileCount: 0,
      };
      const points = mockState.restorePoints.get(sessionId) || [];
      points.unshift(restorePoint);
      mockState.restorePoints.set(sessionId, points);
      return restorePoint as T;
    }

    default:
      console.warn(`[useCodeSession] Unhandled mock channel: ${channel}`);
      return null as T;
  }
}

// -----------------------------------------------------------------------------
// HOOK
// -----------------------------------------------------------------------------

export function useCodeSession(
  sessionId: string | null,
  options: UseCodeSessionOptions = {}
): UseCodeSessionReturn {
  const {
    autoLoadTranscript = true,
    autoLoadRestorePoints = true,
  } = options;

  // State
  const [session, setSession] = useState<CodeSession | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [currentPrompt, setCurrentPrompt] = useState<InputPrompt | null>(null);
  const [restorePoints, setRestorePoints] = useState<RestorePoint[]>([]);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  // Refs
  const currentSessionId = useRef<string | null>(null);

  // ---------------------------------------------------------------------------
  // WEBSOCKET EVENT LISTENERS
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const unsubOutput = onMessage('code-session:output', (data: any) => {
      if (data?.sessionId !== currentSessionId.current) return;

      const messageId = data.messageId || `entry_${Date.now()}`;
      const isStreamingUpdate = data.isStreaming === true;

      setTranscript(prev => {
        // Look for existing entry with this messageId
        const existingIndex = prev.findIndex(e => e.id === messageId);

        if (existingIndex >= 0) {
          // Update existing entry
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            content: data.content,
          };
          return updated;
        } else {
          // Add new entry
          const entry: TranscriptEntry = {
            id: messageId,
            sessionId: data.sessionId,
            type: 'assistant_output',
            content: data.content,
            timestamp: new Date().toISOString(),
          };
          return [...prev, entry];
        }
      });

      setIsStreaming(isStreamingUpdate);
    });

    const unsubPrompt = onMessage('code-session:prompt', (data: any) => {
      if (data?.sessionId !== currentSessionId.current) return;
      setCurrentPrompt(data.prompt);
      setIsStreaming(false);
    });

    const unsubFileEdit = onMessage('code-session:file-edit', (data: any) => {
      if (data?.sessionId !== currentSessionId.current) return;

      // Update transcript with file edit info
      const entry: TranscriptEntry = {
        id: `entry_${Date.now()}`,
        sessionId: data.sessionId,
        type: 'file_edit',
        content: `Edited: ${data.edit.path}`,
        timestamp: new Date().toISOString(),
        fileEdit: data.edit,
        restorePointId: data.restorePointId,
      };

      setTranscript(prev => [...prev, entry]);

      // Refresh restore points
      if (autoLoadRestorePoints) {
        refreshRestorePoints();
      }
    });

    const unsubCompact = onMessage('code-session:compact', (data: any) => {
      if (data?.sessionId !== currentSessionId.current) return;

      // Add compact marker and mark previous entries
      const entry: TranscriptEntry = {
        id: `entry_${Date.now()}`,
        sessionId: data.sessionId,
        type: 'compact_marker',
        content: 'Context compacted',
        timestamp: new Date().toISOString(),
        compactMarker: data.marker,
      };

      setTranscript(prev => {
        const updated = prev.map(e => ({ ...e, isCompacted: true }));
        return [...updated, entry];
      });
    });

    const unsubPlanUpdate = onMessage('code-session:plan-update', (data: any) => {
      if (data?.sessionId !== currentSessionId.current) return;
      setPlan(data.plan);
    });

    const unsubStatus = onMessage('code-session:status', (data: any) => {
      if (data?.sessionId !== currentSessionId.current) return;

      setSession(prev => prev ? { ...prev, status: data.status } : null);

      if (data.status === 'running') {
        setIsStreaming(true);
        setCurrentPrompt(null);
      } else if (data.status === 'waiting_input') {
        setIsStreaming(false);
      } else if (data.status === 'stopped') {
        setIsStreaming(false);
      }
    });

    const unsubError = onMessage('code-session:error', (data: any) => {
      if (data?.sessionId !== currentSessionId.current) return;
      setError(data.error);
      setIsStreaming(false);
    });

    const unsubEnded = onMessage('code-session:ended', (data: any) => {
      if (data?.sessionId !== currentSessionId.current) return;
      setSession(prev => prev ? { ...prev, status: 'stopped' } : null);
      setIsStreaming(false);
    });

    return () => {
      unsubOutput();
      unsubPrompt();
      unsubFileEdit();
      unsubCompact();
      unsubPlanUpdate();
      unsubStatus();
      unsubError();
      unsubEnded();
    };
  }, [autoLoadRestorePoints]);

  // ---------------------------------------------------------------------------
  // LOAD SESSION DATA
  // ---------------------------------------------------------------------------

  useEffect(() => {
    currentSessionId.current = sessionId;

    if (!sessionId) {
      setSession(null);
      setTranscript([]);
      setCurrentPrompt(null);
      setRestorePoints([]);
      setPlan(null);
      return;
    }

    loadSession(sessionId);
  }, [sessionId]);

  // ---------------------------------------------------------------------------
  // DEMO MODE POLLING
  // ---------------------------------------------------------------------------

  // Poll for transcript updates in demo mode (since we don't have real WS events)
  useEffect(() => {
    if (!isDemoMode || !currentSessionId.current) return;

    const pollInterval = setInterval(async () => {
      if (!currentSessionId.current) return;

      try {
        const entries = await sendWS<TranscriptEntry[]>(
          'code-session:transcript',
          currentSessionId.current
        );
        if (entries && entries.length !== transcript.length) {
          setTranscript(entries);
        }
      } catch {
        // Ignore polling errors
      }
    }, 500);

    return () => clearInterval(pollInterval);
  }, [transcript.length]);

  const loadSession = async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      // Load session
      const sess = await sendWS<CodeSession | null>('code-session:get', id);
      setSession(sess);

      // Load transcript
      if (autoLoadTranscript) {
        const entries = await sendWS<TranscriptEntry[]>('code-session:transcript', id);
        setTranscript(entries || []);
      }

      // Load current prompt
      const prompt = await sendWS<InputPrompt | null>('code-session:current-prompt', id);
      setCurrentPrompt(prompt);

      // Load restore points
      if (autoLoadRestorePoints) {
        const points = await sendWS<RestorePoint[]>('code-session:restore-points', id);
        setRestorePoints(points || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load session');
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // SESSION LIFECYCLE
  // ---------------------------------------------------------------------------

  const startSession = useCallback(async (
    projectPath: string,
    options?: SessionOptions
  ): Promise<CodeSession> => {
    setLoading(true);
    setError(null);

    try {
      const newSession = await sendWS<CodeSession>('code-session:start', {
        projectPath,
        options,
      });

      currentSessionId.current = newSession.id;
      setSession(newSession);
      setTranscript([]);
      setCurrentPrompt(null);
      setRestorePoints([]);

      return newSession;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start session';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const stopSession = useCallback(async () => {
    if (!currentSessionId.current) return;

    try {
      await sendWS('code-session:stop', currentSessionId.current);
      setSession(prev => prev ? { ...prev, status: 'stopped' } : null);
      setIsStreaming(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop session');
    }
  }, []);

  const pauseSession = useCallback(async () => {
    if (!currentSessionId.current) return;

    try {
      await sendWS('code-session:pause', currentSessionId.current);
      setSession(prev => prev ? { ...prev, status: 'paused' } : null);
      setIsStreaming(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pause session');
    }
  }, []);

  const resumeSession = useCallback(async () => {
    if (!currentSessionId.current) return;

    try {
      await sendWS('code-session:resume', currentSessionId.current);
      setSession(prev => prev ? { ...prev, status: 'running' } : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resume session');
    }
  }, []);

  // ---------------------------------------------------------------------------
  // INPUT
  // ---------------------------------------------------------------------------

  const sendInput = useCallback(async (input: string) => {
    if (!currentSessionId.current) {
      setError('No active session');
      return;
    }

    // Add user input to transcript optimistically
    const entry: TranscriptEntry = {
      id: `entry_${Date.now()}`,
      sessionId: currentSessionId.current,
      type: 'user_input',
      content: input,
      timestamp: new Date().toISOString(),
    };
    setTranscript(prev => [...prev, entry]);

    // Clear prompt and set streaming
    setCurrentPrompt(null);
    setIsStreaming(true);

    try {
      await sendWS('code-session:input', {
        sessionId: currentSessionId.current,
        input,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send input');
      setIsStreaming(false);
    }
  }, []);

  const sendYesNo = useCallback(async (answer: boolean) => {
    if (!currentSessionId.current) return;

    setCurrentPrompt(null);
    setIsStreaming(true);

    // Add response to transcript
    const entry: TranscriptEntry = {
      id: `entry_${Date.now()}`,
      sessionId: currentSessionId.current,
      type: 'user_input',
      content: answer ? 'Yes' : 'No',
      timestamp: new Date().toISOString(),
    };
    setTranscript(prev => [...prev, entry]);

    try {
      await sendWS('code-session:yes-no', {
        sessionId: currentSessionId.current,
        answer,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send response');
      setIsStreaming(false);
    }
  }, []);

  const sendSelection = useCallback(async (index: number) => {
    if (!currentSessionId.current) return;

    const optionText = currentPrompt?.options?.[index - 1] || String(index);

    setCurrentPrompt(null);
    setIsStreaming(true);

    // Add selection to transcript
    const entry: TranscriptEntry = {
      id: `entry_${Date.now()}`,
      sessionId: currentSessionId.current,
      type: 'user_input',
      content: optionText,
      timestamp: new Date().toISOString(),
    };
    setTranscript(prev => [...prev, entry]);

    try {
      await sendWS('code-session:selection', {
        sessionId: currentSessionId.current,
        index,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send selection');
      setIsStreaming(false);
    }
  }, [currentPrompt]);

  // ---------------------------------------------------------------------------
  // RESTORE POINTS
  // ---------------------------------------------------------------------------

  const createRestorePoint = useCallback(async (description: string): Promise<RestorePoint> => {
    if (!currentSessionId.current) {
      throw new Error('No active session');
    }

    try {
      const restorePoint = await sendWS<RestorePoint>('code-session:create-restore', {
        sessionId: currentSessionId.current,
        description,
      });

      setRestorePoints(prev => [restorePoint, ...prev]);
      return restorePoint;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create restore point';
      setError(message);
      throw err;
    }
  }, []);

  const restoreToPoint = useCallback(async (restorePointId: string) => {
    if (!currentSessionId.current) return;

    setLoading(true);

    try {
      await sendWS('code-session:restore', {
        sessionId: currentSessionId.current,
        restorePointId,
      });

      // Refresh transcript after restore
      await refreshTranscript();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore');
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshRestorePoints = useCallback(async () => {
    if (!currentSessionId.current) return;

    try {
      const points = await sendWS<RestorePoint[]>(
        'code-session:restore-points',
        currentSessionId.current
      );
      setRestorePoints(points || []);
    } catch (err) {
      console.error('Failed to refresh restore points:', err);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // SESSION MANAGEMENT
  // ---------------------------------------------------------------------------

  const selectSession = useCallback(async (id: string | null) => {
    if (id === currentSessionId.current) return;

    currentSessionId.current = id;

    if (!id) {
      setSession(null);
      setTranscript([]);
      setCurrentPrompt(null);
      setRestorePoints([]);
      setPlan(null);
      return;
    }

    await loadSession(id);
  }, []);

  const deleteSession = useCallback(async (): Promise<boolean> => {
    if (!currentSessionId.current) return false;

    try {
      const result = await sendWS<boolean>('code-session:delete', currentSessionId.current);

      if (result) {
        currentSessionId.current = null;
        setSession(null);
        setTranscript([]);
        setCurrentPrompt(null);
        setRestorePoints([]);
        setPlan(null);
      }

      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete session');
      return false;
    }
  }, []);

  const refreshTranscript = useCallback(async () => {
    if (!currentSessionId.current) return;

    try {
      const entries = await sendWS<TranscriptEntry[]>(
        'code-session:transcript',
        currentSessionId.current
      );
      setTranscript(entries || []);
    } catch (err) {
      console.error('Failed to refresh transcript:', err);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ---------------------------------------------------------------------------
  // RETURN
  // ---------------------------------------------------------------------------

  return {
    // State
    session,
    transcript,
    currentPrompt,
    restorePoints,
    plan,
    loading,
    error,
    isStreaming,

    // Session lifecycle
    startSession,
    stopSession,
    pauseSession,
    resumeSession,

    // Input
    sendInput,
    sendYesNo,
    sendSelection,

    // Restore points
    createRestorePoint,
    restoreToPoint,
    refreshRestorePoints,

    // Session management
    selectSession,
    deleteSession,
    refreshTranscript,

    // Utilities
    clearError,
  };
}
