// =============================================================================
// USE IMAGE GEN
// =============================================================================
// Hook for interacting with the image generation system via WebSocket.
// Manages queue, jobs, prompts, references, and real-time updates.

import { useState, useCallback, useEffect, useRef } from 'react';
import { sendMessage, onMessage } from '../lib/comm-bridge';
import type {
  QueueEntry,
  QueueGroup,
  Job,
  JobStats,
  ImageGenEvent,
  ImageGenEventType,
  PipelineState,
  ImageGenSettings,
  QuickGenerateRequest,
  QuickGenerateResult,
  PromptFile,
  FolderNode,
  FolderContents,
  GeneratedImage,
  GalleryFilters,
} from '../types/image-gen';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface UseImageGenReturn {
  // State
  groups: QueueGroup[];
  entries: Map<string, QueueEntry>;
  jobs: Map<string, Job>;
  jobHistory: Job[];
  pipelineState: PipelineState | null;
  settings: ImageGenSettings | null;
  loading: boolean;
  error: string | null;

  // Queue operations
  createGroup: (name: string) => Promise<QueueGroup>;
  updateGroup: (id: string, updates: Partial<QueueGroup>) => Promise<QueueGroup | null>;
  deleteGroup: (id: string) => Promise<void>;
  reorderGroups: (orderedIds: string[]) => Promise<void>;

  createEntry: (groupId: string, entry: Partial<QueueEntry>) => Promise<QueueEntry | null>;
  updateEntry: (id: string, updates: Partial<QueueEntry>) => Promise<QueueEntry | null>;
  deleteEntry: (id: string) => Promise<void>;
  duplicateEntry: (id: string) => Promise<QueueEntry | null>;
  moveEntry: (id: string, targetGroupId: string, index: number) => Promise<void>;
  reorderEntries: (groupId: string, orderedIds: string[]) => Promise<void>;

  enableEntries: (ids: string[]) => Promise<void>;
  disableEntries: (ids: string[]) => Promise<void>;
  deleteEntries: (ids: string[]) => Promise<void>;

  // Job control
  startQueue: () => Promise<void>;
  stopQueue: () => Promise<void>;
  pauseQueue: () => Promise<void>;
  resumeQueue: () => Promise<void>;
  pauseJob: (jobId: string) => Promise<void>;
  resumeJob: (jobId: string) => Promise<void>;
  cancelJob: (jobId: string) => Promise<void>;
  cancelAllJobs: () => Promise<void>;
  updateJobTarget: (jobId: string, target: number) => Promise<void>;

  // Quick generate
  quickGenerate: (request: QuickGenerateRequest) => Promise<QuickGenerateResult>;

  // Refresh
  refreshState: () => Promise<void>;
}

export interface UsePromptsReturn {
  prompts: PromptFile[];
  loading: boolean;
  error: string | null;

  loadPrompt: (name: string) => Promise<string>;
  savePrompt: (name: string, content: string) => Promise<void>;
  deletePrompt: (name: string) => Promise<void>;
  renamePrompt: (oldName: string, newName: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export interface UseReferencesReturn {
  roots: FolderNode[];
  currentPath: string | null;
  contents: FolderContents | null;
  loading: boolean;
  error: string | null;

  navigate: (path: string) => Promise<void>;
  goUp: () => Promise<void>;
  refresh: () => Promise<void>;
}

export interface UseGalleryReturn {
  images: GeneratedImage[];
  filters: GalleryFilters;
  loading: boolean;
  error: string | null;

  setFilters: (filters: GalleryFilters) => void;
  refresh: () => Promise<void>;
}

// -----------------------------------------------------------------------------
// MAIN HOOK
// -----------------------------------------------------------------------------

export function useImageGen(): UseImageGenReturn {
  const [groups, setGroups] = useState<QueueGroup[]>([]);
  const [entries, setEntries] = useState<Map<string, QueueEntry>>(new Map());
  const [jobs, setJobs] = useState<Map<string, Job>>(new Map());
  const [jobHistory, setJobHistory] = useState<Job[]>([]);
  const [pipelineState, setPipelineState] = useState<PipelineState | null>(null);
  const [settings, setSettings] = useState<ImageGenSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // EVENT HANDLING
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const unsubscribe = onMessage('image-gen:event', (event: ImageGenEvent) => {
      handleEvent(event);
    });

    // Initial fetch
    refreshState();

    return () => {
      unsubscribe();
    };
  }, []);

