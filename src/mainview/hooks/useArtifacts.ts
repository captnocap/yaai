// =============================================================================
// USE ARTIFACTS HOOK
// =============================================================================
// React hook for interacting with the artifact system.
// Handles WebSocket communication with the main process.

import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  ArtifactManifest,
  ArtifactQuery,
  ArtifactExecutionResult,
  ArtifactStatus,
  ArtifactFiles,
} from '../types';
import { sendMessage, onMessage } from '../lib/comm-bridge';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface ArtifactWithStatus {
  manifest: ArtifactManifest;
  status: ArtifactStatus;
}

export interface UseArtifactsReturn {
  // State
  artifacts: ArtifactWithStatus[];
  loading: boolean;
  error: string | null;

  // Execution state
  executing: Set<string>;
  results: Map<string, ArtifactExecutionResult>;

  // Actions
  refresh: () => Promise<void>;
  invoke: (artifactId: string, input?: unknown) => Promise<ArtifactExecutionResult>;
  cancel: (requestId: string) => void;
  install: (manifest: ArtifactManifest, files: ArtifactFiles) => Promise<void>;
  uninstall: (artifactId: string) => Promise<void>;
  update: (artifactId: string, manifest?: Partial<ArtifactManifest>, files?: Partial<ArtifactFiles>) => Promise<void>;
  enable: (artifactId: string) => Promise<void>;
  disable: (artifactId: string) => Promise<void>;
  getUICode: (artifactId: string) => Promise<string | null>;
}

export interface UseArtifactsOptions {
  query?: ArtifactQuery;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

// -----------------------------------------------------------------------------
// HOOK
// -----------------------------------------------------------------------------

export function useArtifacts(options: UseArtifactsOptions = {}): UseArtifactsReturn {
  const { query, autoRefresh = false, refreshInterval = 30000 } = options;

  // State
  const [artifacts, setArtifacts] = useState<ArtifactWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [executing, setExecuting] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<Map<string, ArtifactExecutionResult>>(new Map());

  // Track pending requests
  const pendingRequests = useRef<Map<string, string>>(new Map()); // requestId -> artifactId

  // Refresh artifacts list
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const manifests = await sendMessage<ArtifactManifest[]>('artifact:list', query);

      // Convert to ArtifactWithStatus
      const withStatus: ArtifactWithStatus[] = manifests.map(manifest => ({
        manifest,
        status: manifest.enabled === false ? 'disabled' : 'installed',
      }));

      setArtifacts(withStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load artifacts');
    } finally {
      setLoading(false);
    }
  }, [query]);

  // Invoke an artifact
  const invoke = useCallback(async (artifactId: string, input?: unknown): Promise<ArtifactExecutionResult> => {
    const requestId = crypto.randomUUID();

    // Track execution
    setExecuting(prev => new Set(prev).add(artifactId));
    pendingRequests.current.set(requestId, artifactId);

    // Update status
    setArtifacts(prev =>
      prev.map(a =>
        a.manifest.id === artifactId
          ? { ...a, status: 'running' as ArtifactStatus }
          : a
      )
    );

    try {
      const result = await sendMessage<ArtifactExecutionResult>('artifact:invoke', {
        artifactId,
        input,
        requestId,
      });

      // Store result
      setResults(prev => new Map(prev).set(artifactId, result));

      return result;
    } catch (err) {
      const errorResult: ArtifactExecutionResult = {
        success: false,
        error: {
          code: 'EXECUTION_ERROR',
          message: err instanceof Error ? err.message : 'Unknown error',
        },
        duration: 0,
        cached: false,
      };

      setResults(prev => new Map(prev).set(artifactId, errorResult));
      return errorResult;
    } finally {
      // Clean up
      setExecuting(prev => {
        const next = new Set(prev);
        next.delete(artifactId);
        return next;
      });
      pendingRequests.current.delete(requestId);

      // Reset status
      setArtifacts(prev =>
        prev.map(a =>
          a.manifest.id === artifactId
            ? { ...a, status: a.manifest.enabled === false ? 'disabled' : 'installed' }
            : a
        )
      );
    }
  }, []);

  // Cancel execution
  const cancel = useCallback((requestId: string) => {
    sendMessage('artifact:cancel', requestId);
    pendingRequests.current.delete(requestId);
  }, []);

  // Install artifact
  const install = useCallback(async (manifest: ArtifactManifest, files: ArtifactFiles) => {
    await sendMessage('artifact:install', { manifest, files });
    await refresh();
  }, [refresh]);

  // Uninstall artifact
  const uninstall = useCallback(async (artifactId: string) => {
    await sendMessage('artifact:uninstall', artifactId);
    setArtifacts(prev => prev.filter(a => a.manifest.id !== artifactId));
    setResults(prev => {
      const next = new Map(prev);
      next.delete(artifactId);
      return next;
    });
  }, []);

  // Update artifact
  const update = useCallback(async (
    artifactId: string,
    manifest?: Partial<ArtifactManifest>,
    files?: Partial<ArtifactFiles>
  ) => {
    await sendMessage('artifact:update', { id: artifactId, manifest, files });
    await refresh();
  }, [refresh]);

  // Enable artifact
  const enable = useCallback(async (artifactId: string) => {
    await sendMessage('artifact:enable', artifactId);
    setArtifacts(prev =>
      prev.map(a =>
        a.manifest.id === artifactId
          ? { ...a, manifest: { ...a.manifest, enabled: true }, status: 'installed' }
          : a
      )
    );
  }, []);

  // Disable artifact
  const disable = useCallback(async (artifactId: string) => {
    await sendMessage('artifact:disable', artifactId);
    setArtifacts(prev =>
      prev.map(a =>
        a.manifest.id === artifactId
          ? { ...a, manifest: { ...a.manifest, enabled: false }, status: 'disabled' }
          : a
      )
    );
  }, []);

  // Get UI code
  const getUICode = useCallback(async (artifactId: string): Promise<string | null> => {
    return await sendMessage<string | null>('artifact:get-ui', artifactId);
  }, []);

  // Initial load
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(refresh, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refresh]);

  // Listen for events from main process
  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    unsubscribers.push(
      onMessage('artifact:installed', (data: any) => {
        setArtifacts(prev => [
          ...prev,
          { manifest: data.manifest, status: 'installed' },
        ]);
      })
    );

    unsubscribers.push(
      onMessage('artifact:uninstalled', (data: any) => {
        setArtifacts(prev =>
          prev.filter(a => a.manifest.id !== data.artifactId)
        );
      })
    );

    unsubscribers.push(
      onMessage('artifact:updated', (data: any) => {
        setArtifacts(prev =>
          prev.map(a =>
            a.manifest.id === data.manifest.id
              ? { ...a, manifest: data.manifest }
              : a
          )
        );
      })
    );

    unsubscribers.push(
      onMessage('artifact:enabled', (data: any) => {
        setArtifacts(prev =>
          prev.map(a =>
            a.manifest.id === data.artifactId
              ? { ...a, status: 'installed', manifest: { ...a.manifest, enabled: true } }
              : a
          )
        );
      })
    );

    unsubscribers.push(
      onMessage('artifact:disabled', (data: any) => {
        setArtifacts(prev =>
          prev.map(a =>
            a.manifest.id === data.artifactId
              ? { ...a, status: 'disabled', manifest: { ...a.manifest, enabled: false } }
              : a
          )
        );
      })
    );

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, []);

  return {
    artifacts,
    loading,
    error,
    executing,
    results,
    refresh,
    invoke,
    cancel,
    install,
    uninstall,
    update,
    enable,
    disable,
    getUICode,
  };
}
