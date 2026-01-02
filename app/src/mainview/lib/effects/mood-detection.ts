// =============================================================================
// MOOD DETECTION ENGINE
// =============================================================================
// Multi-signal analysis to detect conversation mood from text.
// Combines keyword matching, punctuation patterns, emoji analysis, and optionally LLM.

import type { Mood, MoodSignal, MoodState, MoodTheme } from '../../types/effects';
import { DEFAULT_MOOD_THEMES } from '../../types/effects';

// -----------------------------------------------------------------------------
// KEYWORD DICTIONARIES
// -----------------------------------------------------------------------------

const MOOD_KEYWORDS: Record<Mood, string[]> = {
  heated: [
    'angry', 'furious', 'pissed', 'annoyed', 'frustrated', 'hate', 'stupid',
    'ridiculous', 'bullshit', 'damn', 'hell', 'fuck', 'shit', 'rage', 'mad',
    'unacceptable', 'outrageous', 'disgusting', 'terrible', 'worst', 'ugh',
    'argue', 'fight', 'attack', 'disagree', 'wrong', 'idiot',
  ],
  romantic: [
    'love', 'heart', 'kiss', 'darling', 'beautiful', 'desire', 'blush',
    'tender', 'passion', 'embrace', 'adore', 'cherish', 'sweetheart', 'honey',
    'romantic', 'intimate', 'sensual', 'longing', 'yearning', 'affection',
    'beloved', 'soulmate', 'forever', 'devotion', 'caress', 'gentle',
  ],
  melancholy: [
    'sad', 'tears', 'cry', 'miss', 'gone', 'lonely', 'sigh', 'remember',
    'lost', 'grief', 'sorrow', 'regret', 'mourn', 'ache', 'empty', 'hollow',
    'melancholy', 'nostalgia', 'wistful', 'bittersweet', 'fading', 'farewell',
    'goodbye', 'ending', 'memories', 'forgotten', 'silence', 'alone',
  ],
  excited: [
    'amazing', 'awesome', 'incredible', 'fantastic', 'wonderful', 'excited',
    'omg', 'wow', 'yes', 'yay', 'woohoo', 'brilliant', 'perfect', 'love it',
    'can\'t wait', 'thrilled', 'pumped', 'hyped', 'stoked', 'ecstatic',
    'finally', 'celebration', 'victory', 'winning', 'success', 'breakthrough',
  ],
  mysterious: [
    'shadow', 'secret', 'whisper', 'hidden', 'darkness', 'unknown', 'ancient',
    'mysterious', 'enigma', 'cryptic', 'forbidden', 'occult', 'ritual',
    'prophecy', 'omen', 'haunted', 'ethereal', 'void', 'abyss', 'realm',
    'arcane', 'eldritch', 'veil', 'beyond', 'unseen', 'lurking',
  ],
  playful: [
    'haha', 'lol', 'lmao', 'rofl', 'silly', 'oops', 'tease', 'wink', 'prank',
    'joke', 'funny', 'hilarious', 'goofy', 'giggles', 'mischief', 'playful',
    'kidding', 'jest', 'banter', 'fun', 'game', 'play', 'cheeky', 'witty',
  ],
  tense: [
    'worried', 'anxious', 'nervous', 'scared', 'fear', 'dread', 'danger',
    'threat', 'warning', 'careful', 'watch out', 'urgent', 'critical',
    'serious', 'grave', 'stakes', 'risk', 'uncertain', 'uneasy', 'suspense',
    'waiting', 'edge', 'tension', 'pressure', 'stress',
  ],
  serene: [
    'calm', 'peaceful', 'tranquil', 'serene', 'quiet', 'gentle', 'soft',
    'relaxed', 'zen', 'meditate', 'breathe', 'still', 'harmony', 'balance',
    'flow', 'nature', 'ocean', 'forest', 'sunset', 'dawn', 'rest', 'ease',
    'content', 'soothing', 'comfort',
  ],
  creative: [
    'create', 'imagine', 'idea', 'design', 'art', 'build', 'craft', 'invent',
    'inspire', 'vision', 'dream', 'explore', 'discover', 'experiment',
    'innovative', 'original', 'unique', 'creative', 'brainstorm', 'concept',
    'prototype', 'sketch', 'compose', 'write', 'make',
  ],
  neutral: [], // No specific keywords - default fallback
};

