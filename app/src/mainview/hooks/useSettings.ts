// =============================================================================
// USE SETTINGS
// =============================================================================
// Hook for managing application settings with persistence via WebSocket.

import { useState, useCallback, useEffect, useRef } from 'react';
import { sendMessage, onMessage } from '../lib/comm-bridge';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface AppSettings {
  // Appearance
  theme: 'dark' | 'light' | 'system';
  fontSize: number;
  fontFamily: string;
  accentColor: string;

  // Providers
  providers: {
    openai: ProviderSettings;
    anthropic: ProviderSettings;
    google: ProviderSettings;
    [key: string]: ProviderSettings;
  };

  // Proxy
  proxy: {
    enabled: boolean;
    host: string;
    port: number;
    auth?: {
      username: string;
      password: string;
    };
  };

  // Chat behavior
  chat: {
    streamResponses: boolean;
    autoSaveChats: boolean;
    autoGenerateTitle: boolean;
    defaultModel: string;
    maxTokens: number;
    temperature: number;
  };

  // Effects (mood-based UI)
  effects: {
    enabled: boolean;
    intensity: number;
  };

  // Keyboard shortcuts
  shortcuts: Record<string, string>;

  // Window state
  window: {
    width: number;
    height: number;
    x?: number;
    y?: number;
    maximized: boolean;
  };

  // Last updated
  updatedAt: string;
}

export interface ProviderSettings {
  enabled: boolean;
  apiKey?: string;
  baseUrl?: string;
  defaultModel?: string;
}

export interface UseSettingsOptions {
  /** Auto-load settings on mount */
  autoLoad?: boolean;
}

export interface UseSettingsReturn {
  settings: AppSettings | null;
  loading: boolean;
  error: string | null;

  // Load/refresh
  loadSettings: () => Promise<void>;

  // Update operations
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
  setSetting: (path: string, value: unknown) => Promise<void>;

  // Reset operations
  resetSettings: () => Promise<void>;
  resetSection: (section: keyof AppSettings) => Promise<void>;

  // Convenience accessors
  theme: 'dark' | 'light' | 'system';
  setTheme: (theme: 'dark' | 'light' | 'system') => Promise<void>;
  isProxyEnabled: boolean;
  setProxyEnabled: (enabled: boolean) => Promise<void>;
}

// -----------------------------------------------------------------------------
// DEFAULTS (for offline/demo mode)
// -----------------------------------------------------------------------------

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  fontSize: 14,
  fontFamily: 'system-ui',
  accentColor: '#8B5CF6',

  providers: {
    openai: { enabled: true },
    anthropic: { enabled: true },
    google: { enabled: true },
  },

  proxy: {
    enabled: false,
    host: '',
    port: 8080,
  },

  chat: {
    streamResponses: true,
    autoSaveChats: true,
    autoGenerateTitle: true,
    defaultModel: 'claude-3-opus',
    maxTokens: 4096,
    temperature: 0.7,
  },

  effects: {
    enabled: false,
    intensity: 0.7,
  },

  shortcuts: {
    newChat: 'Ctrl+N',
    send: 'Enter',
    sendWithShift: 'Shift+Enter',
    toggleSidebar: 'Ctrl+B',
    settings: 'Ctrl+,',
    search: 'Ctrl+K',
  },

  window: {
    width: 1200,
    height: 800,
    maximized: false,
  },

  updatedAt: new Date().toISOString(),
};

// -----------------------------------------------------------------------------
// LOCAL STORAGE FALLBACK
// -----------------------------------------------------------------------------

// Local storage fallback for demo/offline mode
const STORAGE_KEY = 'yaai-settings';

function loadFromStorage(): AppSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.warn('Failed to load settings from localStorage:', e);
  }
  return DEFAULT_SETTINGS;
}

function saveToStorage(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('Failed to save settings to localStorage:', e);
  }
}

// -----------------------------------------------------------------------------
// HOOK
// -----------------------------------------------------------------------------

