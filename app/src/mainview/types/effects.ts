// =============================================================================
// EFFECTS SYSTEM TYPES
// =============================================================================
// Modular system for text transformations, word effects, and ambient mood theming.
// Users can enable/disable any layer independently.

// -----------------------------------------------------------------------------
// TEXT RULES - Word-level transformations
// -----------------------------------------------------------------------------

export type TextRuleAction = 'animate' | 'replace' | 'style' | 'wrap';

export interface TextRule {
  id: string;
  /** Pattern to match - string for exact match, regex pattern string for complex matching */
  match: string;
  /** Whether match is a regex pattern */
  isRegex?: boolean;
  /** Case sensitive matching (default: false) */
  caseSensitive?: boolean;
  /** What to do when matched */
  action: TextRuleAction;
  /** Replacement text or emoji (for 'replace' action) */
  replacement?: string;
  /** CSS class name to apply (for 'animate', 'style', 'wrap' actions) */
  className?: string;
  /** Inline styles (for 'style' action) */
  style?: React.CSSProperties;
  /** Whether this rule is enabled */
  enabled: boolean;
  /** User-defined name for the rule */
  name?: string;
}

// Built-in animation class names users can reference
export type BuiltInTextAnimation =
  | 'effect-shake'
  | 'effect-bounce'
  | 'effect-wiggle'
  | 'effect-pulse'
  | 'effect-glow'
  | 'effect-rainbow'
  | 'effect-glitch'
  | 'effect-wave'
  | 'effect-sparkle'
  | 'effect-fade-in'
  | 'effect-typewriter'
  | 'effect-neon'
  | 'effect-blur-in'
  | 'effect-pop';

// -----------------------------------------------------------------------------
// MOOD SYSTEM - Ambient theming based on conversation tone
// -----------------------------------------------------------------------------

export type Mood =
  | 'neutral'
  | 'heated'
  | 'romantic'
  | 'melancholy'
  | 'excited'
  | 'mysterious'
  | 'playful'
  | 'tense'
  | 'serene'
  | 'creative';

export interface MoodTheme {
  /** Primary background gradient colors */
  gradient: [string, string, string?];
  /** Accent color for UI elements */
  accent: string;
  /** Glow/shadow color */
  glow: string;
  /** Text color adjustments (optional) */
  textTint?: string;
  /** Animation speed modifier */
  animationSpeed: 'slower' | 'slow' | 'normal' | 'fast' | 'faster';
  /** Optional particle effect */
  particleEffect?: ParticleEffect;
  /** Background animation type */
  bgAnimation?: 'none' | 'drift' | 'pulse' | 'wave' | 'aurora';
}

export type ParticleEffect =
  | 'none'
  | 'sparks'
  | 'hearts'
  | 'rain'
  | 'snow'
  | 'stars'
  | 'fire'
  | 'bubbles'
  | 'confetti'
  | 'fireflies'
  | 'leaves';

export interface MoodSignal {
  mood: Mood;
  weight: number;
  source: 'keyword' | 'punctuation' | 'emoji' | 'llm' | 'manual';
}

export interface MoodState {
  current: Mood;
  confidence: number;
  /** Smoothed/interpolated theme values for transitions */
  theme: MoodTheme;
  /** Raw signals that contributed to current mood */
  signals: MoodSignal[];
  /** Timestamp of last mood change */
  lastChange: number;
}

// -----------------------------------------------------------------------------
// EFFECT LAYERS - What can be affected
// -----------------------------------------------------------------------------

export interface EffectLayers {
  /** Background gradient and ambient effects */
  background: boolean;
  /** Floating orbs/blobs that drift */
  ambientOrbs: boolean;
  /** Particle effects overlay */
  particles: boolean;
  /** Message bubble styling (borders, shadows, etc) */
  messageBubbles: boolean;
  /** Input area styling */
  inputArea: boolean;
  /** Scrollbar theming */
  scrollbars: boolean;
  /** Text color tinting */
  textTint: boolean;
  /** Word-level text rules/animations */
  textRules: boolean;
  /** Accent color shifting */
  accentColors: boolean;
}

// -----------------------------------------------------------------------------
// EFFECTS SETTINGS - User configuration
// -----------------------------------------------------------------------------

export interface EffectsSettings {
  /** Master enable/disable for entire effects system */
  enabled: boolean;

  /** Which effect layers are active */
  layers: EffectLayers;

  /** Global intensity multiplier (0-1, affects all animations/effects) */
  intensity: number;

  /** Transition duration between mood changes (ms) */
  moodTransitionDuration: number;

  /** Minimum confidence threshold to trigger mood change (0-1) */
  moodConfidenceThreshold: number;

  /** How many recent messages to analyze for mood */
  moodAnalysisWindow: number;

  /** Use LLM for mood detection (more accurate but costs tokens) */
  useLLMMoodDetection: boolean;

  /** User-defined text transformation rules */
  textRules: TextRule[];

  /** Custom mood theme overrides */
  moodThemeOverrides: Partial<Record<Mood, Partial<MoodTheme>>>;

  /** Respect prefers-reduced-motion */
  respectReducedMotion: boolean;

  /** Manual mood override (null = auto-detect) */
  manualMood: Mood | null;
}

// -----------------------------------------------------------------------------
// DEFAULT VALUES
// -----------------------------------------------------------------------------

