// =============================================================================
// USE WORKBENCH HOOK
// =============================================================================
// State management for the Prompt Workbench feature.

import { useState, useCallback, useEffect, useRef } from 'react';
import { sendMessage, onMessage, offMessage } from '../lib/comm-bridge';
import type {
  PromptType,
  MessageRole,
  MessageBlock,
  VariableDefinition,
  WorkbenchModelConfig,
  WorkbenchSession,
  PromptLibraryItem,
  CodeExportFormat,
  DEFAULT_MODEL_CONFIG,
  createEmptySession,
  extractSessionVariables,
} from '../types/workbench';

// Re-export types for convenience
export type {
  PromptType,
  MessageRole,
  MessageBlock,
  VariableDefinition,
  WorkbenchModelConfig,
  WorkbenchSession,
  PromptLibraryItem,
  CodeExportFormat,
};

// -----------------------------------------------------------------------------
// RETURN TYPE
// -----------------------------------------------------------------------------

export interface UseWorkbenchReturn {
  // Library
  prompts: PromptLibraryItem[];
  loading: boolean;
  error: string | null;

  // Active session
  session: WorkbenchSession | null;
  isDirty: boolean;

  // Library actions
  loadPrompts: () => Promise<void>;
  createPrompt: (type: PromptType, name?: string) => Promise<WorkbenchSession>;
  deletePrompt: (id: string) => Promise<void>;
  duplicatePrompt: (id: string, newName?: string) => Promise<WorkbenchSession | null>;

  // Session actions
  openSession: (id: string) => Promise<void>;
  closeSession: () => void;
  saveSession: () => Promise<void>;

  // Editor actions - general
  updateName: (name: string) => void;
  updateDescription: (description: string) => void;
  updateTags: (tags: string[]) => void;

  // Editor actions - text prompts
  setModelConfig: (config: Partial<WorkbenchModelConfig>) => void;
  addMessage: (role: MessageRole, afterId?: string) => void;
  updateMessage: (id: string, content: string) => void;
  removeMessage: (id: string) => void;
  setMessagePrefill: (id: string, isPrefill: boolean) => void;
  reorderMessages: (fromIndex: number, toIndex: number) => void;

  // Variables
  detectedVariables: string[];
  setVariableValue: (name: string, value: string) => void;
  getVariableValues: () => Record<string, string>;

  // Execution
  isGenerating: boolean;
  streamContent: string;
  runGeneration: () => Promise<void>;
  cancelGeneration: () => void;
  getCode: (format: CodeExportFormat) => Promise<string>;
}

// -----------------------------------------------------------------------------
// HOOK IMPLEMENTATION
// -----------------------------------------------------------------------------

