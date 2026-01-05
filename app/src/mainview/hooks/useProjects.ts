// =============================================================================
// USE PROJECTS HOOK
// =============================================================================
// Manages project list state and actions for the sidebar navigator.

import { useState, useEffect, useCallback } from 'react';
import { sendMessage, onMessage, offMessage } from '../lib/comm-bridge';
import type {
  ProjectSummary,
  ProjectType,
  ListProjectsOptions,
  PaginatedResult,
} from '../../bun/lib/stores/chat-store.types';

export interface UseProjectsOptions {
  limit?: number;
  orderBy?: 'lastInteractedAt' | 'title' | 'type';
  order?: 'asc' | 'desc';
}

export interface UseProjectsReturn {
  projects: ProjectSummary[];
  loading: boolean;
  error: string | null;
  total: number;
  hasMore: boolean;

  // Filtering/sorting
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  showArchived: boolean;
  setShowArchived: (show: boolean) => void;

  // Actions
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  pinProject: (id: string, type: ProjectType) => Promise<void>;
  unpinProject: (id: string, type: ProjectType) => Promise<void>;
  archiveProject: (id: string, type: ProjectType) => Promise<void>;
  unarchiveProject: (id: string, type: ProjectType) => Promise<void>;
  deleteProject: (id: string, type: ProjectType) => Promise<void>;
  renameProject: (id: string, type: ProjectType, title: string) => Promise<void>;
  recordInteraction: (id: string, type: ProjectType) => Promise<void>;
}

export function useProjects(options?: UseProjectsOptions): UseProjectsReturn {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  const limit = options?.limit ?? 50;

  // Fetch projects
  const fetchProjects = useCallback(
    async (resetOffset = true) => {
      try {
        setLoading(true);
        setError(null);

        const currentOffset = resetOffset ? 0 : offset;

        const result = await sendMessage<PaginatedResult<ProjectSummary>>('project:list', {
          limit,
          offset: currentOffset,
          search: searchQuery || undefined,
          includeArchived: showArchived,
          pinnedFirst: true,
          orderBy: options?.orderBy ?? 'lastInteractedAt',
          order: options?.order ?? 'desc',
        } as ListProjectsOptions);

        if (resetOffset) {
          setProjects(result.items);
          setOffset(result.items.length);
        } else {
          setProjects((prev) => [...prev, ...result.items]);
          setOffset(currentOffset + result.items.length);
        }

        setTotal(result.total);
        setHasMore(result.hasMore);
      } catch (err) {
        console.error('[useProjects] Failed to fetch projects:', err);
        setError(err instanceof Error ? err.message : 'Failed to load projects');
      } finally {
        setLoading(false);
      }
    },
    [limit, offset, searchQuery, showArchived, options?.orderBy, options?.order]
  );

  // Initial load and reload on filter changes
  useEffect(() => {
    fetchProjects(true);
  }, [searchQuery, showArchived]);

  // Subscribe to project events for real-time updates
  useEffect(() => {
    const handlers = [
      'project:pinned',
      'project:unpinned',
      'project:archived',
      'project:unarchived',
      'project:deleted',
      'project:renamed',
      'chat:created',
      'chat:updated',
    ];

    const handleUpdate = () => {
      fetchProjects(true);
    };

    handlers.forEach((channel) => {
      onMessage(channel, handleUpdate);
    });

    return () => {
      handlers.forEach((channel) => {
        offMessage(channel, handleUpdate);
      });
    };
  }, [fetchProjects]);

  // Actions
  const refresh = useCallback(async () => {
    await fetchProjects(true);
  }, [fetchProjects]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    await fetchProjects(false);
  }, [hasMore, loading, fetchProjects]);

  const pinProject = useCallback(async (id: string, type: ProjectType) => {
    try {
      await sendMessage('project:pin', { id, type });
      // Update local state optimistically
      setProjects((prev) =>
        prev.map((p) => (p.id === id ? { ...p, isPinned: true } : p))
      );
    } catch (err) {
      console.error('[useProjects] Failed to pin project:', err);
      throw err;
    }
  }, []);

  const unpinProject = useCallback(async (id: string, type: ProjectType) => {
    try {
      await sendMessage('project:unpin', { id, type });
      setProjects((prev) =>
        prev.map((p) => (p.id === id ? { ...p, isPinned: false } : p))
      );
    } catch (err) {
      console.error('[useProjects] Failed to unpin project:', err);
      throw err;
    }
  }, []);

  const archiveProject = useCallback(async (id: string, type: ProjectType) => {
    try {
      await sendMessage('project:archive', { id, type });
      setProjects((prev) =>
        showArchived
          ? prev.map((p) => (p.id === id ? { ...p, isArchived: true } : p))
          : prev.filter((p) => p.id !== id)
      );
    } catch (err) {
      console.error('[useProjects] Failed to archive project:', err);
      throw err;
    }
  }, [showArchived]);

  const unarchiveProject = useCallback(async (id: string, type: ProjectType) => {
    try {
      await sendMessage('project:unarchive', { id, type });
      setProjects((prev) =>
        prev.map((p) => (p.id === id ? { ...p, isArchived: false } : p))
      );
    } catch (err) {
      console.error('[useProjects] Failed to unarchive project:', err);
      throw err;
    }
  }, []);

  const deleteProject = useCallback(async (id: string, type: ProjectType) => {
    try {
      await sendMessage('project:delete', { id, type });
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error('[useProjects] Failed to delete project:', err);
      throw err;
    }
  }, []);

  const renameProject = useCallback(async (id: string, type: ProjectType, title: string) => {
    try {
      await sendMessage('project:rename', { id, type, title });
      setProjects((prev) =>
        prev.map((p) => (p.id === id ? { ...p, title } : p))
      );
    } catch (err) {
      console.error('[useProjects] Failed to rename project:', err);
      throw err;
    }
  }, []);

  const recordInteraction = useCallback(async (id: string, type: ProjectType) => {
    try {
      await sendMessage('project:record-interaction', { id, type });
    } catch (err) {
      console.error('[useProjects] Failed to record interaction:', err);
      // Don't throw - this is not critical
    }
  }, []);

  return {
    projects,
    loading,
    error,
    total,
    hasMore,
    searchQuery,
    setSearchQuery,
    showArchived,
    setShowArchived,
    refresh,
    loadMore,
    pinProject,
    unpinProject,
    archiveProject,
    unarchiveProject,
    deleteProject,
    renameProject,
    recordInteraction,
  };
}
