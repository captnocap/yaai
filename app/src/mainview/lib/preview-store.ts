/**
 * In-memory store for preview content
 * Used to pass code content from CodeBlock to PreviewViewPane via resourceId
 */

import { useState, useEffect } from 'react';
import type { PreviewableCodeType } from './preview-utils';

export interface PreviewContent {
  id: string;
  code: string;
  type: Exclude<PreviewableCodeType, null>;
  language?: string;
  title?: string;
  createdAt: number;
}

type Listener = () => void;

/**
 * Simple in-memory store for preview content
 */
class PreviewContentStore {
  private contents = new Map<string, PreviewContent>();
  private listeners = new Set<Listener>();

  /**
   * Store preview content
   */
  set(content: PreviewContent): void {
    this.contents.set(content.id, content);
    this.notify();
  }

  /**
   * Get preview content by ID
   */
  get(id: string): PreviewContent | undefined {
    return this.contents.get(id);
  }

  /**
   * Delete preview content
   */
  delete(id: string): boolean {
    const deleted = this.contents.delete(id);
    if (deleted) {
      this.notify();
    }
    return deleted;
  }

  /**
   * Subscribe to store changes
   */
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Clear old previews (older than maxAge in ms)
   */
  cleanup(maxAge: number = 30 * 60 * 1000): void {
    const now = Date.now();
    for (const [id, content] of this.contents) {
      if (now - content.createdAt > maxAge) {
        this.contents.delete(id);
      }
    }
    this.notify();
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn());
  }
}

// Singleton instance
export const previewStore = new PreviewContentStore();

/**
 * React hook to get preview content by ID
 * Automatically subscribes to store updates
 */
export function usePreviewContent(id: string | null): PreviewContent | null {
  const [content, setContent] = useState<PreviewContent | null>(
    id ? previewStore.get(id) ?? null : null
  );

  useEffect(() => {
    if (!id) {
      setContent(null);
      return;
    }

    // Get initial value
    setContent(previewStore.get(id) ?? null);

    // Subscribe to updates
    return previewStore.subscribe(() => {
      setContent(previewStore.get(id) ?? null);
    });
  }, [id]);

  return content;
}

/**
 * Generate a unique preview ID
 */
export function generatePreviewId(): string {
  return `preview-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