export function useWorkbench(): UseWorkbenchReturn {
  // Library state
  const [prompts, setPrompts] = useState<PromptLibraryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Session state
  const [session, setSession] = useState<WorkbenchSession | null>(null);
  const [originalSession, setOriginalSession] = useState<WorkbenchSession | null>(null);

  // Execution state
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamContent, setStreamContent] = useState('');
  const activeRequestIdRef = useRef<string | null>(null);

  // Computed: is session dirty
  const isDirty = session !== null && JSON.stringify(session) !== JSON.stringify(originalSession);

  // Computed: detected variables in current session
  const detectedVariables = session?.type === 'text' && session.messages
    ? extractSessionVariablesLocal(session.messages)
    : [];

  // ---------------------------------------------------------------------------
  // EVENT HANDLERS
  // ---------------------------------------------------------------------------

  useEffect(() => {
    // Listen for session events
    const handleSessionCreated = (data: { session: WorkbenchSession }) => {
      setPrompts(prev => [{
        id: data.session.id,
        name: data.session.name,
        type: data.session.type,
        description: data.session.description,
        updatedAt: data.session.updatedAt,
        tags: data.session.tags,
      }, ...prev]);
    };

    const handleSessionUpdated = (data: { session: WorkbenchSession }) => {
      setPrompts(prev => prev.map(p =>
        p.id === data.session.id
          ? {
              id: data.session.id,
              name: data.session.name,
              type: data.session.type,
              description: data.session.description,
              updatedAt: data.session.updatedAt,
              tags: data.session.tags,
            }
          : p
      ));
    };

    const handleSessionDeleted = (data: { id: string }) => {
      setPrompts(prev => prev.filter(p => p.id !== data.id));
      if (session?.id === data.id) {
        setSession(null);
        setOriginalSession(null);
      }
    };

    // Streaming handlers
    const handleRunChunk = (data: { requestId: string; chunk: string }) => {
      if (data.requestId === activeRequestIdRef.current) {
        setStreamContent(prev => prev + data.chunk);
      }
    };

    const handleRunComplete = (data: { requestId: string; response: unknown }) => {
      if (data.requestId === activeRequestIdRef.current) {
        setIsGenerating(false);
        activeRequestIdRef.current = null;
      }
    };

    const handleRunError = (data: { requestId: string; error: string }) => {
      if (data.requestId === activeRequestIdRef.current) {
        setIsGenerating(false);
        setError(data.error);
        activeRequestIdRef.current = null;
      }
    };

    onMessage('workbench:session-created', handleSessionCreated);
    onMessage('workbench:session-updated', handleSessionUpdated);
    onMessage('workbench:session-deleted', handleSessionDeleted);
    onMessage('workbench:run-chunk', handleRunChunk);
    onMessage('workbench:run-complete', handleRunComplete);
    onMessage('workbench:run-error', handleRunError);

    return () => {
      offMessage('workbench:session-created', handleSessionCreated);
      offMessage('workbench:session-updated', handleSessionUpdated);
      offMessage('workbench:session-deleted', handleSessionDeleted);
      offMessage('workbench:run-chunk', handleRunChunk);
      offMessage('workbench:run-complete', handleRunComplete);
      offMessage('workbench:run-error', handleRunError);
    };
  }, [session?.id]);

  // ---------------------------------------------------------------------------
  // LIBRARY ACTIONS
  // ---------------------------------------------------------------------------

  const loadPrompts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await sendMessage<PromptLibraryItem[]>('workbench:list', undefined);
      setPrompts(result);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const createPrompt = useCallback(async (type: PromptType, name?: string): Promise<WorkbenchSession> => {
    const newSession = createEmptySessionLocal(type, name);
    const result = await sendMessage<WorkbenchSession>('workbench:create', newSession);
    setSession(result);
    setOriginalSession(result);
    return result;
  }, []);

  const deletePrompt = useCallback(async (id: string) => {
    await sendMessage('workbench:delete', id);
  }, []);

  const duplicatePrompt = useCallback(async (id: string, newName?: string): Promise<WorkbenchSession | null> => {
    const result = await sendMessage<WorkbenchSession | null>('workbench:duplicate', { id, newName });
    return result;
  }, []);

  // ---------------------------------------------------------------------------
  // SESSION ACTIONS
  // ---------------------------------------------------------------------------

  const openSession = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await sendMessage<WorkbenchSession | null>('workbench:get', id);
      if (result) {
        setSession(result);
        setOriginalSession(result);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const closeSession = useCallback(() => {
    setSession(null);
    setOriginalSession(null);
    setStreamContent('');
  }, []);

  const saveSession = useCallback(async () => {
    if (!session) return;

    try {
      const result = await sendMessage<WorkbenchSession | null>('workbench:update', {
        id: session.id,
        updates: {
          name: session.name,
          description: session.description,
          tags: session.tags,
          modelConfig: session.modelConfig,
          messages: session.messages,
          variables: session.variables,
          imageConfig: session.imageConfig,
          toolConfig: session.toolConfig,
        },
      });
      if (result) {
        setOriginalSession(result);
        setSession(result);
      }
    } catch (err) {
      setError((err as Error).message);
    }
  }, [session]);

  // ---------------------------------------------------------------------------
  // EDITOR ACTIONS - GENERAL
  // ---------------------------------------------------------------------------

  const updateName = useCallback((name: string) => {
    setSession(prev => prev ? { ...prev, name } : null);
  }, []);

  const updateDescription = useCallback((description: string) => {
    setSession(prev => prev ? { ...prev, description } : null);
  }, []);

  const updateTags = useCallback((tags: string[]) => {
    setSession(prev => prev ? { ...prev, tags } : null);
  }, []);

  // ---------------------------------------------------------------------------
  // EDITOR ACTIONS - TEXT PROMPTS
  // ---------------------------------------------------------------------------

  const setModelConfig = useCallback((config: Partial<WorkbenchModelConfig>) => {
    setSession(prev => {
      if (!prev || prev.type !== 'text') return prev;
      return {
        ...prev,
        modelConfig: {
          ...prev.modelConfig!,
          ...config,
        },
      };
    });
  }, []);

  const addMessage = useCallback((role: MessageRole, afterId?: string) => {
    setSession(prev => {
      if (!prev || prev.type !== 'text' || !prev.messages) return prev;

      const newMessage: MessageBlock = {
        id: crypto.randomUUID(),
        role,
        content: '',
      };

      const messages = [...prev.messages];
      if (afterId) {
        const index = messages.findIndex(m => m.id === afterId);
        if (index !== -1) {
          messages.splice(index + 1, 0, newMessage);
        } else {
          messages.push(newMessage);
        }
      } else {
        messages.push(newMessage);
      }

      return { ...prev, messages };
    });
  }, []);

  const updateMessage = useCallback((id: string, content: string) => {
    setSession(prev => {
      if (!prev || prev.type !== 'text' || !prev.messages) return prev;
      return {
        ...prev,
        messages: prev.messages.map(m =>
          m.id === id ? { ...m, content } : m
        ),
      };
    });
  }, []);

  const removeMessage = useCallback((id: string) => {
    setSession(prev => {
      if (!prev || prev.type !== 'text' || !prev.messages) return prev;
      return {
        ...prev,
        messages: prev.messages.filter(m => m.id !== id),
      };
    });
  }, []);

  const setMessagePrefill = useCallback((id: string, isPrefill: boolean) => {
    setSession(prev => {
      if (!prev || prev.type !== 'text' || !prev.messages) return prev;
      return {
        ...prev,
        messages: prev.messages.map(m =>
          m.id === id ? { ...m, isPrefill } : m
        ),
      };
    });
  }, []);

  const reorderMessages = useCallback((fromIndex: number, toIndex: number) => {
    setSession(prev => {
      if (!prev || prev.type !== 'text' || !prev.messages) return prev;
      const messages = [...prev.messages];
      const [removed] = messages.splice(fromIndex, 1);
      messages.splice(toIndex, 0, removed);
      return { ...prev, messages };
    });
  }, []);

  // ---------------------------------------------------------------------------
  // VARIABLES
  // ---------------------------------------------------------------------------

  const setVariableValue = useCallback((name: string, value: string) => {
    setSession(prev => {
      if (!prev || prev.type !== 'text') return prev;

      const variables = [...(prev.variables || [])];
      const index = variables.findIndex(v => v.name === name);

      if (index !== -1) {
        variables[index] = { ...variables[index], currentValue: value };
      } else {
        variables.push({ name, currentValue: value });
      }

      return { ...prev, variables };
    });
  }, []);

  const getVariableValues = useCallback((): Record<string, string> => {
    if (!session?.variables) return {};
    return session.variables.reduce((acc, v) => {
      acc[v.name] = v.currentValue;
      return acc;
    }, {} as Record<string, string>);
  }, [session?.variables]);

  // ---------------------------------------------------------------------------
  // EXECUTION
  // ---------------------------------------------------------------------------

  const runGeneration = useCallback(async () => {
    if (!session || session.type !== 'text' || isGenerating) return;

    setIsGenerating(true);
    setStreamContent('');
    setError(null);

    try {
      const requestId = await sendMessage<string>('workbench:run', {
        session,
        variables: getVariableValues(),
      });
      activeRequestIdRef.current = requestId;
    } catch (err) {
      setIsGenerating(false);
      setError((err as Error).message);
    }
  }, [session, isGenerating, getVariableValues]);

  const cancelGeneration = useCallback(() => {
    if (activeRequestIdRef.current) {
      sendMessage('workbench:cancel-run', activeRequestIdRef.current);
      setIsGenerating(false);
      activeRequestIdRef.current = null;
    }
  }, []);

  const getCode = useCallback(async (format: CodeExportFormat): Promise<string> => {
    if (!session || session.type !== 'text') {
      throw new Error('Only text prompts can be exported as code');
    }

    return await sendMessage<string>('workbench:get-code', {
      session,
      format,
      variables: getVariableValues(),
    });
  }, [session, getVariableValues]);

  // ---------------------------------------------------------------------------
  // RETURN
  // ---------------------------------------------------------------------------

  return {
    // Library
    prompts,
    loading,
    error,

    // Session
    session,
    isDirty,

    // Library actions
    loadPrompts,
    createPrompt,
    deletePrompt,
    duplicatePrompt,

    // Session actions
    openSession,
    closeSession,
    saveSession,

    // Editor actions
    updateName,
    updateDescription,
    updateTags,
    setModelConfig,
    addMessage,
    updateMessage,
    removeMessage,
    setMessagePrefill,
    reorderMessages,

    // Variables
    detectedVariables,
    setVariableValue,
    getVariableValues,

    // Execution
    isGenerating,
    streamContent,
    runGeneration,
    cancelGeneration,
    getCode,
  };
}

