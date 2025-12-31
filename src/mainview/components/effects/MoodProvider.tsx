// =============================================================================
// MOOD PROVIDER
// =============================================================================
// React context for mood detection and theme state management.
// Analyzes conversation content and provides ambient theming to children.

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from 'react';
import type {
  Mood,
  MoodState,
  MoodTheme,
  EffectsSettings,
  EffectLayers,
  TextRule,
} from '../../types/effects';
import {
  DEFAULT_MOOD_THEMES,
  DEFAULT_EFFECTS_SETTINGS,
} from '../../types/effects';
import {
  detectMood,
  createInitialMoodState,
  updateMoodState,
  interpolateThemes,
} from '../../lib/effects/mood-detection';

// -----------------------------------------------------------------------------
// CONTEXT TYPES
// -----------------------------------------------------------------------------

export interface MoodContextValue {
  /** Current mood state */
  moodState: MoodState;
  /** Current effective theme (may be interpolating) */
  theme: MoodTheme;
  /** Effects settings */
  settings: EffectsSettings;
  /** Check if a specific layer is enabled */
  isLayerEnabled: (layer: keyof EffectLayers) => boolean;
  /** Manually set mood (overrides auto-detection) */
  setManualMood: (mood: Mood | null) => void;
  /** Update settings */
  updateSettings: (updates: Partial<EffectsSettings>) => void;
  /** Toggle a specific layer */
  toggleLayer: (layer: keyof EffectLayers, enabled?: boolean) => void;
  /** Add or update a text rule */
  setTextRule: (rule: TextRule) => void;
  /** Remove a text rule */
  removeTextRule: (ruleId: string) => void;
  /** Get active text rules */
  textRules: TextRule[];
}

const MoodContext = createContext<MoodContextValue | null>(null);

// -----------------------------------------------------------------------------
// PROVIDER COMPONENT
// -----------------------------------------------------------------------------

export interface MoodProviderProps {
  children: React.ReactNode;
  /** Messages to analyze for mood detection */
  messages?: Array<{ content: string; role: string }>;
  /** Initial settings override */
  initialSettings?: Partial<EffectsSettings>;
  /** Callback when mood changes */
  onMoodChange?: (mood: Mood, confidence: number) => void;
}

