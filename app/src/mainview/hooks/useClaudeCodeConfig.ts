// =============================================================================
// USE CLAUDE CODE CONFIG
// =============================================================================
// Hook for managing Claude Code configuration via WebSocket.
// Settings are persisted in ~/.yaai/settings.json via the backend SettingsStore.

import { useState, useEffect, useCallback, useRef } from 'react';
import { sendMessage, onMessage } from '../lib/comm-bridge';
import type { ClaudeCodeConfig } from '../types/claude-code-config';
import { DEFAULT_CLAUDE_CODE_CONFIG } from '../types/claude-code-config';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface UseClaudeCodeConfigReturn {
  config: ClaudeCodeConfig;
  loading: boolean;
  error: string | null;
  connected: boolean;

  // Update operations
  updateSection: <K extends keyof ClaudeCodeConfig>(
    section: K,
    updates: Partial<ClaudeCodeConfig[K]>
  ) => Promise<void>;
  updateValue: (path: string, value: unknown) => Promise<void>;

  // Reset operations
  resetSection: <K extends keyof ClaudeCodeConfig>(section: K) => Promise<void>;
  resetAll: () => Promise<void>;

  // CLI path validation
  validateCLIPath: (path: string) => Promise<boolean>;

  // Export/Import
  exportConfig: () => void;
  importConfig: (jsonString: string) => boolean;

  // Clear error
  clearError: () => void;
}

// -----------------------------------------------------------------------------
// DEEP MERGE UTILITY
// -----------------------------------------------------------------------------

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

function deepMerge<T extends object>(target: T, source: DeepPartial<T>): T {
  const result = { ...target };

  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const sourceValue = source[key];
      const targetValue = target[key];

      if (
        sourceValue !== undefined &&
        typeof sourceValue === 'object' &&
        sourceValue !== null &&
        !Array.isArray(sourceValue) &&
        typeof targetValue === 'object' &&
        targetValue !== null &&
        !Array.isArray(targetValue)
      ) {
        (result as any)[key] = deepMerge(targetValue, sourceValue as any);
      } else if (sourceValue !== undefined) {
        (result as any)[key] = sourceValue;
      }
    }
  }

  return result;
}

// -----------------------------------------------------------------------------
// HOOK
// -----------------------------------------------------------------------------

