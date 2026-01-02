// =============================================================================
// USE EFFECTS SETTINGS HOOK
// =============================================================================
// Persistent settings management for the effects system.
// Stores settings in localStorage and provides reactive updates.

import { useState, useEffect, useCallback } from 'react';
import type { EffectsSettings, TextRule, EffectLayers, Mood, MoodTheme } from '../types/effects';
import { DEFAULT_EFFECTS_SETTINGS, PRESET_TEXT_RULES } from '../types/effects';
import { createTextRule } from '../lib/effects/text-processor';

const STORAGE_KEY = 'yaai-effects-settings';

// -----------------------------------------------------------------------------
// STORAGE HELPERS
// -----------------------------------------------------------------------------

function loadSettings(): EffectsSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with defaults to handle new settings
      return { ...DEFAULT_EFFECTS_SETTINGS, ...parsed };
    }
  } catch (e) {
    console.warn('Failed to load effects settings:', e);
  }
  return DEFAULT_EFFECTS_SETTINGS;
}

function saveSettings(settings: EffectsSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('Failed to save effects settings:', e);
  }
}

// -----------------------------------------------------------------------------
// HOOK
// -----------------------------------------------------------------------------

export interface UseEffectsSettingsReturn {
  settings: EffectsSettings;

  // Master controls
  setEnabled: (enabled: boolean) => void;
  setIntensity: (intensity: number) => void;

  // Layer controls
  toggleLayer: (layer: keyof EffectLayers, enabled?: boolean) => void;
  setAllLayers: (enabled: boolean) => void;

  // Mood controls
  setManualMood: (mood: Mood | null) => void;
  setMoodTransitionDuration: (ms: number) => void;
  setMoodConfidenceThreshold: (threshold: number) => void;
  setMoodThemeOverride: (mood: Mood, overrides: Partial<MoodTheme>) => void;

  // Text rule controls
  addTextRule: (rule: Partial<TextRule>) => void;
  updateTextRule: (ruleId: string, updates: Partial<TextRule>) => void;
  removeTextRule: (ruleId: string) => void;
  toggleTextRule: (ruleId: string, enabled?: boolean) => void;
  enablePresetRule: (presetId: string) => void;

  // Bulk operations
  resetToDefaults: () => void;
  importSettings: (settings: Partial<EffectsSettings>) => void;
  exportSettings: () => EffectsSettings;
}

export function useEffectsSettings(): UseEffectsSettingsReturn {
  const [settings, setSettings] = useState<EffectsSettings>(loadSettings);

  // Persist on change
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  // Master controls
  const setEnabled = useCallback((enabled: boolean) => {
    setSettings((s) => ({ ...s, enabled }));
  }, []);

  const setIntensity = useCallback((intensity: number) => {
    setSettings((s) => ({ ...s, intensity: Math.max(0, Math.min(1, intensity)) }));
  }, []);

  // Layer controls
  const toggleLayer = useCallback((layer: keyof EffectLayers, enabled?: boolean) => {
    setSettings((s) => ({
      ...s,
      layers: {
        ...s.layers,
        [layer]: enabled ?? !s.layers[layer],
      },
    }));
  }, []);

  const setAllLayers = useCallback((enabled: boolean) => {
    setSettings((s) => ({
      ...s,
      layers: Object.fromEntries(
        Object.keys(s.layers).map((k) => [k, enabled])
      ) as EffectLayers,
    }));
  }, []);

  // Mood controls
  const setManualMood = useCallback((mood: Mood | null) => {
    setSettings((s) => ({ ...s, manualMood: mood }));
  }, []);

  const setMoodTransitionDuration = useCallback((ms: number) => {
    setSettings((s) => ({ ...s, moodTransitionDuration: Math.max(0, ms) }));
  }, []);

  const setMoodConfidenceThreshold = useCallback((threshold: number) => {
    setSettings((s) => ({
      ...s,
      moodConfidenceThreshold: Math.max(0, Math.min(1, threshold)),
    }));
  }, []);

  const setMoodThemeOverride = useCallback((mood: Mood, overrides: Partial<MoodTheme>) => {
    setSettings((s) => ({
      ...s,
      moodThemeOverrides: {
        ...s.moodThemeOverrides,
        [mood]: {
          ...s.moodThemeOverrides[mood],
          ...overrides,
        },
      },
    }));
  }, []);

  // Text rule controls
  const addTextRule = useCallback((rule: Partial<TextRule>) => {
    const newRule = createTextRule(rule);
    setSettings((s) => ({
      ...s,
      textRules: [...s.textRules, newRule],
    }));
  }, []);

  const updateTextRule = useCallback((ruleId: string, updates: Partial<TextRule>) => {
    setSettings((s) => ({
      ...s,
      textRules: s.textRules.map((r) =>
        r.id === ruleId ? { ...r, ...updates } : r
      ),
    }));
  }, []);

  const removeTextRule = useCallback((ruleId: string) => {
    setSettings((s) => ({
      ...s,
      textRules: s.textRules.filter((r) => r.id !== ruleId),
    }));
  }, []);

  const toggleTextRule = useCallback((ruleId: string, enabled?: boolean) => {
    setSettings((s) => ({
      ...s,
      textRules: s.textRules.map((r) =>
        r.id === ruleId ? { ...r, enabled: enabled ?? !r.enabled } : r
      ),
    }));
  }, []);

  const enablePresetRule = useCallback((presetId: string) => {
    const preset = PRESET_TEXT_RULES.find((r) => r.id === presetId);
    if (!preset) return;

    setSettings((s) => {
      // Check if already exists
      const existing = s.textRules.find((r) => r.id === presetId);
      if (existing) {
        // Enable it
        return {
          ...s,
          textRules: s.textRules.map((r) =>
            r.id === presetId ? { ...r, enabled: true } : r
          ),
        };
      }
      // Add it
      return {
        ...s,
        textRules: [...s.textRules, { ...preset, enabled: true }],
      };
    });
  }, []);

  // Bulk operations
  const resetToDefaults = useCallback(() => {
    setSettings(DEFAULT_EFFECTS_SETTINGS);
  }, []);

  const importSettings = useCallback((imported: Partial<EffectsSettings>) => {
    setSettings((s) => ({ ...s, ...imported }));
  }, []);

  const exportSettings = useCallback(() => settings, [settings]);

  return {
    settings,
    setEnabled,
    setIntensity,
    toggleLayer,
    setAllLayers,
    setManualMood,
    setMoodTransitionDuration,
    setMoodConfidenceThreshold,
    setMoodThemeOverride,
    addTextRule,
    updateTextRule,
    removeTextRule,
    toggleTextRule,
    enablePresetRule,
    resetToDefaults,
    importSettings,
    exportSettings,
  };
}
