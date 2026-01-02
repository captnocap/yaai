import { useState, useEffect, useCallback } from 'react';
import type { CodeSettings } from '../types/code-settings';
import { DEFAULT_CODE_SETTINGS } from '../types/code-settings';

const STORAGE_KEY = 'yaai-code-settings';

/**
 * Hook for managing Code tab quick settings with localStorage persistence
 */
export function useCodeSettings() {
  const [settings, setSettings] = useState<CodeSettings>(() => {
    // Try to load from localStorage on init
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          return { ...DEFAULT_CODE_SETTINGS, ...JSON.parse(stored) };
        }
      } catch (e) {
        console.warn('Failed to load code settings:', e);
      }
    }
    return DEFAULT_CODE_SETTINGS;
  });

  // Persist to localStorage when settings change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      console.warn('Failed to save code settings:', e);
    }
  }, [settings]);

  // Update a single setting
  const updateSetting = useCallback(<K extends keyof CodeSettings>(
    key: K,
    value: CodeSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  // Toggle a boolean setting
  const toggleSetting = useCallback((key: keyof CodeSettings) => {
    setSettings(prev => {
      const currentValue = prev[key];
      if (typeof currentValue === 'boolean') {
        return { ...prev, [key]: !currentValue };
      }
      return prev;
    });
  }, []);

  // Reset to defaults
  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_CODE_SETTINGS);
  }, []);

  // Play notification sound
  const playSound = useCallback((type: 'complete' | 'prompt') => {
    if (type === 'complete' && !settings.soundOnComplete) return;
    if (type === 'prompt' && !settings.soundOnPrompt) return;

    // Create a simple beep sound using Web Audio API
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Different tones for different events
      oscillator.frequency.value = type === 'complete' ? 800 : 600;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (e) {
      // Audio not supported or blocked
    }
  }, [settings.soundOnComplete, settings.soundOnPrompt]);

  return {
    settings,
    updateSetting,
    toggleSetting,
    resetSettings,
    playSound,
  };
}