export function useClaudeCodeConfig(): UseClaudeCodeConfigReturn {
  const [config, setConfig] = useState<ClaudeCodeConfig>(DEFAULT_CLAUDE_CODE_CONFIG);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  const initialized = useRef(false);

  // ---------------------------------------------------------------------------
  // LOAD CONFIG
  // ---------------------------------------------------------------------------

  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all settings and extract claudeCode section
      const allSettings = await sendMessage<{ claudeCode?: ClaudeCodeConfig }>('settings:get-all');

      if (allSettings?.claudeCode) {
        // Merge with defaults to handle any missing fields
        setConfig(deepMerge(DEFAULT_CLAUDE_CODE_CONFIG, allSettings.claudeCode));
        setConnected(true);
      } else {
        // No claudeCode section yet, use defaults
        setConfig(DEFAULT_CLAUDE_CODE_CONFIG);
        setConnected(true);
      }
    } catch (err) {
      console.warn('[useClaudeCodeConfig] Failed to load from backend, using defaults:', err);
      setConfig(DEFAULT_CLAUDE_CODE_CONFIG);
      setConnected(false);
      setError('Failed to connect to backend');
    } finally {
      setLoading(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // UPDATE OPERATIONS
  // ---------------------------------------------------------------------------

  const updateSection = useCallback(async <K extends keyof ClaudeCodeConfig>(
    section: K,
    updates: Partial<ClaudeCodeConfig[K]>
  ) => {
    try {
      setError(null);

      // Optimistic update
      setConfig(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          ...updates,
        },
      }));

      // Send to backend
      await sendMessage<void>('settings:update', {
        claudeCode: {
          [section]: updates,
        },
      });
    } catch (err) {
      setError((err as Error).message);
      // Reload to get actual state
      await loadConfig();
    }
  }, [loadConfig]);

  const updateValue = useCallback(async (path: string, value: unknown) => {
    try {
      setError(null);

      // Optimistic update
      setConfig(prev => {
        const keys = path.split('.');
        const newConfig = JSON.parse(JSON.stringify(prev)); // Deep clone
        let current: any = newConfig;

        for (let i = 0; i < keys.length - 1; i++) {
          if (!(keys[i] in current)) {
            current[keys[i]] = {};
          }
          current = current[keys[i]];
        }

        current[keys[keys.length - 1]] = value;
        return newConfig;
      });

      // Send to backend with full path prefixed by 'claudeCode.'
      await sendMessage<void>('settings:set', {
        path: `claudeCode.${path}`,
        value,
      });
    } catch (err) {
      setError((err as Error).message);
      // Reload to get actual state
      await loadConfig();
    }
  }, [loadConfig]);

  // ---------------------------------------------------------------------------
  // RESET OPERATIONS
  // ---------------------------------------------------------------------------

  const resetSection = useCallback(async <K extends keyof ClaudeCodeConfig>(section: K) => {
    try {
      setError(null);

      // Optimistic update
      setConfig(prev => ({
        ...prev,
        [section]: DEFAULT_CLAUDE_CODE_CONFIG[section],
      }));

      // Send to backend
      await sendMessage<void>('settings:update', {
        claudeCode: {
          [section]: DEFAULT_CLAUDE_CODE_CONFIG[section],
        },
      });
    } catch (err) {
      setError((err as Error).message);
      await loadConfig();
    }
  }, [loadConfig]);

  const resetAll = useCallback(async () => {
    try {
      setError(null);

      // Optimistic update
      setConfig(DEFAULT_CLAUDE_CODE_CONFIG);

      // Send to backend
      await sendMessage<void>('settings:update', {
        claudeCode: DEFAULT_CLAUDE_CODE_CONFIG,
      });
    } catch (err) {
      setError((err as Error).message);
      await loadConfig();
    }
  }, [loadConfig]);

  // ---------------------------------------------------------------------------
  // CLI PATH VALIDATION
  // ---------------------------------------------------------------------------

  const validateCLIPath = useCallback(async (path: string): Promise<boolean> => {
    if (!path) return true; // Empty means auto-detect

    try {
      // Ask backend to validate the path
      const result = await sendMessage<{ valid: boolean; error?: string }>(
        'claude-code:validate-cli-path',
        { path }
      );
      return result?.valid ?? false;
    } catch {
      // If validation fails, do basic client-side check
      return path.includes('claude') || path.startsWith('/') || path.startsWith('~');
    }
  }, []);

  // ---------------------------------------------------------------------------
  // EXPORT/IMPORT
  // ---------------------------------------------------------------------------

  const exportConfig = useCallback(() => {
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'claude-code-config.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [config]);

  const importConfig = useCallback((jsonString: string): boolean => {
    try {
      const imported = JSON.parse(jsonString);
      const merged = deepMerge(DEFAULT_CLAUDE_CODE_CONFIG, imported);

      // Update locally
      setConfig(merged);
      setError(null);

      // Send to backend
      sendMessage<void>('settings:update', { claudeCode: merged }).catch(err => {
        setError(`Failed to save imported config: ${(err as Error).message}`);
      });

      return true;
    } catch (e) {
      setError('Invalid configuration file');
      return false;
    }
  }, []);

  // ---------------------------------------------------------------------------
  // WEBSOCKET EVENT LISTENERS
  // ---------------------------------------------------------------------------

  useEffect(() => {
    // Listen for settings updates from other sources
    const unsub = onMessage('settings:updated', (data: any) => {
      if (data?.settings?.claudeCode) {
        setConfig(deepMerge(DEFAULT_CLAUDE_CODE_CONFIG, data.settings.claudeCode));
      }
    });

    return unsub;
  }, []);

  // ---------------------------------------------------------------------------
  // INITIALIZATION
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    loadConfig();
  }, [loadConfig]);

  return {
    config,
    loading,
    error,
    connected,
    updateSection,
    updateValue,
    resetSection,
    resetAll,
    validateCLIPath,
    exportConfig,
    importConfig,
    clearError: () => setError(null),
  };
}
