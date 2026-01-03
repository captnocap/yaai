// =============================================================================
// TEXT REVEAL
// =============================================================================
// Word-by-word text reveal animation for cinematic mode.

import { useMemo } from 'react';

interface TextRevealProps {
  text: string;
  visibleWords: number;
  className?: string;
  highlightColor?: string;
  fadeWords?: number;
}

export function TextReveal({
  text,
  visibleWords,
  className = '',
  highlightColor = 'var(--color-accent)',
  fadeWords = 3,
}: TextRevealProps) {
  const words = useMemo(() => text.split(/\s+/), [text]);

  return (
    <p className={`leading-relaxed ${className}`}>
      {words.map((word, index) => {
        const isVisible = index < visibleWords;
        const isLatest = index === visibleWords - 1;
        const fadeLevel = Math.max(0, visibleWords - index - 1);
        const opacity = isVisible
          ? fadeLevel < fadeWords
            ? 1 - (fadeLevel / fadeWords) * 0.3
            : 0.7
          : 0;

        return (
          <span
            key={index}
            className="inline-block transition-all duration-300"
            style={{
              opacity,
              color: isLatest ? highlightColor : 'inherit',
              textShadow: isLatest ? `0 0 20px ${highlightColor}` : 'none',
              transform: isVisible ? 'translateY(0)' : 'translateY(10px)',
            }}
          >
            {word}
            {index < words.length - 1 && '\u00A0'}
          </span>
        );
      })}
    </p>
  );
}

// Variant for titles with more dramatic reveal
interface TitleRevealProps {
  text: string;
  visibleWords: number;
  className?: string;
}

export function TitleReveal({ text, visibleWords, className = '' }: TitleRevealProps) {
  const words = useMemo(() => text.split(/\s+/), [text]);

  return (
    <h2 className={`font-bold ${className}`}>
      {words.map((word, index) => {
        const isVisible = index < visibleWords;
        const isLatest = index === visibleWords - 1;

        return (
          <span
            key={index}
            className="inline-block transition-all duration-500"
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible
                ? 'translateY(0) scale(1)'
                : 'translateY(30px) scale(0.9)',
              color: isLatest ? 'var(--color-accent)' : 'var(--color-text)',
              textShadow: isLatest
                ? '0 0 30px var(--color-accent), 0 0 60px var(--color-accent)'
                : '0 0 20px rgba(255,255,255,0.1)',
            }}
          >
            {word}
            {index < words.length - 1 && '\u00A0'}
          </span>
        );
      })}
    </h2>
  );
}

// Typewriter-style reveal (character by character)
interface TypewriterRevealProps {
  text: string;
  visibleChars: number;
  className?: string;
  cursorVisible?: boolean;
}

export function TypewriterReveal({
  text,
  visibleChars,
  className = '',
  cursorVisible = true,
}: TypewriterRevealProps) {
  const visibleText = text.slice(0, visibleChars);
  const showCursor = cursorVisible && visibleChars < text.length;

  return (
    <span className={className}>
      {visibleText}
      {showCursor && (
        <span
          className="inline-block w-0.5 h-[1em] bg-[var(--color-accent)] animate-pulse ml-0.5"
          style={{ verticalAlign: 'text-bottom' }}
        />
      )}
    </span>
  );
}

// Paragraph reveal with fade-in effect
interface ParagraphRevealProps {
  paragraphs: string[];
  visibleIndex: number;
  className?: string;
}

export function ParagraphReveal({
  paragraphs,
  visibleIndex,
  className = '',
}: ParagraphRevealProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {paragraphs.map((paragraph, index) => {
        const isVisible = index <= visibleIndex;
        const isCurrent = index === visibleIndex;

        return (
          <p
            key={index}
            className="transition-all duration-700"
            style={{
              opacity: isVisible ? (isCurrent ? 1 : 0.6) : 0,
              transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
              filter: isCurrent ? 'none' : 'blur(0.5px)',
            }}
          >
            {paragraph}
          </p>
        );
      })}
    </div>
  );
}

export default TextReveal;