// -----------------------------------------------------------------------------
// LOCAL HELPERS (avoid importing from types to prevent circular deps)
// -----------------------------------------------------------------------------

function extractSessionVariablesLocal(messages: MessageBlock[]): string[] {
  const regex = /\{\{([A-Z_][A-Z0-9_]*)\}\}/g;
  const allVars = new Set<string>();
  for (const msg of messages) {
    let match;
    while ((match = regex.exec(msg.content)) !== null) {
      allVars.add(match[1]);
    }
    regex.lastIndex = 0; // Reset regex state
  }
  return Array.from(allVars);
}

function createEmptySessionLocal(type: PromptType, name?: string): Omit<WorkbenchSession, 'id' | 'createdAt' | 'updatedAt'> {
  const base = {
    name: name || 'Untitled',
    type,
    description: '',
    tags: [] as string[],
  };

  switch (type) {
    case 'text':
      return {
        ...base,
        modelConfig: {
          modelId: 'claude-sonnet-4-20250514',
          temperature: 1,
          maxTokens: 4096,
        },
        messages: [
          { id: crypto.randomUUID(), role: 'system' as MessageRole, content: '' },
          { id: crypto.randomUUID(), role: 'user' as MessageRole, content: '' },
        ],
        variables: [],
      };
    case 'image':
      return {
        ...base,
        imageConfig: {
          prompt: '',
          model: 'seedream-v4',
          wildcardSources: [],
        },
      };
    case 'tool':
      return {
        ...base,
        toolConfig: {
          name: '',
          description: '',
          inputSchema: '{\n  "type": "object",\n  "properties": {},\n  "required": []\n}',
          instructions: '',
        },
      };
  }
}
