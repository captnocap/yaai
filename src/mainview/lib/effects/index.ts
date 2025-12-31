// =============================================================================
// EFFECTS SYSTEM - UTILITIES
// =============================================================================

// Mood Detection
export {
  detectMood,
  detectKeywordSignals,
  detectPunctuationSignals,
  detectEmojiSignals,
  aggregateSignals,
  interpolateThemes,
  createInitialMoodState,
  updateMoodState,
  type MoodDetectionOptions,
} from './mood-detection';

// Text Processing
export {
  processText,
  hasAnyMatch,
  validateRule,
  createTextRule,
  type TextSegment,
} from './text-processor';