export function MoodProvider({
  children,
  messages = [],
  initialSettings,
  onMoodChange,
}: MoodProviderProps) {
  // Settings state
  const [settings, setSettings] = useState<EffectsSettings>(() => ({
    ...DEFAULT_EFFECTS_SETTINGS,
    ...initialSettings,
  }));

  // Mood state
  const [moodState, setMoodState] = useState<MoodState>(createInitialMoodState);

  // Interpolation state for smooth transitions
  const [displayedTheme, setDisplayedTheme] = useState<MoodTheme>(
    DEFAULT_MOOD_THEMES.neutral
  );
  const transitionRef = useRef<number | null>(null);
  const previousThemeRef = useRef<MoodTheme>(DEFAULT_MOOD_THEMES.neutral);

  // Extract text content from messages
  const messageTexts = useMemo(
    () => messages.map((m) => m.content),
    [messages]
  );

  // Detect mood from messages
  useEffect(() => {
    if (!settings.enabled) return;

    // Use manual mood if set
    if (settings.manualMood) {
      const manualTheme = {
        ...DEFAULT_MOOD_THEMES[settings.manualMood],
        ...settings.moodThemeOverrides[settings.manualMood],
      };
      setMoodState({
        current: settings.manualMood,
        confidence: 1,
        theme: manualTheme,
        signals: [{ mood: settings.manualMood, weight: 10, source: 'manual' }],
        lastChange: Date.now(),
      });
      return;
    }

    // Auto-detect mood
    const detection = detectMood(messageTexts, {
      messageWindow: settings.moodAnalysisWindow,
      confidenceThreshold: settings.moodConfidenceThreshold,
    });

    setMoodState((current) => {
      const updated = updateMoodState(
        current,
        detection,
        settings.moodThemeOverrides
      );

      // Notify if mood changed
      if (updated.current !== current.current && onMoodChange) {
        onMoodChange(updated.current, updated.confidence);
      }

      return updated;
    });
  }, [
    messageTexts,
    settings.enabled,
    settings.manualMood,
    settings.moodAnalysisWindow,
    settings.moodConfidenceThreshold,
    settings.moodThemeOverrides,
    onMoodChange,
  ]);

  // Smooth theme transitions - use mood name as stable reference
  const currentMoodRef = useRef<Mood | null>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (!settings.enabled) {
      setDisplayedTheme(DEFAULT_MOOD_THEMES.neutral);
      return;
    }

    // On first render, just set the theme directly (no animation)
    if (isFirstRender.current) {
      isFirstRender.current = false;
      currentMoodRef.current = moodState.current;
      setDisplayedTheme(moodState.theme);
      previousThemeRef.current = moodState.theme;
      return;
    }

    // Only animate if the mood actually changed
    if (currentMoodRef.current === moodState.current) {
      return;
    }
    currentMoodRef.current = moodState.current;

    const targetTheme = moodState.theme;
    const startTheme = previousThemeRef.current;
    const duration = settings.moodTransitionDuration;
    const startTime = performance.now();

    // Cancel any existing transition
    if (transitionRef.current) {
      cancelAnimationFrame(transitionRef.current);
    }

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out cubic for smooth deceleration
      const eased = 1 - Math.pow(1 - progress, 3);

      const interpolated = interpolateThemes(startTheme, targetTheme, eased);
      setDisplayedTheme(interpolated);

      if (progress < 1) {
        transitionRef.current = requestAnimationFrame(animate);
      } else {
        previousThemeRef.current = targetTheme;
        transitionRef.current = null;
      }
    };

    transitionRef.current = requestAnimationFrame(animate);

    return () => {
      if (transitionRef.current) {
        cancelAnimationFrame(transitionRef.current);
      }
    };
  }, [moodState.current, moodState.theme, settings.enabled, settings.moodTransitionDuration]);

  // Apply CSS variables when theme changes
  useEffect(() => {
    if (!settings.enabled) return;

    const root = document.documentElement;
    root.style.setProperty('--mood-bg-1', displayedTheme.gradient[0]);
    root.style.setProperty('--mood-bg-2', displayedTheme.gradient[1]);
    root.style.setProperty('--mood-bg-3', displayedTheme.gradient[2] || displayedTheme.gradient[0]);
    root.style.setProperty('--mood-accent', displayedTheme.accent);
    root.style.setProperty('--mood-glow', displayedTheme.glow);
    root.style.setProperty('--mood-text-tint', displayedTheme.textTint || 'transparent');
    root.style.setProperty('--effects-intensity', String(settings.intensity));
    root.style.setProperty('--effects-transition', `${settings.moodTransitionDuration}ms`);

    // Animation speed multiplier
    const speedMap = { slower: 0.5, slow: 0.75, normal: 1, fast: 1.5, faster: 2 };
    root.style.setProperty(
      '--mood-animation-speed',
      String(speedMap[displayedTheme.animationSpeed])
    );
  }, [displayedTheme, settings.enabled, settings.intensity, settings.moodTransitionDuration]);

  // Context methods
  const isLayerEnabled = useCallback(
    (layer: keyof EffectLayers) => settings.enabled && settings.layers[layer],
    [settings.enabled, settings.layers]
  );

  const setManualMood = useCallback((mood: Mood | null) => {
    setSettings((s) => ({ ...s, manualMood: mood }));
  }, []);

  const updateSettings = useCallback((updates: Partial<EffectsSettings>) => {
    setSettings((s) => ({ ...s, ...updates }));
  }, []);

  const toggleLayer = useCallback((layer: keyof EffectLayers, enabled?: boolean) => {
    setSettings((s) => ({
      ...s,
      layers: {
        ...s.layers,
        [layer]: enabled ?? !s.layers[layer],
      },
    }));
  }, []);

  const setTextRule = useCallback((rule: TextRule) => {
    setSettings((s) => ({
      ...s,
      textRules: [
        ...s.textRules.filter((r) => r.id !== rule.id),
        rule,
      ],
    }));
  }, []);

  const removeTextRule = useCallback((ruleId: string) => {
    setSettings((s) => ({
      ...s,
      textRules: s.textRules.filter((r) => r.id !== ruleId),
    }));
  }, []);

  const value = useMemo<MoodContextValue>(
    () => ({
      moodState,
      theme: displayedTheme,
      settings,
      isLayerEnabled,
      setManualMood,
      updateSettings,
      toggleLayer,
      setTextRule,
      removeTextRule,
      textRules: settings.textRules,
    }),
    [
      moodState,
      displayedTheme,
      settings,
      isLayerEnabled,
      setManualMood,
      updateSettings,
      toggleLayer,
      setTextRule,
      removeTextRule,
    ]
  );

  return <MoodContext.Provider value={value}>{children}</MoodContext.Provider>;
}

// -----------------------------------------------------------------------------
// HOOK
// -----------------------------------------------------------------------------

export function useMood(): MoodContextValue {
  const context = useContext(MoodContext);
  if (!context) {
    throw new Error('useMood must be used within a MoodProvider');
  }
  return context;
}

/**
 * Hook to get just the current mood (lighter weight)
 */
export function useCurrentMood(): { mood: Mood; confidence: number } {
  const { moodState } = useMood();
  return { mood: moodState.current, confidence: moodState.confidence };
}

/**
 * Hook to get just the theme
 */
export function useMoodTheme(): MoodTheme {
  const { theme } = useMood();
  return theme;
}

/**
 * Hook to get text rules
 */
export function useTextRules(): TextRule[] {
  const { textRules } = useMood();
  return textRules;
}
