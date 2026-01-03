// =============================================================================
// CINEMATIC ENGINE
// =============================================================================
// Engine for generating and playing cinematic presentations of research reports.

import type {
  Report,
  ReportSection,
  Source,
  CinematicScript,
  CinematicSegment,
  WordTiming,
} from '../../../shared/research-types';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

interface CinematicOptions {
  /** Words per minute for text reveal */
  wordsPerMinute?: number;
  /** Pause duration between segments (ms) */
  segmentPause?: number;
  /** Include section titles */
  includeTitles?: boolean;
  /** Include citations in narration */
  includeCitations?: boolean;
  /** Music/ambience track */
  musicTrack?: string;
}

interface PlaybackState {
  isPlaying: boolean;
  currentSegmentIndex: number;
  currentWordIndex: number;
  elapsedTime: number;
  totalDuration: number;
  speed: number;
}

type PlaybackCallback = (state: PlaybackState) => void;

// -----------------------------------------------------------------------------
// DEFAULT OPTIONS
// -----------------------------------------------------------------------------

const DEFAULT_OPTIONS: Required<CinematicOptions> = {
  wordsPerMinute: 150,
  segmentPause: 2000,
  includeTitles: true,
  includeCitations: false,
  musicTrack: 'ambient',
};

// -----------------------------------------------------------------------------
// SCRIPT GENERATOR
// -----------------------------------------------------------------------------

/**
 * Generate a cinematic script from a research report
 */
export function generateCinematicScript(
  report: Report,
  sources: Source[],
  options: CinematicOptions = {}
): CinematicScript {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const segments: CinematicSegment[] = [];
  let totalDuration = 0;

  // Opening segment - title
  const titleSegment = createTitleSegment(report.title, opts);
  segments.push(titleSegment);
  totalDuration += titleSegment.duration;

  // Summary segment
  if (report.summary) {
    const summarySegment = createTextSegment(
      'summary',
      'Overview',
      report.summary,
      opts
    );
    segments.push(summarySegment);
    totalDuration += summarySegment.duration + opts.segmentPause;
  }

  // Section segments
  report.sections.forEach((section) => {
    // Section title
    if (opts.includeTitles) {
      const titleSeg = createSectionTitleSegment(section.title, opts);
      segments.push(titleSeg);
      totalDuration += titleSeg.duration;
    }

    // Section content
    const contentSegment = createTextSegment(
      'content',
      section.title,
      section.content,
      opts,
      section.citations,
      sources
    );
    segments.push(contentSegment);
    totalDuration += contentSegment.duration + opts.segmentPause;
  });

  // Closing segment
  const closingSegment = createClosingSegment(
    sources.filter((s) => s.state === 'complete').length,
    opts
  );
  segments.push(closingSegment);
  totalDuration += closingSegment.duration;

  return {
    id: `cinematic-${report.id}`,
    reportId: report.id,
    segments,
    totalDuration,
    generatedAt: Date.now(),
  };
}

// -----------------------------------------------------------------------------
// SEGMENT CREATORS
// -----------------------------------------------------------------------------

function createTitleSegment(
  title: string,
  opts: Required<CinematicOptions>
): CinematicSegment {
  const words = title.split(/\s+/);
  const duration = calculateTextDuration(words.length, opts.wordsPerMinute * 0.5); // Slower for title

  return {
    id: 'title',
    type: 'title',
    content: title,
    wordTimings: generateWordTimings(words, duration),
    duration: duration + 1000, // Extra pause after title
    cameraTarget: 'overview',
  };
}

function createSectionTitleSegment(
  title: string,
  opts: Required<CinematicOptions>
): CinematicSegment {
  const words = title.split(/\s+/);
  const duration = calculateTextDuration(words.length, opts.wordsPerMinute * 0.7);

  return {
    id: `section-title-${title.toLowerCase().replace(/\s+/g, '-')}`,
    type: 'section-title',
    content: title,
    wordTimings: generateWordTimings(words, duration),
    duration: duration + 500,
    cameraTarget: 'section',
  };
}

function createTextSegment(
  type: 'summary' | 'content',
  title: string,
  content: string,
  opts: Required<CinematicOptions>,
  citations?: number[],
  sources?: Source[]
): CinematicSegment {
  // Strip citations if not including them
  let processedContent = content;
  if (!opts.includeCitations) {
    processedContent = content.replace(/\[\d+\]/g, '');
  }

  const words = processedContent.split(/\s+/).filter(Boolean);
  const duration = calculateTextDuration(words.length, opts.wordsPerMinute);

  return {
    id: `${type}-${title.toLowerCase().replace(/\s+/g, '-')}`,
    type,
    content: processedContent,
    wordTimings: generateWordTimings(words, duration),
    duration,
    citations: citations || [],
    relatedSources: sources?.filter((s) =>
      citations?.some((c) => sources.indexOf(s) + 1 === c)
    ).map((s) => s.id) || [],
    cameraTarget: type === 'summary' ? 'overview' : 'content',
  };
}

function createClosingSegment(
  sourceCount: number,
  opts: Required<CinematicOptions>
): CinematicSegment {
  const content = `Research complete. ${sourceCount} sources analyzed.`;
  const words = content.split(/\s+/);
  const duration = calculateTextDuration(words.length, opts.wordsPerMinute * 0.6);

  return {
    id: 'closing',
    type: 'closing',
    content,
    wordTimings: generateWordTimings(words, duration),
    duration: duration + 2000,
    cameraTarget: 'overview',
  };
}

// -----------------------------------------------------------------------------
// TIMING UTILITIES
// -----------------------------------------------------------------------------

function calculateTextDuration(wordCount: number, wpm: number): number {
  return (wordCount / wpm) * 60 * 1000; // Convert to milliseconds
}

