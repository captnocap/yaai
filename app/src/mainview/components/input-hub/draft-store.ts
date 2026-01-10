// =============================================================================
// INPUT DRAFT STORE
// =============================================================================
// Persists unsent input across navigation. Supports different draft shapes
// per mode (chat, image, code) and per thread/project/session.

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export type DraftMode = 'chat' | 'image' | 'code';

/** Base draft with common fields */
interface DraftBase {
  updatedAt: number;
}

/** Chat mode draft */
export interface ChatDraft extends DraftBase {
  mode: 'chat';
  text: string;
  attachments?: AttachmentRef[];
}

/** Image mode draft */
export interface ImageDraft extends DraftBase {
  mode: 'image';
  positivePrompt: string;
  negativePrompt: string;
  selectedPromptId?: string;
  attachments?: AttachmentRef[];
}

/** Code mode draft */
export interface CodeDraft extends DraftBase {
  mode: 'code';
  text: string;
  // For multi-stage prompts, store answers by prompt ID
  pendingAnswers?: Record<string, string>;
}

/** Union of all draft types */
export type Draft = ChatDraft | ImageDraft | CodeDraft;

/** Reference to an attachment (actual file handling is separate) */
export interface AttachmentRef {
  id: string;
  name: string;
  type: string;
  size: number;
  // For images, we might store a data URL preview
  preview?: string;
}

/** Draft key format: "mode:threadId" */
export type DraftKey = `${DraftMode}:${string}`;

// -----------------------------------------------------------------------------
// STORAGE
// -----------------------------------------------------------------------------

const STORAGE_KEY = 'yaai-input-drafts';
const MAX_DRAFT_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/** Load all drafts from localStorage */
function loadDrafts(): Map<DraftKey, Draft> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return new Map();

    const parsed = JSON.parse(stored) as Record<DraftKey, Draft>;
    return new Map(Object.entries(parsed) as [DraftKey, Draft][]);
  } catch (e) {
    console.error('Failed to load drafts:', e);
    return new Map();
  }
}

/** Save all drafts to localStorage */
function saveDrafts(drafts: Map<DraftKey, Draft>): void {
  try {
    const obj = Object.fromEntries(drafts);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  } catch (e) {
    console.error('Failed to save drafts:', e);
  }
}

// -----------------------------------------------------------------------------
// DRAFT STORE CLASS
// -----------------------------------------------------------------------------

class DraftStore {
  private drafts: Map<DraftKey, Draft>;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.drafts = loadDrafts();
    this.cleanup();
  }

  /** Remove stale drafts */
  private cleanup(): void {
    const now = Date.now();
    let changed = false;

    for (const [key, draft] of this.drafts) {
      if (now - draft.updatedAt > MAX_DRAFT_AGE_MS) {
        this.drafts.delete(key);
        changed = true;
      }
    }

    if (changed) {
      saveDrafts(this.drafts);
    }
  }

  /** Create a draft key */
  private makeKey(mode: DraftMode, threadId: string): DraftKey {
    return `${mode}:${threadId}`;
  }

  /** Get a draft */
  getDraft<T extends Draft>(mode: DraftMode, threadId: string): T | null {
    const key = this.makeKey(mode, threadId);
    const draft = this.drafts.get(key);
    if (draft && draft.mode === mode) {
      return draft as T;
    }
    return null;
  }

  /** Set/update a draft */
  setDraft(mode: DraftMode, threadId: string, draft: Omit<Draft, 'updatedAt'>): void {
    const key = this.makeKey(mode, threadId);
    const fullDraft = { ...draft, updatedAt: Date.now() } as Draft;
    this.drafts.set(key, fullDraft);
    saveDrafts(this.drafts);
    this.notify();
  }

  /** Update specific fields of a draft */
  updateDraft(mode: DraftMode, threadId: string, updates: Partial<Draft>): void {
    const key = this.makeKey(mode, threadId);
    const existing = this.drafts.get(key);

    if (existing && existing.mode === mode) {
      const updated = { ...existing, ...updates, updatedAt: Date.now() } as Draft;
      this.drafts.set(key, updated);
    } else {
      // Create new draft with defaults based on mode
      const newDraft = this.createDefaultDraft(mode, updates);
      this.drafts.set(key, newDraft);
    }

    saveDrafts(this.drafts);
    this.notify();
  }

  /** Create a default draft for a mode */
  private createDefaultDraft(mode: DraftMode, overrides: Partial<Draft>): Draft {
    const base = { updatedAt: Date.now() };

    switch (mode) {
      case 'chat':
        return { ...base, mode: 'chat', text: '', ...overrides } as ChatDraft;
      case 'image':
        return { ...base, mode: 'image', positivePrompt: '', negativePrompt: '', ...overrides } as ImageDraft;
      case 'code':
        return { ...base, mode: 'code', text: '', ...overrides } as CodeDraft;
    }
  }

  /** Clear a draft (e.g., after sending) */
  clearDraft(mode: DraftMode, threadId: string): void {
    const key = this.makeKey(mode, threadId);
    this.drafts.delete(key);
    saveDrafts(this.drafts);
    this.notify();
  }

  /** Check if a draft has content */
  hasDraft(mode: DraftMode, threadId: string): boolean {
    const draft = this.getDraft(mode, threadId);
    if (!draft) return false;

    switch (draft.mode) {
      case 'chat':
        return !!(draft.text.trim() || draft.attachments?.length);
      case 'image':
        return !!(draft.positivePrompt.trim() || draft.negativePrompt.trim() || draft.attachments?.length);
      case 'code':
        return !!(draft.text.trim() || Object.keys(draft.pendingAnswers || {}).length);
    }
  }

  /** Get all drafts for a mode */
  getDraftsForMode(mode: DraftMode): Map<string, Draft> {
    const result = new Map<string, Draft>();
    const prefix = `${mode}:`;

    for (const [key, draft] of this.drafts) {
      if (key.startsWith(prefix)) {
        const threadId = key.slice(prefix.length);
        result.set(threadId, draft);
      }
    }

    return result;
  }

  /** Subscribe to changes */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Notify listeners */
  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

// -----------------------------------------------------------------------------
// SINGLETON EXPORT
// -----------------------------------------------------------------------------

export const draftStore = new DraftStore();

// -----------------------------------------------------------------------------
// HELPER FUNCTIONS
// -----------------------------------------------------------------------------

/** Check if a draft is empty */
export function isDraftEmpty(draft: Draft | null): boolean {
  if (!draft) return true;

  switch (draft.mode) {
    case 'chat':
      return !draft.text.trim() && !draft.attachments?.length;
    case 'image':
      return !draft.positivePrompt.trim() && !draft.negativePrompt.trim() && !draft.attachments?.length;
    case 'code':
      return !draft.text.trim() && !Object.keys(draft.pendingAnswers || {}).length;
  }
}