  const handleEvent = useCallback((event: ImageGenEvent) => {
    switch (event.type) {
      case 'queue-updated': {
        const data = event.data as { groups: QueueGroup[]; entries: Record<string, QueueEntry> };
        setGroups(data.groups);
        setEntries(new Map(Object.entries(data.entries)));
        break;
      }

      case 'job-created':
      case 'job-started':
      case 'job-progress':
      case 'job-paused':
      case 'job-resumed': {
        const data = event.data as { jobId: string; job?: Job };
        if (data.job) {
          setJobs(prev => new Map(prev).set(data.jobId, data.job!));
        }
        break;
      }

      case 'job-completed':
      case 'job-failed':
      case 'job-cancelled': {
        const data = event.data as { jobId: string; job?: Job };
        if (data.job) {
          setJobs(prev => {
            const next = new Map(prev);
            next.delete(data.jobId);
            return next;
          });
          setJobHistory(prev => [data.job!, ...prev].slice(0, 100));
        }
        break;
      }

      case 'pipeline-started':
      case 'pipeline-stopped': {
        refreshPipelineState();
        break;
      }

      case 'auto-paused': {
        const data = event.data as { jobId: string; job?: Job };
        if (data.job) {
          setJobs(prev => new Map(prev).set(data.jobId, data.job!));
        }
        break;
      }
    }
  }, []);

  // ---------------------------------------------------------------------------
  // REFRESH
  // ---------------------------------------------------------------------------

  const refreshState = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [groupsData, activeJobs, history, pipeline, settingsData] = await Promise.all([
        sendMessage<QueueGroup[]>('image-gen:get-groups'),
        sendMessage<Job[]>('image-gen:get-active-jobs'),
        sendMessage<Job[]>('image-gen:get-job-history'),
        sendMessage<PipelineState>('image-gen:get-pipeline-state'),
        sendMessage<ImageGenSettings>('image-gen:get-settings'),
      ]);

      setGroups(groupsData);
      setJobs(new Map(activeJobs.map(j => [j.id, j])));
      setJobHistory(history);
      setPipelineState(pipeline);
      setSettings(settingsData);

      // Fetch entries for all groups
      const allEntryIds = groupsData.flatMap(g => g.entries);
      const entriesMap = new Map<string, QueueEntry>();
      for (const entryId of allEntryIds) {
        const entry = await sendMessage<QueueEntry | null>('image-gen:get-entry', entryId);
        if (entry) {
          entriesMap.set(entry.id, entry);
        }
      }
      setEntries(entriesMap);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshPipelineState = useCallback(async () => {
    try {
      const pipeline = await sendMessage<PipelineState>('image-gen:get-pipeline-state');
      setPipelineState(pipeline);
    } catch (err) {
      // Ignore
    }
  }, []);

  // ---------------------------------------------------------------------------
  // QUEUE OPERATIONS - GROUPS
  // ---------------------------------------------------------------------------

  const createGroup = useCallback(async (name: string): Promise<QueueGroup> => {
    const group = await sendMessage<QueueGroup>('image-gen:create-group', { name });
    return group;
  }, []);

  const updateGroup = useCallback(async (
    id: string,
    updates: Partial<QueueGroup>
  ): Promise<QueueGroup | null> => {
    return await sendMessage<QueueGroup | null>('image-gen:update-group', { id, updates });
  }, []);

