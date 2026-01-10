// =============================================================================
// USE DRAFT HOOK
// =============================================================================
// React hook for accessing and updating drafts in input components.

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import {
  draftStore,
  type DraftMode,
  type Draft,
  type ChatDraft,
  type ImageDraft,
  type CodeDraft,
} from './draft-store';

// -----------------------------------------------------------------------------
// GENERIC DRAFT HOOK
// -----------------------------------------------------------------------------

/** Generic hook for any draft type */
export function useDraft<T extends Draft>(
  mode: DraftMode,
  threadId: string
): {
  draft: T | null;
  updateDraft: (updates: Partial<T>) => void;
  clearDraft: () => void;
  hasDraft: boolean;
} {
  // Subscribe to store changes
  const draft = useSyncExternalStore(
    (callback) => draftStore.subscribe(callback),
    () => draftStore.getDraft<T>(mode, threadId),
    () => null // Server snapshot
  );

  const updateDraft = useCallback(
    (updates: Partial<T>) => {
      draftStore.updateDraft(mode, threadId, updates as Partial<Draft>);
    },
    [mode, threadId]
  );

  const clearDraft = useCallback(() => {
    draftStore.clearDraft(mode, threadId);
  }, [mode, threadId]);

  const hasDraft = draftStore.hasDraft(mode, threadId);

  return { draft, updateDraft, clearDraft, hasDraft };
}

// -----------------------------------------------------------------------------
// MODE-SPECIFIC HOOKS
// -----------------------------------------------------------------------------

/** Hook for chat drafts */
export function useChatDraft(threadId: string) {
  const { draft, updateDraft, clearDraft, hasDraft } = useDraft<ChatDraft>('chat', threadId);

  const setText = useCallback(
    (text: string) => {
      updateDraft({ mode: 'chat', text });
    },
    [updateDraft]
  );

  const addAttachment = useCallback(
    (attachment: AttachmentRef) => {
      const current = draft?.attachments ?? [];
      updateDraft({ mode: 'chat', attachments: [...current, attachment] });
    },
    [draft?.attachments, updateDraft]
  );

  const removeAttachment = useCallback(
    (id: string) => {
      const current = draft?.attachments ?? [];
      updateDraft({ mode: 'chat', attachments: current.filter(a => a.id !== id) });
    },
    [draft?.attachments, updateDraft]
  );

  const clearAttachments = useCallback(() => {
    updateDraft({ mode: 'chat', attachments: [] });
  }, [updateDraft]);

  return {
    text: draft?.text ?? '',
    attachments: draft?.attachments ?? [],
    setText,
    addAttachment,
    removeAttachment,
    clearAttachments,
    updateDraft,
    clearDraft,
    hasDraft,
  };
}

/** Hook for image drafts */
export function useImageDraft(threadId: string) {
  const { draft, updateDraft, clearDraft, hasDraft } = useDraft<ImageDraft>('image', threadId);

  const setPositivePrompt = useCallback(
    (positivePrompt: string) => {
      updateDraft({ mode: 'image', positivePrompt });
    },
    [updateDraft]
  );

  const setNegativePrompt = useCallback(
    (negativePrompt: string) => {
      updateDraft({ mode: 'image', negativePrompt });
    },
    [updateDraft]
  );

  const setSelectedPromptId = useCallback(
    (selectedPromptId: string | undefined) => {
      updateDraft({ mode: 'image', selectedPromptId });
    },
    [updateDraft]
  );

  const addAttachment = useCallback(
    (attachment: AttachmentRef) => {
      const current = draft?.attachments ?? [];
      updateDraft({ mode: 'image', attachments: [...current, attachment] });
    },
    [draft?.attachments, updateDraft]
  );

  const removeAttachment = useCallback(
    (id: string) => {
      const current = draft?.attachments ?? [];
      updateDraft({ mode: 'image', attachments: current.filter(a => a.id !== id) });
    },
    [draft?.attachments, updateDraft]
  );

  const clearAttachments = useCallback(() => {
    updateDraft({ mode: 'image', attachments: [] });
  }, [updateDraft]);

  return {
    positivePrompt: draft?.positivePrompt ?? '',
    negativePrompt: draft?.negativePrompt ?? '',
    selectedPromptId: draft?.selectedPromptId,
    attachments: draft?.attachments ?? [],
    setPositivePrompt,
    setNegativePrompt,
    setSelectedPromptId,
    addAttachment,
    removeAttachment,
    clearAttachments,
    updateDraft,
    clearDraft,
    hasDraft,
  };
}

/** Hook for code drafts */
export function useCodeDraft(threadId: string) {
  const { draft, updateDraft, clearDraft, hasDraft } = useDraft<CodeDraft>('code', threadId);

  const setText = useCallback(
    (text: string) => {
      updateDraft({ mode: 'code', text });
    },
    [updateDraft]
  );

  const setPendingAnswer = useCallback(
    (promptId: string, value: string) => {
      const currentAnswers = draft?.pendingAnswers ?? {};
      updateDraft({
        mode: 'code',
        pendingAnswers: { ...currentAnswers, [promptId]: value },
      });
    },
    [draft?.pendingAnswers, updateDraft]
  );

  const clearPendingAnswers = useCallback(() => {
    updateDraft({ mode: 'code', pendingAnswers: {} });
  }, [updateDraft]);

  return {
    text: draft?.text ?? '',
    pendingAnswers: draft?.pendingAnswers ?? {},
    setText,
    setPendingAnswer,
    clearPendingAnswers,
    updateDraft,
    clearDraft,
    hasDraft,
  };
}

// -----------------------------------------------------------------------------
// UTILITY HOOK
// -----------------------------------------------------------------------------

/** Hook to get thread ID from current route */
export function useThreadIdFromRoute(): string {
  // This is a placeholder - in real usage, you'd get this from router context
  // For now, return 'new' as default
  const [threadId, setThreadId] = useState('new');

  useEffect(() => {
    // Extract thread ID from URL path
    const path = window.location.pathname;
    const match = path.match(/\/(chat|image|code)\/([^/]+)/);
    if (match) {
      setThreadId(match[2]);
    } else {
      setThreadId('new');
    }
  }, []);

  return threadId;
}
