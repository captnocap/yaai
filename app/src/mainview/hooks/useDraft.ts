// =============================================================================
// USE DRAFT HOOK
// =============================================================================
// Auto-saves drafts with debouncing and restores on mount.

import { useState, useEffect, useRef, useCallback } from 'react';
import { sendMessage } from '../lib/comm-bridge';
import type { ProjectType } from '../../bun/lib/stores/chat-store.types';

export interface Draft {
  projectId: string;
  projectType: ProjectType;
  content: string;
  selectedModel?: string;
  attachments?: unknown[];
  metadata?: Record<string, unknown>;
}

export interface UseDraftOptions {
  /** Debounce delay in ms (default: 500) */
  debounceMs?: number;
  /** Auto-load draft on mount (default: true) */
  autoLoad?: boolean;
}

export interface UseDraftReturn {
  draft: Draft | null;
  loading: boolean;

  // Update functions (auto-saves with debounce)
  updateContent: (content: string) => void;
  updateModel: (model: string) => void;
  updateAttachments: (attachments: unknown[]) => void;
  updateMetadata: (metadata: Record<string, unknown>) => void;

  // Manual operations
  saveDraft: () => Promise<void>;
  clearDraft: () => Promise<void>;
  loadDraft: () => Promise<void>;
}

export function useDraft(
  projectId: string | null,
  projectType: ProjectType,
  options?: UseDraftOptions
): UseDraftReturn {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(false);

  const debounceMs = options?.debounceMs ?? 500;
  const autoLoad = options?.autoLoad ?? true;

  // Pending changes to save
  const pendingRef = useRef<Partial<Draft>>({});
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load draft on mount or when projectId changes
  const loadDraft = useCallback(async () => {
    if (!projectId) {
      setDraft(null);
      return;
    }

    try {
      setLoading(true);
      const result = await sendMessage<Draft | null>('draft:get', { projectId });
      setDraft(result);
    } catch (err) {
      console.error('[useDraft] Failed to load draft:', err);
      setDraft(null);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (autoLoad) {
      loadDraft();
    }
  }, [autoLoad, loadDraft]);

  // Save function
  const saveDraft = useCallback(async () => {
    if (!projectId) return;

    // Merge pending changes with current draft
    const toSave = {
      projectId,
      projectType,
      content: draft?.content ?? '',
      ...pendingRef.current,
    };

    try {
      await sendMessage('draft:save', toSave);
      setDraft(toSave as Draft);
      pendingRef.current = {};
    } catch (err) {
      console.error('[useDraft] Failed to save draft:', err);
    }
  }, [projectId, projectType, draft]);

  // Debounced save
  const scheduleSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveDraft();
      saveTimeoutRef.current = null;
    }, debounceMs);
  }, [debounceMs, saveDraft]);

  // Update functions
  const updateContent = useCallback(
    (content: string) => {
      pendingRef.current.content = content;
      setDraft((prev) => (prev ? { ...prev, content } : { projectId: projectId!, projectType, content }));
      scheduleSave();
    },
    [projectId, projectType, scheduleSave]
  );

  const updateModel = useCallback(
    (selectedModel: string) => {
      pendingRef.current.selectedModel = selectedModel;
      setDraft((prev) => (prev ? { ...prev, selectedModel } : null));
      scheduleSave();
    },
    [scheduleSave]
  );

  const updateAttachments = useCallback(
    (attachments: unknown[]) => {
      pendingRef.current.attachments = attachments;
      setDraft((prev) => (prev ? { ...prev, attachments } : null));
      scheduleSave();
    },
    [scheduleSave]
  );

  const updateMetadata = useCallback(
    (metadata: Record<string, unknown>) => {
      pendingRef.current.metadata = metadata;
      setDraft((prev) => (prev ? { ...prev, metadata } : null));
      scheduleSave();
    },
    [scheduleSave]
  );

  // Clear draft
  const clearDraft = useCallback(async () => {
    if (!projectId) return;

    // Cancel pending save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    try {
      await sendMessage('draft:delete', { projectId });
      setDraft(null);
      pendingRef.current = {};
    } catch (err) {
      console.error('[useDraft] Failed to clear draft:', err);
    }
  }, [projectId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Save on unmount if there are pending changes
  useEffect(() => {
    return () => {
      if (Object.keys(pendingRef.current).length > 0 && projectId) {
        // Sync save on unmount
        const toSave = {
          projectId,
          projectType,
          content: draft?.content ?? '',
          ...pendingRef.current,
        };
        sendMessage('draft:save', toSave).catch((err) => {
          console.error('[useDraft] Failed to save on unmount:', err);
        });
      }
    };
  }, [projectId, projectType, draft?.content]);

  return {
    draft,
    loading,
    updateContent,
    updateModel,
    updateAttachments,
    updateMetadata,
    saveDraft,
    clearDraft,
    loadDraft,
  };
}
