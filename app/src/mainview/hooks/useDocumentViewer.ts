import { useState, useEffect, useCallback, useRef } from 'react';
import { sendMessage, onMessage } from '../lib/comm-bridge';
import { detectLanguage } from '../components/code/MonacoEditor';

export interface ActiveFile {
  path: string;
  content: string;
  language: string;
  isStreaming: boolean;
  lastUpdated: string;
}

export interface FileEdit {
  path: string;
  content?: string;
  diff?: string;
  operation: 'create' | 'modify' | 'delete';
}

export interface UseDocumentViewerOptions {
  sessionId: string;
  /** Auto-switch to files as they're edited */
  followMode?: boolean;
  /** Callback when a file is edited */
  onFileEdit?: (edit: FileEdit) => void;
}

export function useDocumentViewer({
  sessionId,
  followMode: initialFollowMode = true,
  onFileEdit,
}: UseDocumentViewerOptions) {
  const [activeFile, setActiveFile] = useState<ActiveFile | null>(null);
  const [isFollowMode, setIsFollowMode] = useState(initialFollowMode);
  const [recentFiles, setRecentFiles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const contentBufferRef = useRef<Map<string, string>>(new Map());

  // Load a file's content - must be declared before useEffects that reference it
  const loadFile = useCallback(async (path: string, providedContent?: string) => {
    setError(null);

    // If content is provided, use it directly
    if (providedContent !== undefined) {
      setActiveFile({
        path,
        content: providedContent,
        language: detectLanguage(path),
        isStreaming: false,
        lastUpdated: new Date().toISOString(),
      });
      return;
    }

    // Check buffer first
    const bufferedContent = contentBufferRef.current.get(path);
    if (bufferedContent) {
      setActiveFile({
        path,
        content: bufferedContent,
        language: detectLanguage(path),
        isStreaming: true,
        lastUpdated: new Date().toISOString(),
      });
      return;
    }

    // Load from backend
    setIsLoading(true);

    try {
      const response = await sendMessage<{ ok: boolean; content?: string; error?: string }>('file:read', { path });

      if (response.ok && response.content) {
        setActiveFile({
          path,
          content: response.content,
          language: detectLanguage(path),
          isStreaming: false,
          lastUpdated: new Date().toISOString(),
        });
      } else {
        setError(response.error || 'Failed to load file');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load file');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Subscribe to file edit events
  useEffect(() => {
    if (!sessionId) return;

    const unsubscribe = onMessage('code-session:file-edit', (data: any) => {
      if (data.sessionId !== sessionId) return;

      const edit = data.edit as FileEdit;
      onFileEdit?.(edit);

      // Update recent files
      setRecentFiles(prev => {
        const filtered = prev.filter(f => f !== edit.path);
        return [edit.path, ...filtered].slice(0, 10);
      });

      // Auto-switch to edited file if follow mode is on
      if (isFollowMode && edit.operation !== 'delete') {
        loadFile(edit.path, edit.content);
      }
    });

    return unsubscribe;
  }, [sessionId, isFollowMode, onFileEdit, loadFile]);

  // Subscribe to streaming content updates
  useEffect(() => {
    if (!sessionId) return;

    const unsubscribe = onMessage('code-session:content-stream', (data: any) => {
      if (data.sessionId !== sessionId) return;

      const { path, chunk, isComplete } = data;

      // Buffer the content
      const currentContent = contentBufferRef.current.get(path) || '';
      const newContent = currentContent + chunk;
      contentBufferRef.current.set(path, newContent);

      // Update active file if it's the current one
      if (activeFile?.path === path) {
        setActiveFile(prev => prev ? {
          ...prev,
          content: newContent,
          isStreaming: !isComplete,
          lastUpdated: new Date().toISOString(),
        } : null);
      }

      // Clear buffer when complete
      if (isComplete) {
        contentBufferRef.current.delete(path);
      }
    });

    return unsubscribe;
  }, [sessionId, activeFile?.path]);

  // Clear active file
  const clearFile = useCallback(() => {
    setActiveFile(null);
    setError(null);
  }, []);

  // Toggle follow mode
  const toggleFollowMode = useCallback(() => {
    setIsFollowMode(prev => !prev);
  }, []);

  // Update file content (for editing)
  const updateContent = useCallback((content: string) => {
    setActiveFile(prev => prev ? {
      ...prev,
      content,
      lastUpdated: new Date().toISOString(),
    } : null);
  }, []);

  // Save file
  const saveFile = useCallback(async () => {
    if (!activeFile) return { ok: false, error: 'No file to save' };

    try {
      const response = await sendMessage<{ ok: boolean; error?: string }>('file:write', {
        path: activeFile.path,
        content: activeFile.content,
      });

      return response;
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Failed to save' };
    }
  }, [activeFile]);

  return {
    // State
    activeFile,
    isFollowMode,
    recentFiles,
    isLoading,
    error,

    // Actions
    loadFile,
    clearFile,
    toggleFollowMode,
    updateContent,
    saveFile,
    setIsFollowMode,
  };
}