// Emoji patterns that suggest mood
const MOOD_EMOJIS: Record<Mood, string[]> = {
  heated: ['😠', '😡', '🤬', '💢', '👿', '🔥', '💥', '⚡'],
  romantic: ['❤️', '💕', '💖', '💗', '💓', '💘', '💝', '😍', '🥰', '💋', '🌹', '💑'],
  melancholy: ['😢', '😭', '😞', '😔', '💔', '🥺', '😿', '🌧️', '🍂', '🥀'],
  excited: ['🎉', '🎊', '🥳', '✨', '🌟', '⭐', '🔥', '💯', '🙌', '👏', '🤩', '😆'],
  mysterious: ['🌙', '🔮', '👁️', '🦇', '🌑', '🕯️', '🗝️', '📜', '🧙', '✨'],
  playful: ['😂', '🤣', '😜', '😝', '🤪', '😏', '😋', '🙃', '🤭', '😸', '🎮', '🎪'],
  tense: ['😰', '😨', '😱', '😬', '🫣', '⚠️', '🚨', '⏰', '💀', '🫠'],
  serene: ['😌', '🧘', '🌸', '🌺', '🌊', '🌅', '🌄', '☁️', '🕊️', '🍃', '🌿'],
  creative: ['🎨', '🖌️', '✏️', '💡', '🧠', '🎭', '🎬', '📝', '🏗️', '⚙️', '🔧'],
  neutral: [],
};

// -----------------------------------------------------------------------------
// SIGNAL DETECTION FUNCTIONS
// -----------------------------------------------------------------------------

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Detect mood signals from keyword presence
 */
export function detectKeywordSignals(text: string): MoodSignal[] {
  const lower = text.toLowerCase();
  const signals: MoodSignal[] = [];

  for (const [mood, keywords] of Object.entries(MOOD_KEYWORDS) as [Mood, string[]][]) {
    if (mood === 'neutral') continue;

    for (const keyword of keywords) {
      // Word boundary matching for better accuracy
      const regex = new RegExp(`\\b${escapeRegex(keyword)}\\b`, 'gi');
      const matches = lower.match(regex);

      if (matches) {
        signals.push({
          mood,
          weight: 1.5 * matches.length,
          source: 'keyword',
        });
      }
    }
  }

  return signals;
}

/**
 * Detect mood signals from punctuation patterns
 */
export function detectPunctuationSignals(text: string): MoodSignal[] {
  const signals: MoodSignal[] = [];
  const length = text.length || 1;

  // Exclamation density
  const exclamations = (text.match(/!/g) || []).length;
  const exclamationDensity = exclamations / length;

  if (exclamationDensity > 0.03) {
    signals.push({ mood: 'heated', weight: 2.5, source: 'punctuation' });
    signals.push({ mood: 'excited', weight: 2, source: 'punctuation' });
  } else if (exclamationDensity > 0.015) {
    signals.push({ mood: 'excited', weight: 1.5, source: 'punctuation' });
  }

  // Multiple exclamations in sequence
  const multiExclaim = (text.match(/!{2,}/g) || []).length;
  if (multiExclaim > 0) {
    signals.push({ mood: 'excited', weight: multiExclaim * 1.5, source: 'punctuation' });
  }

  // Ellipsis patterns (... or more)
  const ellipsis = (text.match(/\.{3,}/g) || []).length;
  if (ellipsis > 2) {
    signals.push({ mood: 'melancholy', weight: 2, source: 'punctuation' });
    signals.push({ mood: 'mysterious', weight: 1.5, source: 'punctuation' });
  } else if (ellipsis > 0) {
    signals.push({ mood: 'mysterious', weight: 1, source: 'punctuation' });
  }

  // Question density (curiosity, tension)
  const questions = (text.match(/\?/g) || []).length;
  const questionDensity = questions / length;

  if (questionDensity > 0.02) {
    signals.push({ mood: 'tense', weight: 1.5, source: 'punctuation' });
  }

  // ALL CAPS detection (shouting)
  const capsWords = (text.match(/\b[A-Z]{3,}\b/g) || []).length;
  if (capsWords > 2) {
    signals.push({ mood: 'heated', weight: capsWords * 0.8, source: 'punctuation' });
    signals.push({ mood: 'excited', weight: capsWords * 0.5, source: 'punctuation' });
  }

  return signals;
}

/**
 * Detect mood signals from emoji usage
 */
export function detectEmojiSignals(text: string): MoodSignal[] {
  const signals: MoodSignal[] = [];

  for (const [mood, emojis] of Object.entries(MOOD_EMOJIS) as [Mood, string[]][]) {
    if (mood === 'neutral') continue;

    for (const emoji of emojis) {
      const count = (text.split(emoji).length - 1);
      if (count > 0) {
        signals.push({
          mood,
          weight: 2 * count, // Emojis are strong signals
          source: 'emoji',
        });
      }
    }
  }

  return signals;
}

/**
 * Aggregate signals and determine dominant mood
 */
export function aggregateSignals(signals: MoodSignal[]): { mood: Mood; confidence: number } {
  if (signals.length === 0) {
    return { mood: 'neutral', confidence: 0 };
  }

  // Sum weights by mood
  const scores: Record<Mood, number> = {
    neutral: 0,
    heated: 0,
    romantic: 0,
    melancholy: 0,
    excited: 0,
    mysterious: 0,
    playful: 0,
    tense: 0,
    serene: 0,
    creative: 0,
  };

  for (const signal of signals) {
    scores[signal.mood] += signal.weight;
  }

  // Find dominant mood
  let maxMood: Mood = 'neutral';
  let maxScore = 0;
  let totalScore = 0;

  for (const [mood, score] of Object.entries(scores) as [Mood, number][]) {
    totalScore += score;
    if (score > maxScore) {
      maxScore = score;
      maxMood = mood;
    }
  }

  // Confidence is how dominant the top mood is vs total
  // Normalized to 0-1 range, with diminishing returns
  const confidence = totalScore > 0
    ? Math.min(1, (maxScore / totalScore) * Math.min(1, totalScore / 10))
    : 0;

  return { mood: maxMood, confidence };
}

