// =============================================================================
// EFFECTS SYSTEM - COMPONENTS
// =============================================================================

// Provider & Context
export {
  MoodProvider,
  useMood,
  useCurrentMood,
  useMoodTheme,
  useTextRules,
  type MoodProviderProps,
  type MoodContextValue,
} from './MoodProvider';

// Background & Ambient
export {
  AmbientBackground,
  MoodIndicator,
  type AmbientBackgroundProps,
  type MoodIndicatorProps,
} from './AmbientBackground';

// Text Effects
export {
  StyledText,
  WaveText,
  TypewriterText,
  GlitchText,
  type StyledTextProps,
  type WaveTextProps,
  type TypewriterTextProps,
  type GlitchTextProps,
} from './StyledText';
