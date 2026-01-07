// =============================================================================
// TTS CONTROLLER
// =============================================================================
// Text-to-speech controller using Web Speech API.
// Placeholder for future ElevenLabs integration.

import { useEffect, useRef, useState, useCallback } from 'react';
import { Volume2, VolumeX, Mic } from 'lucide-react';
import { Select } from '../../atoms/Select';

interface TTSControllerProps {
  text: string;
  isPlaying: boolean;
  rate?: number;
  pitch?: number;
  volume?: number;
  voiceName?: string;
  onEnd?: () => void;
  onWord?: (word: string, index: number) => void;
}

/**
 * Hook for managing TTS playback
 */
export function useTTS({
  text,
  isPlaying,
  rate = 1,
  pitch = 1,
  volume = 1,
  voiceName,
  onEnd,
  onWord,
}: TTSControllerProps) {
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Check support and load voices
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setIsSupported(true);

      const loadVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices();
        setVoices(availableVoices);
      };

      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;

      return () => {
        window.speechSynthesis.onvoiceschanged = null;
      };
    }
  }, []);

  // Create utterance
  useEffect(() => {
    if (!isSupported || !text) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = volume;

    // Find voice by name
    if (voiceName && voices.length > 0) {
      const voice = voices.find((v) => v.name === voiceName);
      if (voice) utterance.voice = voice;
    }

    // Events
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      onEnd?.();
    };
    utterance.onerror = () => setIsSpeaking(false);

    // Word boundary (not supported in all browsers)
    utterance.onboundary = (event) => {
      if (event.name === 'word') {
        const word = text.slice(event.charIndex, event.charIndex + event.charLength);
        // Count words to get index
        const precedingText = text.slice(0, event.charIndex);
        const wordIndex = precedingText.split(/\s+/).filter(Boolean).length;
        onWord?.(word, wordIndex);
      }
    };

    utteranceRef.current = utterance;

    return () => {
      window.speechSynthesis.cancel();
    };
  }, [text, rate, pitch, volume, voiceName, voices, isSupported, onEnd, onWord]);

  // Play/pause control
  useEffect(() => {
    if (!isSupported || !utteranceRef.current) return;

    if (isPlaying && !isSpeaking) {
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utteranceRef.current);
    } else if (!isPlaying && isSpeaking) {
      window.speechSynthesis.pause();
    }
  }, [isPlaying, isSpeaking, isSupported]);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  const resume = useCallback(() => {
    window.speechSynthesis.resume();
  }, []);

  const pause = useCallback(() => {
    window.speechSynthesis.pause();
  }, []);

  return {
    isSpeaking,
    isSupported,
    voices,
    stop,
    resume,
    pause,
  };
}

/**
 * TTS toggle button component
 */
interface TTSToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  className?: string;
}

export function TTSToggle({ enabled, onChange, className = '' }: TTSToggleProps) {
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported('speechSynthesis' in window);
  }, []);

  if (!isSupported) return null;

  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${enabled
        ? 'bg-[var(--color-accent)] text-white'
        : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
        } ${className}`}
      title={enabled ? 'Disable narration' : 'Enable narration'}
    >
      {enabled ? (
        <Volume2 className="w-4 h-4" />
      ) : (
        <VolumeX className="w-4 h-4" />
      )}
      <span className="text-sm">Narration</span>
    </button>
  );
}

/**
 * Voice selector component
 */
interface VoiceSelectorProps {
  selectedVoice: string;
  onChange: (voiceName: string) => void;
  className?: string;
}

export function VoiceSelector({ selectedVoice, onChange, className = '' }: VoiceSelectorProps) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if ('speechSynthesis' in window) {
      const loadVoices = () => {
        const available = window.speechSynthesis.getVoices();
        // Filter to English voices
        const englishVoices = available.filter((v) =>
          v.lang.startsWith('en')
        );
        setVoices(englishVoices);
      };

      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;

      return () => {
        window.speechSynthesis.onvoiceschanged = null;
      };
    }
  }, []);

  if (voices.length === 0) return null;

  return (
    <div className={className}>
      <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-2">
        <Mic className="w-3 h-3 inline mr-1" />
        Voice
      </label>
      <Select
        value={selectedVoice}
        onChange={(val) => onChange(val)}
        options={voices.map((voice) => ({
          value: voice.name,
          label: `${voice.name} (${voice.lang})`
        }))}
        triggerClassName="w-full"
      />
    </div>
  );
}

// Placeholder for ElevenLabs integration
export interface ElevenLabsConfig {
  apiKey: string;
  voiceId: string;
  modelId?: string;
}

export function useElevenLabsTTS(config: ElevenLabsConfig | null) {
  // TODO: Implement ElevenLabs TTS
  // This would use the ElevenLabs streaming API
  // For now, fall back to Web Speech API

  return {
    isAvailable: false,
    synthesize: async (_text: string) => {
      console.warn('ElevenLabs TTS not implemented yet');
      return null;
    },
  };
}

export default {
  useTTS,
  TTSToggle,
  VoiceSelector,
};