// -----------------------------------------------------------------------------
// MAIN DETECTION FUNCTION
// -----------------------------------------------------------------------------

export interface MoodDetectionOptions {
  /** How many recent messages to analyze */
  messageWindow?: number;
  /** Minimum confidence to report (below this returns neutral) */
  confidenceThreshold?: number;
}

/**
 * Analyze text content and detect mood
 */
export function detectMood(
  texts: string[],
  options: MoodDetectionOptions = {}
): { mood: Mood; confidence: number; signals: MoodSignal[] } {
  const { messageWindow = 5, confidenceThreshold = 0.2 } = options;

  // Take recent messages only
  const recentTexts = texts.slice(-messageWindow);
  const combinedText = recentTexts.join(' ');

  // Gather all signals
  const signals: MoodSignal[] = [
    ...detectKeywordSignals(combinedText),
    ...detectPunctuationSignals(combinedText),
    ...detectEmojiSignals(combinedText),
  ];

  const { mood, confidence } = aggregateSignals(signals);

  // Return neutral if confidence is too low
  if (confidence < confidenceThreshold) {
    return { mood: 'neutral', confidence: 0, signals };
  }

  return { mood, confidence, signals };
}

// -----------------------------------------------------------------------------
// THEME INTERPOLATION
// -----------------------------------------------------------------------------

/**
 * Interpolate between two colors (hex format)
 */
function lerpColor(color1: string, color2: string, t: number): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);

  if (!c1 || !c2) return color1;

  const r = Math.round(c1.r + (c2.r - c1.r) * t);
  const g = Math.round(c1.g + (c2.g - c1.g) * t);
  const b = Math.round(c1.b + (c2.b - c1.b) * t);

  return rgbToHex(r, g, b);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  // Handle rgba format
  if (hex.startsWith('rgba')) {
    const match = hex.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
      return { r: parseInt(match[1]), g: parseInt(match[2]), b: parseInt(match[3]) };
    }
    return null;
  }

  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

/**
 * Smoothly transition between two mood themes
 */
export function interpolateThemes(
  from: MoodTheme,
  to: MoodTheme,
  progress: number // 0-1
): MoodTheme {
  const t = Math.max(0, Math.min(1, progress));

  return {
    gradient: [
      lerpColor(from.gradient[0], to.gradient[0], t),
      lerpColor(from.gradient[1], to.gradient[1], t),
      from.gradient[2] && to.gradient[2]
        ? lerpColor(from.gradient[2], to.gradient[2], t)
        : to.gradient[2],
    ] as [string, string, string?],
    accent: lerpColor(from.accent, to.accent, t),
    glow: t > 0.5 ? to.glow : from.glow, // Snap glow at midpoint
    textTint: t > 0.5 ? to.textTint : from.textTint,
    animationSpeed: t > 0.5 ? to.animationSpeed : from.animationSpeed,
    particleEffect: t > 0.7 ? to.particleEffect : from.particleEffect,
    bgAnimation: t > 0.5 ? to.bgAnimation : from.bgAnimation,
  };
}

// -----------------------------------------------------------------------------
// STATE MANAGEMENT HELPERS
// -----------------------------------------------------------------------------

/**
 * Create initial mood state
 */
export function createInitialMoodState(): MoodState {
  return {
    current: 'neutral',
    confidence: 0,
    theme: DEFAULT_MOOD_THEMES.neutral,
    signals: [],
    lastChange: Date.now(),
  };
}

/**
 * Update mood state based on new detection
 */
export function updateMoodState(
  currentState: MoodState,
  detection: { mood: Mood; confidence: number; signals: MoodSignal[] },
  themeOverrides: Partial<Record<Mood, Partial<MoodTheme>>> = {}
): MoodState {
  const { mood, confidence, signals } = detection;

  // Only change mood if confidence is higher or same mood strengthens
  const shouldChange =
    mood !== currentState.current &&
    confidence > currentState.confidence * 0.8; // Allow change if new mood is reasonably confident

  if (!shouldChange && mood !== currentState.current) {
    // Keep current mood but update signals
    return {
      ...currentState,
      signals,
    };
  }

  // Get base theme and apply overrides
  const baseTheme = DEFAULT_MOOD_THEMES[mood];
  const overrides = themeOverrides[mood] || {};
  const theme: MoodTheme = { ...baseTheme, ...overrides };

  return {
    current: mood,
    confidence,
    theme,
    signals,
    lastChange: Date.now(),
  };
}