  const deleteGroup = useCallback(async (id: string): Promise<void> => {
    await sendMessage('image-gen:delete-group', id);
  }, []);

  const reorderGroups = useCallback(async (orderedIds: string[]): Promise<void> => {
    await sendMessage('image-gen:reorder-groups', orderedIds);
  }, []);

  // ---------------------------------------------------------------------------
  // QUEUE OPERATIONS - ENTRIES
  // ---------------------------------------------------------------------------

  const createEntry = useCallback(async (
    groupId: string,
    entry: Partial<QueueEntry>
  ): Promise<QueueEntry | null> => {
    return await sendMessage<QueueEntry | null>('image-gen:create-entry', { groupId, entry });
  }, []);

  const updateEntry = useCallback(async (
    id: string,
    updates: Partial<QueueEntry>
  ): Promise<QueueEntry | null> => {
    return await sendMessage<QueueEntry | null>('image-gen:update-entry', { id, updates });
  }, []);

  const deleteEntry = useCallback(async (id: string): Promise<void> => {
    await sendMessage('image-gen:delete-entry', id);
  }, []);

  const duplicateEntry = useCallback(async (id: string): Promise<QueueEntry | null> => {
    return await sendMessage<QueueEntry | null>('image-gen:duplicate-entry', id);
  }, []);

  const moveEntry = useCallback(async (
    id: string,
    targetGroupId: string,
    index: number
  ): Promise<void> => {
    await sendMessage('image-gen:move-entry', { id, targetGroupId, index });
  }, []);

  const reorderEntries = useCallback(async (
    groupId: string,
    orderedIds: string[]
  ): Promise<void> => {
    await sendMessage('image-gen:reorder-entries', { groupId, orderedIds });
  }, []);

  const enableEntries = useCallback(async (ids: string[]): Promise<void> => {
    await sendMessage('image-gen:enable-entries', ids);
  }, []);

  const disableEntries = useCallback(async (ids: string[]): Promise<void> => {
    await sendMessage('image-gen:disable-entries', ids);
  }, []);

  const deleteEntries = useCallback(async (ids: string[]): Promise<void> => {
    await sendMessage('image-gen:delete-entries', ids);
  }, []);

  // ---------------------------------------------------------------------------
  // JOB CONTROL
  // ---------------------------------------------------------------------------

  const startQueue = useCallback(async (): Promise<void> => {
    await sendMessage('image-gen:start-queue');
  }, []);

  const stopQueue = useCallback(async (): Promise<void> => {
    await sendMessage('image-gen:stop-queue');
  }, []);

  const pauseQueue = useCallback(async (): Promise<void> => {
    await sendMessage('image-gen:pause-queue');
  }, []);

  const resumeQueue = useCallback(async (): Promise<void> => {
    await sendMessage('image-gen:resume-queue');
  }, []);

  const pauseJob = useCallback(async (jobId: string): Promise<void> => {
    await sendMessage('image-gen:pause-job', jobId);
  }, []);

  const resumeJob = useCallback(async (jobId: string): Promise<void> => {
    await sendMessage('image-gen:resume-job', jobId);
  }, []);

  const cancelJob = useCallback(async (jobId: string): Promise<void> => {
    await sendMessage('image-gen:cancel-job', jobId);
  }, []);

  const cancelAllJobs = useCallback(async (): Promise<void> => {
    await sendMessage('image-gen:cancel-all');
  }, []);

  const updateJobTarget = useCallback(async (jobId: string, target: number): Promise<void> => {
    await sendMessage('image-gen:update-job-target', { jobId, target });
  }, []);

  // ---------------------------------------------------------------------------
  // QUICK GENERATE
  // ---------------------------------------------------------------------------

  const quickGenerate = useCallback(async (
    request: QuickGenerateRequest
  ): Promise<QuickGenerateResult> => {
    return await sendMessage<QuickGenerateResult>('image-gen:quick-generate', request);
  }, []);