function generateWordTimings(words: string[], totalDuration: number): WordTiming[] {
  const timings: WordTiming[] = [];
  const baseInterval = totalDuration / words.length;

  let currentTime = 0;
  words.forEach((word, index) => {
    // Vary timing slightly based on word length and punctuation
    let wordDuration = baseInterval;

    // Longer words take slightly longer
    if (word.length > 8) {
      wordDuration *= 1.2;
    }

    // Pause after punctuation
    if (/[.!?]$/.test(word)) {
      wordDuration *= 1.5;
    } else if (/[,;:]$/.test(word)) {
      wordDuration *= 1.2;
    }

    timings.push({
      word,
      startTime: currentTime,
      endTime: currentTime + wordDuration * 0.8, // Words appear for 80% of interval
      index,
    });

    currentTime += wordDuration;
  });

  return timings;
}

// -----------------------------------------------------------------------------
// PLAYBACK ENGINE
// -----------------------------------------------------------------------------

export class CinematicPlayback {
  private script: CinematicScript;
  private state: PlaybackState;
  private callbacks: Set<PlaybackCallback> = new Set();
  private animationFrameId: number | null = null;
  private lastTimestamp: number = 0;

  constructor(script: CinematicScript) {
    this.script = script;
    this.state = {
      isPlaying: false,
      currentSegmentIndex: 0,
      currentWordIndex: 0,
      elapsedTime: 0,
      totalDuration: script.totalDuration,
      speed: 1,
    };
  }

  /**
   * Subscribe to playback state changes
   */
  subscribe(callback: PlaybackCallback): () => void {
    this.callbacks.add(callback);
    callback(this.state);
    return () => this.callbacks.delete(callback);
  }

  /**
   * Start or resume playback
   */
  play() {
    if (this.state.isPlaying) return;

    this.state.isPlaying = true;
    this.lastTimestamp = performance.now();
    this.tick();
    this.notifyCallbacks();
  }

  /**
   * Pause playback
   */
  pause() {
    this.state.isPlaying = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.notifyCallbacks();
  }

  /**
   * Toggle play/pause
   */
  toggle() {
    if (this.state.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  /**
   * Seek to a specific time
   */
  seek(time: number) {
    this.state.elapsedTime = Math.max(0, Math.min(time, this.state.totalDuration));
    this.updateSegmentAndWord();
    this.notifyCallbacks();
  }

  /**
   * Seek to a specific segment
   */
  seekToSegment(index: number) {
    if (index < 0 || index >= this.script.segments.length) return;

    let time = 0;
    for (let i = 0; i < index; i++) {
      time += this.script.segments[i].duration;
    }
    this.seek(time);
  }

  /**
   * Set playback speed
   */
  setSpeed(speed: number) {
    this.state.speed = Math.max(0.25, Math.min(4, speed));
    this.notifyCallbacks();
  }

  /**
   * Reset to beginning
   */
  reset() {
    this.pause();
    this.state.elapsedTime = 0;
    this.state.currentSegmentIndex = 0;
    this.state.currentWordIndex = 0;
    this.notifyCallbacks();
  }

  /**
   * Get current segment
   */
  getCurrentSegment(): CinematicSegment | null {
    return this.script.segments[this.state.currentSegmentIndex] || null;
  }

  /**
   * Get current word
   */
  getCurrentWord(): WordTiming | null {
    const segment = this.getCurrentSegment();
    if (!segment) return null;
    return segment.wordTimings[this.state.currentWordIndex] || null;
  }

  /**
   * Get visible words up to current point
   */
  getVisibleWords(): string[] {
    const segment = this.getCurrentSegment();
    if (!segment) return [];

    return segment.wordTimings
      .slice(0, this.state.currentWordIndex + 1)
      .map((wt) => wt.word);
  }

  /**
   * Get progress as percentage
   */
  getProgress(): number {
    return (this.state.elapsedTime / this.state.totalDuration) * 100;
  }

  /**
   * Cleanup
   */
  destroy() {
    this.pause();
    this.callbacks.clear();
  }

  // Private methods

  private tick() {
    if (!this.state.isPlaying) return;

    const now = performance.now();
    const delta = (now - this.lastTimestamp) * this.state.speed;
    this.lastTimestamp = now;

    this.state.elapsedTime += delta;

    // Check if complete
    if (this.state.elapsedTime >= this.state.totalDuration) {
      this.state.elapsedTime = this.state.totalDuration;
      this.state.isPlaying = false;
      this.notifyCallbacks();
      return;
    }

    this.updateSegmentAndWord();
    this.notifyCallbacks();

    this.animationFrameId = requestAnimationFrame(() => this.tick());
  }

  private updateSegmentAndWord() {
    let accumulatedTime = 0;

    for (let i = 0; i < this.script.segments.length; i++) {
      const segment = this.script.segments[i];
      const segmentEnd = accumulatedTime + segment.duration;

      if (this.state.elapsedTime <= segmentEnd) {
        this.state.currentSegmentIndex = i;

        // Find current word within segment
        const segmentTime = this.state.elapsedTime - accumulatedTime;
        for (let j = 0; j < segment.wordTimings.length; j++) {
          if (segment.wordTimings[j].startTime > segmentTime) {
            this.state.currentWordIndex = Math.max(0, j - 1);
            return;
          }
        }
        this.state.currentWordIndex = segment.wordTimings.length - 1;
        return;
      }

      accumulatedTime = segmentEnd;
    }
  }

  private notifyCallbacks() {
    this.callbacks.forEach((cb) => cb({ ...this.state }));
  }
}

export default {
  generateCinematicScript,
  CinematicPlayback,
};
