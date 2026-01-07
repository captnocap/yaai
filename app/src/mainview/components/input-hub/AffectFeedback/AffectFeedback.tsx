// =============================================================================
// AFFECT FEEDBACK
// =============================================================================
// Quick emoji reactions for tagging affect on AI responses.
// Subtle, non-intrusive placement in the controls area.

import React, { useState, useCallback } from 'react';
import { ThumbsDown, Meh, ThumbsUp } from 'lucide-react';
import { cn } from '../../../lib';
import { useMemory } from '../../../hooks';
import type { AffectCategory } from '../../../types/memory';

// =============================================================================
// TYPES
// =============================================================================

export interface AffectFeedbackProps {
  chatId: string;
  messageId: string;
  className?: string;
}

type FeedbackType = 'negative' | 'neutral' | 'positive';

// Map feedback to affect category
const FEEDBACK_TO_AFFECT: Record<FeedbackType, { category: AffectCategory; intensity: number }> = {
  negative: { category: 'FRUSTRATED', intensity: 0.7 },
  neutral: { category: 'REFLECTIVE', intensity: 0.4 },
  positive: { category: 'SATISFIED', intensity: 0.8 },
};

// =============================================================================
// COMPONENT
// =============================================================================

export function AffectFeedback({
  chatId,
  messageId,
  className,
}: AffectFeedbackProps) {
  const [selected, setSelected] = useState<FeedbackType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { tagAffect } = useMemory();

  const handleFeedback = useCallback(async (type: FeedbackType) => {
    if (isSubmitting || selected === type) return;

    setIsSubmitting(true);
    setSelected(type);

    try {
      const { category, intensity } = FEEDBACK_TO_AFFECT[type];
      await tagAffect(chatId, messageId, category, intensity, `User feedback: ${type}`);
    } catch (error) {
      console.error('Failed to submit affect feedback:', error);
      // Reset selection on error
      setSelected(null);
    } finally {
      setIsSubmitting(false);
    }
  }, [chatId, messageId, tagAffect, isSubmitting, selected]);

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <span className="text-[10px] text-[var(--color-text-tertiary)] mr-1">
        Helpful?
      </span>

      {/* Negative */}
      <button
        onClick={() => handleFeedback('negative')}
        disabled={isSubmitting}
        className={cn(
          'p-1.5 rounded transition-all',
          'hover:bg-[var(--color-bg-secondary)]',
          'focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]',
          selected === 'negative' && 'bg-red-500/20 text-red-400',
          selected && selected !== 'negative' && 'opacity-40'
        )}
        title="Not helpful"
      >
        <ThumbsDown size={14} />
      </button>

      {/* Neutral */}
      <button
        onClick={() => handleFeedback('neutral')}
        disabled={isSubmitting}
        className={cn(
          'p-1.5 rounded transition-all',
          'hover:bg-[var(--color-bg-secondary)]',
          'focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]',
          selected === 'neutral' && 'bg-amber-500/20 text-amber-400',
          selected && selected !== 'neutral' && 'opacity-40'
        )}
        title="Somewhat helpful"
      >
        <Meh size={14} />
      </button>

      {/* Positive */}
      <button
        onClick={() => handleFeedback('positive')}
        disabled={isSubmitting}
        className={cn(
          'p-1.5 rounded transition-all',
          'hover:bg-[var(--color-bg-secondary)]',
          'focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]',
          selected === 'positive' && 'bg-green-500/20 text-green-400',
          selected && selected !== 'positive' && 'opacity-40'
        )}
        title="Very helpful"
      >
        <ThumbsUp size={14} />
      </button>
    </div>
  );
}