export function useSettings(options: UseSettingsOptions = {}): UseSettingsReturn {
  const { autoLoad = true } = options;

  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialized = useRef(false);
  const usingWS = useRef(false);

  // ---------------------------------------------------------------------------
  // LOAD SETTINGS
  // ---------------------------------------------------------------------------

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const loaded = await sendMessage<AppSettings>('settings:get-all');
      usingWS.current = true;
      setSettings(loaded);
    } catch (err) {
      // Fall back to localStorage
      usingWS.current = false;
      setSettings(loadFromStorage());
    } finally {
      setLoading(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // UPDATE OPERATIONS
  // ---------------------------------------------------------------------------

  const updateSettings = useCallback(async (updates: Partial<AppSettings>) => {
    try {
      setError(null);

      if (usingWS.current) {
        const updated = await sendMessage<AppSettings>('settings:update', updates);
        setSettings(updated);
      } else {
        // Fallback mode
        setSettings(prev => {
          if (!prev) return prev;
          const updated = { ...prev, ...updates, updatedAt: new Date().toISOString() };
          saveToStorage(updated);
          return updated;
        });
      }
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  const setSetting = useCallback(async (path: string, value: unknown) => {
    try {
      setError(null);

      if (usingWS.current) {
        await sendMessage<void>('settings:set', { path, value });
        // Reload to get updated settings
        await loadSettings();
      } else {
        // Fallback mode - update nested path
        setSettings(prev => {
          if (!prev) return prev;

          const parts = path.split('.');
          const updated = JSON.parse(JSON.stringify(prev)); // Deep clone
          let target: any = updated;

          for (let i = 0; i < parts.length - 1; i++) {
            if (!(parts[i] in target)) {
              target[parts[i]] = {};
            }
            target = target[parts[i]];
          }
          target[parts[parts.length - 1]] = value;
          updated.updatedAt = new Date().toISOString();

          saveToStorage(updated);
          return updated;
        });
      }
    } catch (err) {
      setError((err as Error).message);
    }
  }, [loadSettings]);

  // ---------------------------------------------------------------------------
  // RESET OPERATIONS
  // ---------------------------------------------------------------------------

  const resetSettings = useCallback(async () => {
    try {
      setError(null);

      if (usingWS.current) {
        const reset = await sendMessage<AppSettings>('settings:reset');
        setSettings(reset);
      } else {
        const reset = { ...DEFAULT_SETTINGS, updatedAt: new Date().toISOString() };
        saveToStorage(reset);
        setSettings(reset);
      }
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  const resetSection = useCallback(async (section: keyof AppSettings) => {
    try {
      setError(null);

      if (usingWS.current) {
        await sendMessage<void>('settings:reset-section', section);
        await loadSettings();
      } else {
        setSettings(prev => {
          if (!prev) return prev;
          const updated = {
            ...prev,
            [section]: DEFAULT_SETTINGS[section],
            updatedAt: new Date().toISOString(),
          };
          saveToStorage(updated);
          return updated;
        });
      }
    } catch (err) {
      setError((err as Error).message);
    }
  }, [loadSettings]);

  // ---------------------------------------------------------------------------
  // CONVENIENCE METHODS
  // ---------------------------------------------------------------------------

  const setTheme = useCallback(async (theme: 'dark' | 'light' | 'system') => {
    await setSetting('theme', theme);
  }, [setSetting]);

  const setProxyEnabled = useCallback(async (enabled: boolean) => {
    await setSetting('proxy.enabled', enabled);
  }, [setSetting]);

  // ---------------------------------------------------------------------------
  // WEBSOCKET EVENT LISTENERS
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const unsub = onMessage('settings:updated', (data: any) => {
      if (data?.settings) {
        setSettings(data.settings);
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

    if (autoLoad) {
      loadSettings();
    }
  }, [autoLoad, loadSettings]);

  // ---------------------------------------------------------------------------
  // APPLY THEME
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!settings) return;

    // Apply theme to document
    const root = document.documentElement;

    let effectiveTheme = settings.theme;
    if (effectiveTheme === 'system') {
      effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    }

    root.setAttribute('data-theme', effectiveTheme);
  }, [settings?.theme]);

  return {
    settings,
    loading,
    error,
    loadSettings,
    updateSettings,
    setSetting,
    resetSettings,
    resetSection,
    theme: settings?.theme ?? 'dark',
    setTheme,
    isProxyEnabled: settings?.proxy?.enabled ?? false,
    setProxyEnabled,
  };
}
