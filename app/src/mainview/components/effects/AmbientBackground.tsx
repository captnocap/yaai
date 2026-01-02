// =============================================================================
// AMBIENT BACKGROUND
// =============================================================================
// Renders the mood-reactive background with gradient, orbs, and optional particles.

import React, { useMemo } from 'react';
import { cn } from '../../lib/cn';
import { useMood } from './MoodProvider';

// -----------------------------------------------------------------------------
// MAIN BACKGROUND COMPONENT
// -----------------------------------------------------------------------------

export interface AmbientBackgroundProps {
  className?: string;
}

export function AmbientBackground({ className }: AmbientBackgroundProps) {
  const { theme, isLayerEnabled, settings } = useMood();

  const showBackground = isLayerEnabled('background');
  const showOrbs = isLayerEnabled('ambientOrbs');
  const showParticles = isLayerEnabled('particles');

  if (!settings.enabled) {
    return null;
  }

  return (
    <>
      {/* Base gradient background */}
      {showBackground && (
        <div
          className={cn('mood-background', className)}
          data-animation={theme.bgAnimation}
        />
      )}

      {/* Floating orbs */}
      {showOrbs && (
        <>
          <div className="mood-orb mood-orb--primary" />
          <div className="mood-orb mood-orb--secondary" />
          <div className="mood-orb mood-orb--tertiary" />
        </>
      )}

      {/* Particle effects */}
      {showParticles && theme.particleEffect && theme.particleEffect !== 'none' && (
        <ParticleLayer effect={theme.particleEffect} intensity={settings.intensity} />
      )}
    </>
  );
}

// -----------------------------------------------------------------------------
// PARTICLE LAYER
// -----------------------------------------------------------------------------

type ParticleEffectType =
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

interface ParticleLayerProps {
  effect: ParticleEffectType;
  intensity?: number;
}

function ParticleLayer({ effect, intensity = 0.7 }: ParticleLayerProps) {
  const particles = useMemo(() => {
    const count = Math.floor(20 * intensity);
    return generateParticles(effect, count);
  }, [effect, intensity]);

  return (
    <div className="particle-container" aria-hidden="true">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className={cn('particle', `particle--${effect}`)}
          style={particle.style}
        >
          {particle.content}
        </div>
      ))}
    </div>
  );
}

interface ParticleConfig {
  id: string;
  style: React.CSSProperties;
  content?: string;
}

function generateParticles(effect: ParticleEffectType, count: number): ParticleConfig[] {
  const particles: ParticleConfig[] = [];

  for (let i = 0; i < count; i++) {
    const baseStyle: React.CSSProperties = {
      left: `${Math.random() * 100}%`,
      animationDelay: `${Math.random() * 5}s`,
      animationDuration: `${3 + Math.random() * 4}s`,
    };

    switch (effect) {
      case 'hearts':
        particles.push({
          id: `heart-${i}`,
          style: {
            ...baseStyle,
            top: `${70 + Math.random() * 30}%`,
            fontSize: `${0.8 + Math.random() * 0.8}rem`,
          },
          content: ['❤️', '💕', '💖', '💗'][Math.floor(Math.random() * 4)],
        });
        break;

      case 'rain':
        particles.push({
          id: `rain-${i}`,
          style: {
            ...baseStyle,
            top: '-20px',
            height: `${8 + Math.random() * 12}px`,
            animationDuration: `${0.5 + Math.random() * 1}s`,
          },
        });
        break;

      case 'snow':
        particles.push({
          id: `snow-${i}`,
          style: {
            ...baseStyle,
            top: '-10px',
            fontSize: `${0.5 + Math.random() * 0.5}rem`,
            animationDuration: `${5 + Math.random() * 5}s`,
          },
          content: '❄️',
        });
        break;

      case 'stars':
        particles.push({
          id: `star-${i}`,
          style: {
            ...baseStyle,
            top: `${Math.random() * 100}%`,
            fontSize: `${0.5 + Math.random() * 0.5}rem`,
          },
          content: ['✦', '✧', '⋆', '★'][Math.floor(Math.random() * 4)],
        });
        break;

      case 'sparks':
        particles.push({
          id: `spark-${i}`,
          style: {
            ...baseStyle,
            bottom: '10%',
            top: 'auto',
            animationDuration: `${1 + Math.random() * 2}s`,
          },
        });
        break;

      case 'fire':
        particles.push({
          id: `fire-${i}`,
          style: {
            ...baseStyle,
            bottom: '0',
            top: 'auto',
            fontSize: `${1 + Math.random() * 1}rem`,
            animationDuration: `${2 + Math.random() * 2}s`,
          },
          content: ['🔥', '🔥', '✨'][Math.floor(Math.random() * 3)],
        });
        break;

      case 'bubbles':
        particles.push({
          id: `bubble-${i}`,
          style: {
            ...baseStyle,
            bottom: '-20px',
            top: 'auto',
            width: `${10 + Math.random() * 20}px`,
            height: `${10 + Math.random() * 20}px`,
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            animationDuration: `${4 + Math.random() * 4}s`,
          },
        });
        break;

      case 'confetti':
        const colors = ['#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#1dd1a1', '#5f27cd'];
        particles.push({
          id: `confetti-${i}`,
          style: {
            ...baseStyle,
            top: '-10px',
            width: '10px',
            height: '10px',
            background: colors[Math.floor(Math.random() * colors.length)],
            transform: `rotate(${Math.random() * 360}deg)`,
            animationDuration: `${3 + Math.random() * 3}s`,
          },
        });
        break;

      case 'fireflies':
        particles.push({
          id: `firefly-${i}`,
          style: {
            ...baseStyle,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 4}s`,
          },
        });
        break;

      case 'leaves':
        particles.push({
          id: `leaf-${i}`,
          style: {
            ...baseStyle,
            top: '-20px',
            fontSize: `${0.8 + Math.random() * 0.5}rem`,
            animationDuration: `${5 + Math.random() * 5}s`,
          },
          content: ['🍂', '🍁', '🍃'][Math.floor(Math.random() * 3)],
        });
        break;
    }
  }

  return particles;
}

// -----------------------------------------------------------------------------
// MOOD INDICATOR (Optional debug/display component)
// -----------------------------------------------------------------------------

export interface MoodIndicatorProps {
  className?: string;
  showConfidence?: boolean;
}

/**
 * Small indicator showing current detected mood.
 * Useful for debugging or as a subtle UI element.
 */
export function MoodIndicator({ className, showConfidence = false }: MoodIndicatorProps) {
  const { moodState, theme } = useMood();

  const moodEmoji: Record<string, string> = {
    neutral: '😐',
    heated: '🔥',
    romantic: '💕',
    melancholy: '🌧️',
    excited: '🎉',
    mysterious: '🌙',
    playful: '😜',
    tense: '😰',
    serene: '🧘',
    creative: '🎨',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs',
        'bg-black/20 backdrop-blur-sm',
        'transition-all duration-500',
        className
      )}
      style={{ borderColor: theme.accent }}
    >
      <span>{moodEmoji[moodState.current] || '😐'}</span>
      <span className="capitalize">{moodState.current}</span>
      {showConfidence && (
        <span className="opacity-60">
          {Math.round(moodState.confidence * 100)}%
        </span>
      )}
    </div>
  );
}