export const DEFAULT_MOOD_THEMES: Record<Mood, MoodTheme> = {
  neutral: {
    gradient: ['#1a1a2e', '#16213e', '#1a1a2e'],
    accent: '#7c8aff',
    glow: 'transparent',
    animationSpeed: 'normal',
    bgAnimation: 'none',
  },
  heated: {
    gradient: ['#2d1f1f', '#4a1f1f', '#2d1a1a'],
    accent: '#ff4757',
    glow: 'rgba(255, 71, 87, 0.25)',
    animationSpeed: 'fast',
    particleEffect: 'sparks',
    bgAnimation: 'pulse',
  },
  romantic: {
    gradient: ['#2d1f2d', '#1f1a2a', '#2a1f2f'],
    accent: '#ff6b9d',
    glow: 'rgba(255, 107, 157, 0.2)',
    animationSpeed: 'slow',
    particleEffect: 'hearts',
    bgAnimation: 'drift',
  },
  melancholy: {
    gradient: ['#1a1a2e', '#0f1419', '#1a1f2e'],
    accent: '#5f7a9e',
    glow: 'rgba(95, 122, 158, 0.15)',
    textTint: 'rgba(150, 170, 200, 0.1)',
    animationSpeed: 'slower',
    particleEffect: 'rain',
    bgAnimation: 'drift',
  },
  excited: {
    gradient: ['#1f2d1f', '#2a2f1a', '#1f2d2a'],
    accent: '#ffd93d',
    glow: 'rgba(255, 217, 61, 0.2)',
    animationSpeed: 'faster',
    particleEffect: 'confetti',
    bgAnimation: 'pulse',
  },
  mysterious: {
    gradient: ['#0f0f1a', '#1a1a2e', '#0f1a1f'],
    accent: '#9d4edd',
    glow: 'rgba(157, 78, 221, 0.2)',
    animationSpeed: 'slow',
    particleEffect: 'fireflies',
    bgAnimation: 'aurora',
  },
  playful: {
    gradient: ['#1f2a2d', '#2a1f2d', '#1f2d2a'],
    accent: '#ff9f43',
    glow: 'rgba(255, 159, 67, 0.2)',
    animationSpeed: 'fast',
    particleEffect: 'bubbles',
    bgAnimation: 'wave',
  },
  tense: {
    gradient: ['#1a1a1a', '#2d1f1f', '#1a1a2d'],
    accent: '#c0392b',
    glow: 'rgba(192, 57, 43, 0.15)',
    animationSpeed: 'normal',
    bgAnimation: 'pulse',
  },
  serene: {
    gradient: ['#1a2d2d', '#1f2a2f', '#1a2a2d'],
    accent: '#48dbfb',
    glow: 'rgba(72, 219, 251, 0.15)',
    animationSpeed: 'slower',
    particleEffect: 'fireflies',
    bgAnimation: 'drift',
  },
  creative: {
    gradient: ['#2d1f2a', '#1f2a2d', '#2a2d1f'],
    accent: '#a29bfe',
    glow: 'rgba(162, 155, 254, 0.2)',
    animationSpeed: 'normal',
    particleEffect: 'stars',
    bgAnimation: 'aurora',
  },
};

export const DEFAULT_EFFECT_LAYERS: EffectLayers = {
  background: true,
  ambientOrbs: true,
  particles: false, // Off by default - can be intensive
  messageBubbles: true,
  inputArea: true,
  scrollbars: false,
  textTint: false,
  textRules: true,
  accentColors: true,
};

export const DEFAULT_EFFECTS_SETTINGS: EffectsSettings = {
  enabled: true,
  layers: DEFAULT_EFFECT_LAYERS,
  intensity: 0.7, // 70% - not too overwhelming
  moodTransitionDuration: 2000,
  moodConfidenceThreshold: 0.35,
  moodAnalysisWindow: 5,
  useLLMMoodDetection: false,
  textRules: [],
  moodThemeOverrides: {},
  respectReducedMotion: true,
  manualMood: null,
};

// -----------------------------------------------------------------------------
// PRESET TEXT RULES - Fun defaults users can enable
// -----------------------------------------------------------------------------

export const PRESET_TEXT_RULES: TextRule[] = [
  {
    id: 'shake-expletives',
    name: 'Shake expletives',
    match: '(shit|damn|fuck|hell)',
    isRegex: true,
    caseSensitive: false,
    action: 'animate',
    className: 'effect-shake',
    enabled: false,
  },
  {
    id: 'heart-love',
    name: 'Hearts for love',
    match: 'love',
    caseSensitive: false,
    action: 'replace',
    replacement: '💕',
    enabled: false,
  },
  {
    id: 'rainbow-magic',
    name: 'Rainbow magic',
    match: 'magic',
    caseSensitive: false,
    action: 'animate',
    className: 'effect-rainbow',
    enabled: false,
  },
  {
    id: 'glow-important',
    name: 'Glow important',
    match: 'important',
    caseSensitive: false,
    action: 'animate',
    className: 'effect-glow',
    enabled: false,
  },
  {
    id: 'sparkle-amazing',
    name: 'Sparkle amazing words',
    match: '(amazing|awesome|incredible|wonderful)',
    isRegex: true,
    caseSensitive: false,
    action: 'animate',
    className: 'effect-sparkle',
    enabled: false,
  },
  {
    id: 'glitch-error',
    name: 'Glitch errors',
    match: '(error|bug|crash|fail)',
    isRegex: true,
    caseSensitive: false,
    action: 'animate',
    className: 'effect-glitch',
    enabled: false,
  },
  {
    id: 'bounce-wow',
    name: 'Bounce wow',
    match: '(wow|omg|whoa)',
    isRegex: true,
    caseSensitive: false,
    action: 'animate',
    className: 'effect-bounce',
    enabled: false,
  },
  {
    id: 'neon-code',
    name: 'Neon code terms',
    match: '(function|const|return|async|await)',
    isRegex: true,
    caseSensitive: true,
    action: 'animate',
    className: 'effect-neon',
    enabled: false,
  },
];
