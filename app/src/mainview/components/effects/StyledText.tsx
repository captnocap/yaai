// =============================================================================
// STYLED TEXT COMPONENT
// =============================================================================
// Renders text with applied effect rules (animations, replacements, styling)

import React, { useMemo } from 'react';
import { cn } from '../../lib/cn';
import { processText, hasAnyMatch } from '../../lib/effects/text-processor';
import type { TextRule } from '../../types/effects';

export interface StyledTextProps {
  /** The text content to process */
  children: string;
  /** Text transformation rules to apply */
  rules: TextRule[];
  /** Additional class name for the container */
  className?: string;
  /** Whether effects are enabled (if false, renders plain text) */
  enabled?: boolean;
}

/**
 * Renders text with effect rules applied.
 * Matches patterns in the text and wraps them with appropriate styling/animations.
 */
export function StyledText({
  children,
  rules,
  className,
  enabled = true,
}: StyledTextProps) {
  const segments = useMemo(() => {
    // Skip processing if disabled or no rules would match
    if (!enabled || !hasAnyMatch(children, rules)) {
      return null;
    }
    return processText(children, rules);
  }, [children, rules, enabled]);

  // Fast path: no effects to apply
  if (!segments) {
    return <span className={className}>{children}</span>;
  }

  return (
    <span className={className}>
      {segments.map((segment) => {
        if (segment.type === 'text') {
          return <React.Fragment key={segment.key}>{segment.content}</React.Fragment>;
        }

        // Effect segment
        const { rule, content } = segment;
        if (!rule) {
          return <React.Fragment key={segment.key}>{content}</React.Fragment>;
        }

        // Build the element based on action type
        const effectClass = cn(
          'text-effect',
          rule.className,
        );

        return (
          <span
            key={segment.key}
            className={effectClass}
            style={rule.style}
            data-effect={rule.action}
            data-rule={rule.id}
          >
            {content}
          </span>
        );
      })}
    </span>
  );
}

// -----------------------------------------------------------------------------
// WAVE TEXT VARIANT
// -----------------------------------------------------------------------------
// Special component for wave animation where each character animates separately

export interface WaveTextProps {
  children: string;
  className?: string;
  /** Delay between each character's animation start (ms) */
  charDelay?: number;
}

/**
 * Renders text with a wave animation applied to each character.
 * Each character animates with a staggered delay for a flowing effect.
 */
export function WaveText({ children, className, charDelay = 50 }: WaveTextProps) {
  return (
    <span className={cn('inline-flex', className)}>
      {children.split('').map((char, i) => (
        <span
          key={i}
          className="effect-wave"
          style={{ animationDelay: `${i * charDelay}ms` }}
        >
          {char === ' ' ? '\u00A0' : char}
        </span>
      ))}
    </span>
  );
}

// -----------------------------------------------------------------------------
// TYPEWRITER TEXT VARIANT
// -----------------------------------------------------------------------------

export interface TypewriterTextProps {
  children: string;
  className?: string;
  /** Speed of typing in ms per character */
  speed?: number;
  /** Whether to show cursor */
  showCursor?: boolean;
  /** Callback when typing completes */
  onComplete?: () => void;
}

/**
 * Renders text with a typewriter effect.
 */
export function TypewriterText({
  children,
  className,
  speed = 50,
  showCursor = true,
  onComplete,
}: TypewriterTextProps) {
  const [displayedLength, setDisplayedLength] = React.useState(0);
  const [isComplete, setIsComplete] = React.useState(false);

  React.useEffect(() => {
    if (displayedLength >= children.length) {
      setIsComplete(true);
      onComplete?.();
      return;
    }

    const timer = setTimeout(() => {
      setDisplayedLength((prev) => prev + 1);
    }, speed);

    return () => clearTimeout(timer);
  }, [displayedLength, children.length, speed, onComplete]);

  return (
    <span className={className}>
      {children.slice(0, displayedLength)}
      {showCursor && !isComplete && (
        <span className="animate-blink">|</span>
      )}
    </span>
  );
}

// -----------------------------------------------------------------------------
// GLITCH TEXT VARIANT
// -----------------------------------------------------------------------------

export interface GlitchTextProps {
  children: string;
  className?: string;
  /** Intensity of glitch effect (affects frequency) */
  intensity?: 'low' | 'medium' | 'high';
}

/**
 * Renders text with a persistent glitch effect.
 */
export function GlitchText({
  children,
  className,
  intensity = 'medium',
}: GlitchTextProps) {
  const animationDuration = {
    low: '3s',
    medium: '1.5s',
    high: '0.5s',
  }[intensity];

  return (
    <span
      className={cn('effect-glitch', className)}
      style={{
        animationDuration,
        animationIterationCount: 'infinite',
      }}
      data-text={children}
    >
      {children}
    </span>
  );
}
