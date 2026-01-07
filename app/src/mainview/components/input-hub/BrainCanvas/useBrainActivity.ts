// =============================================================================
// USE BRAIN ACTIVITY
// =============================================================================
// Hook for mapping memory events to brain animation states.

import { useState, useEffect, useCallback } from 'react';
import { onMessage } from '../../../lib/comm-bridge';

// =============================================================================
// TYPES
// =============================================================================

export type BrainActivity =
  | 'idle'
  | 'typing'
  | 'memory_write'
  | 'memory_retrieve'
  | 'affect_frustrated'
  | 'affect_confused'
  | 'affect_curious'
  | 'affect_satisfied'
  | 'affect_urgent'
  | 'affect_reflective'
  | 'consolidating';

export interface UseBrainActivityReturn {
  activity: BrainActivity;
  setActivity: (activity: BrainActivity) => void;
  /** Trigger a temporary activity that reverts to previous state */
  flash: (activity: BrainActivity, durationMs?: number) => void;
}

// =============================================================================
// HOOK
// =============================================================================

export function useBrainActivity(initialActivity: BrainActivity = 'idle'): UseBrainActivityReturn {
  const [activity, setActivity] = useState<BrainActivity>(initialActivity);
  const [baseActivity, setBaseActivity] = useState<BrainActivity>(initialActivity);

  // Flash a temporary activity
  const flash = useCallback((tempActivity: BrainActivity, durationMs: number = 500) => {
    setActivity(tempActivity);
    setTimeout(() => {
      setActivity(baseActivity);
    }, durationMs);
  }, [baseActivity]);

  // Update base activity when set directly
  const handleSetActivity = useCallback((newActivity: BrainActivity) => {
    setActivity(newActivity);
    // Only update base for non-flash states
    if (!['memory_write', 'memory_retrieve', 'consolidating'].includes(newActivity)) {
      setBaseActivity(newActivity);
    }
  }, []);

  // Subscribe to memory events
  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    // Memory pinned
    unsubscribers.push(
      onMessage('memory:pinned', () => {
        flash('memory_write', 800);
      })
    );

    // Memory boosted
    unsubscribers.push(
      onMessage('memory:boosted', () => {
        flash('memory_write', 600);
      })
    );

    // Memory muted
    unsubscribers.push(
      onMessage('memory:muted', () => {
        flash('memory_write', 400);
      })
    );

    // Affect tagged
    unsubscribers.push(
      onMessage('memory:affect-tagged', (data: any) => {
        const category = data?.entry?.affectCategory?.toLowerCase();
        if (category) {
          const affectActivity = `affect_${category}` as BrainActivity;
          flash(affectActivity, 1000);
        }
      })
    );

    // Consolidation complete
    unsubscribers.push(
      onMessage('memory:consolidation-complete', () => {
        flash('consolidating', 1500);
      })
    );

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [flash]);

  return {
    activity,
    setActivity: handleSetActivity,
    flash,
  };
}

// =============================================================================
// ACTIVITY COLOR MAPPING
// =============================================================================

export const ACTIVITY_COLORS: Record<BrainActivity, string> = {
  idle: '#6b7280',           // Gray
  typing: '#60a5fa',         // Blue
  memory_write: '#f472b6',   // Pink
  memory_retrieve: '#34d399', // Green
  affect_frustrated: '#ef4444', // Red
  affect_confused: '#f59e0b',   // Amber
  affect_curious: '#3b82f6',    // Blue
  affect_satisfied: '#22c55e',  // Green
  affect_urgent: '#dc2626',     // Dark red
  affect_reflective: '#8b5cf6', // Purple
  consolidating: '#a855f7',     // Purple bright
};

export const ACTIVITY_INTENSITY: Record<BrainActivity, number> = {
  idle: 0.3,
  typing: 0.5,
  memory_write: 1.0,
  memory_retrieve: 0.8,
  affect_frustrated: 0.9,
  affect_confused: 0.7,
  affect_curious: 0.6,
  affect_satisfied: 0.7,
  affect_urgent: 1.0,
  affect_reflective: 0.5,
  consolidating: 0.9,
};