  return {
    groups,
    entries,
    jobs,
    jobHistory,
    pipelineState,
    settings,
    loading,
    error,

    createGroup,
    updateGroup,
    deleteGroup,
    reorderGroups,

    createEntry,
    updateEntry,
    deleteEntry,
    duplicateEntry,
    moveEntry,
    reorderEntries,

    enableEntries,
    disableEntries,
    deleteEntries,

    startQueue,
    stopQueue,
    pauseQueue,
    resumeQueue,
    pauseJob,
    resumeJob,
    cancelJob,
    cancelAllJobs,
    updateJobTarget,

    quickGenerate,
    refreshState,
  };
}

// -----------------------------------------------------------------------------
// PROMPTS HOOK
// -----------------------------------------------------------------------------

export function usePrompts(): UsePromptsReturn {
  const [prompts, setPrompts] = useState<PromptFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await sendMessage<PromptFile[]>('image-gen:get-prompts');
      setPrompts(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const loadPrompt = useCallback(async (name: string): Promise<string> => {
    return await sendMessage<string>('image-gen:load-prompt', name);
  }, []);

  const savePrompt = useCallback(async (name: string, content: string): Promise<void> => {
    await sendMessage('image-gen:save-prompt', { name, content });
    await refresh();
  }, [refresh]);

  const deletePrompt = useCallback(async (name: string): Promise<void> => {
    await sendMessage('image-gen:delete-prompt', name);
    await refresh();
  }, [refresh]);

  const renamePrompt = useCallback(async (oldName: string, newName: string): Promise<void> => {
    await sendMessage('image-gen:rename-prompt', { oldName, newName });
    await refresh();
  }, [refresh]);

  return {
    prompts,
    loading,
    error,
    loadPrompt,
    savePrompt,
    deletePrompt,
    renamePrompt,
    refresh,
  };
}

// -----------------------------------------------------------------------------
// REFERENCES BROWSER HOOK
// -----------------------------------------------------------------------------

export function useReferences(): UseReferencesReturn {
  const [roots, setRoots] = useState<FolderNode[]>([]);
  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const [contents, setContents] = useState<FolderContents | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pathHistory = useRef<string[]>([]);

  useEffect(() => {
    loadRoots();
  }, []);

  const loadRoots = useCallback(async () => {
    try {
      setLoading(true);
      const data = await sendMessage<FolderNode[]>('image-gen:get-reference-roots');
      setRoots(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const navigate = useCallback(async (path: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      if (currentPath) {
        pathHistory.current.push(currentPath);
      }

      const data = await sendMessage<FolderContents>('image-gen:get-folder-contents', path);
      setCurrentPath(path);
      setContents(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [currentPath]);

  const goUp = useCallback(async (): Promise<void> => {
    const prevPath = pathHistory.current.pop();
    if (prevPath) {
      try {
        setLoading(true);
        const data = await sendMessage<FolderContents>('image-gen:get-folder-contents', prevPath);
        setCurrentPath(prevPath);
        setContents(data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    } else {
      setCurrentPath(null);
      setContents(null);
    }
  }, []);

  const refresh = useCallback(async (): Promise<void> => {
    if (currentPath) {
      await navigate(currentPath);
    } else {
      await loadRoots();
    }
  }, [currentPath, navigate, loadRoots]);

  return {
    roots,
    currentPath,
    contents,
    loading,
    error,
    navigate,
    goUp,
    refresh,
  };
}

// -----------------------------------------------------------------------------
// GALLERY HOOK
// -----------------------------------------------------------------------------

export function useGallery(): UseGalleryReturn {
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [filters, setFiltersState] = useState<GalleryFilters>({ sortBy: 'newest' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const data = await sendMessage<GeneratedImage[]>('image-gen:get-outputs', filters);
      setImages(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setFilters = useCallback((newFilters: GalleryFilters) => {
    setFiltersState(newFilters);
  }, []);

  return {
    images,
    filters,
    loading,
    error,
    setFilters,
    refresh,
  };
}
