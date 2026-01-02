// =============================================================================
// SETTINGS STORE
// =============================================================================
// Manages application settings persistence on disk.
// Stores settings at ~/.yaai/settings.json

import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { EventEmitter } from 'events';
import { YAAI_HOME } from './paths';

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
  apiKey?: string; // Stored in credential store, not here
  baseUrl?: string;
  defaultModel?: string;
}

export type SettingsEvent = 'updated';

// -----------------------------------------------------------------------------
// DEFAULTS
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
// IMPLEMENTATION
// -----------------------------------------------------------------------------

export class SettingsStore {
  private settings: AppSettings = { ...DEFAULT_SETTINGS };
  private events = new EventEmitter();
  private initialized = false;
  private filePath: string;

  constructor() {
    this.filePath = join(YAAI_HOME, 'settings.json');
  }

  // ---------------------------------------------------------------------------
  // INITIALIZATION
  // ---------------------------------------------------------------------------

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Ensure directory exists
      await mkdir(YAAI_HOME, { recursive: true });

      // Try to load existing settings
      const content = await readFile(this.filePath, 'utf-8');
      const loaded = JSON.parse(content);

      // Deep merge with defaults to handle new settings
      this.settings = this.deepMerge(DEFAULT_SETTINGS, loaded);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        // No settings file, use defaults and save
        this.settings = { ...DEFAULT_SETTINGS };
        await this.save();
      } else {
        console.error('[SettingsStore] Failed to load settings:', err);
        this.settings = { ...DEFAULT_SETTINGS };
      }
    }

    this.initialized = true;
  }

  // ---------------------------------------------------------------------------
  // OPERATIONS
  // ---------------------------------------------------------------------------

  /**
   * Get all settings
   */
  getAll(): AppSettings {
    return { ...this.settings };
  }

  /**
   * Get a specific setting by path (e.g., 'chat.temperature')
   */
  get<T>(path: string): T | undefined {
    const parts = path.split('.');
    let value: any = this.settings;

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value as T;
  }

  /**
   * Update settings
   */
  async update(updates: Partial<AppSettings>): Promise<AppSettings> {
    this.settings = this.deepMerge(this.settings, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });

    await this.save();
    this.events.emit('updated', this.settings);

    return this.getAll();
  }

  /**
   * Set a specific setting by path
   */
  async set(path: string, value: unknown): Promise<void> {
    const parts = path.split('.');
    let target: any = this.settings;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in target)) {
        target[part] = {};
      }
      target = target[part];
    }

    target[parts[parts.length - 1]] = value;
    this.settings.updatedAt = new Date().toISOString();

    await this.save();
    this.events.emit('updated', this.settings);
  }

  /**
   * Reset to defaults
   */
  async reset(): Promise<AppSettings> {
    this.settings = { ...DEFAULT_SETTINGS, updatedAt: new Date().toISOString() };
    await this.save();
    this.events.emit('updated', this.settings);
    return this.getAll();
  }

  /**
   * Reset a specific section
   */
  async resetSection(section: keyof AppSettings): Promise<void> {
    if (section in DEFAULT_SETTINGS) {
      (this.settings as any)[section] = (DEFAULT_SETTINGS as any)[section];
      this.settings.updatedAt = new Date().toISOString();
      await this.save();
      this.events.emit('updated', this.settings);
    }
  }

  // ---------------------------------------------------------------------------
  // EVENTS
  // ---------------------------------------------------------------------------

  on(event: SettingsEvent, handler: (settings: AppSettings) => void): () => void {
    this.events.on(event, handler);
    return () => this.events.off(event, handler);
  }

  // ---------------------------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------------------------

  private async save(): Promise<void> {
    try {
      await writeFile(
        this.filePath,
        JSON.stringify(this.settings, null, 2)
      );
    } catch (err) {
      console.error('[SettingsStore] Failed to save settings:', err);
    }
  }

  private deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
    const result = { ...target };

    for (const key of Object.keys(source)) {
      const sourceValue = (source as any)[key];
      const targetValue = (result as any)[key];

      if (
        sourceValue !== null &&
        typeof sourceValue === 'object' &&
        !Array.isArray(sourceValue) &&
        targetValue !== null &&
        typeof targetValue === 'object' &&
        !Array.isArray(targetValue)
      ) {
        (result as any)[key] = this.deepMerge(targetValue, sourceValue);
      } else if (sourceValue !== undefined) {
        (result as any)[key] = sourceValue;
      }
    }

    return result;
  }
}

// -----------------------------------------------------------------------------
// SINGLETON
// -----------------------------------------------------------------------------

let settingsStoreInstance: SettingsStore | null = null;

export function getSettingsStore(): SettingsStore {
  if (!settingsStoreInstance) {
    settingsStoreInstance = new SettingsStore();
  }
  return settingsStoreInstance;
}
