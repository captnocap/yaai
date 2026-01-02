import { useState, useEffect, useCallback } from 'react';
import type { ClaudeCodeConfig } from '../types/claude-code-config';
import { DEFAULT_CLAUDE_CODE_CONFIG } from '../types/claude-code-config';

const STORAGE_KEY = 'yaai-claude-code-config';

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Deep merge utility for nested config objects
 */
function deepMerge<T extends object>(target: T, source: DeepPartial<T>): T {
  const result = { ...target };

  for (const key in source) {
    if (source.hasOwnProperty(key)) {
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

/**
 * Hook for managing Claude Code persistent configuration
 * Uses localStorage for persistence (will be migrated to WebSocket/file storage later)
 */
export function useClaudeCodeConfig() {
  const [config, setConfig] = useState<ClaudeCodeConfig>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          return deepMerge(DEFAULT_CLAUDE_CODE_CONFIG, JSON.parse(stored));
        }
      } catch (e) {
        console.warn('Failed to load Claude Code config:', e);
      }
    }
    return DEFAULT_CLAUDE_CODE_CONFIG;
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Persist to localStorage when config changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch (e) {
      console.warn('Failed to save Claude Code config:', e);
    }
  }, [config]);

  // Update a specific section of the config
  const updateSection = useCallback(<K extends keyof ClaudeCodeConfig>(
    section: K,
    updates: Partial<ClaudeCodeConfig[K]>
  ) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        ...updates,
      },
    }));
  }, []);

  // Update a single value using dot notation (e.g., 'storage.strategy')
  const updateValue = useCallback((path: string, value: any) => {
    setConfig(prev => {
      const keys = path.split('.');
      const newConfig = { ...prev };
      let current: any = newConfig;

      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }

      current[keys[keys.length - 1]] = value;
      return newConfig;
    });
  }, []);

  // Reset a section to defaults
  const resetSection = useCallback(<K extends keyof ClaudeCodeConfig>(section: K) => {
    setConfig(prev => ({
      ...prev,
      [section]: DEFAULT_CLAUDE_CODE_CONFIG[section],
    }));
  }, []);

  // Reset all config to defaults
  const resetAll = useCallback(() => {
    setConfig(DEFAULT_CLAUDE_CODE_CONFIG);
  }, []);

  // Validate CLI path
  const validateCLIPath = useCallback(async (path: string): Promise<boolean> => {
    // In a real implementation, this would check via WebSocket if the path exists
    // For now, just check if it's not empty or looks like a valid path
    if (!path) return true; // Empty means auto-detect
    return path.includes('claude') || path.includes('/');
  }, []);

  // Export config to JSON
  const exportConfig = useCallback(() => {
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'claude-code-config.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [config]);

  // Import config from JSON
  const importConfig = useCallback((jsonString: string) => {
    try {
      const imported = JSON.parse(jsonString);
      setConfig(deepMerge(DEFAULT_CLAUDE_CODE_CONFIG, imported));
      setError(null);
      return true;
    } catch (e) {
      setError('Invalid configuration file');
      return false;
    }
  }, []);

  return {
    config,
    loading,
    error,
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
