// =============================================================================
// BRAIN PANEL
// =============================================================================
// Wraps the existing BrainCanvas ThreeJS component as a grid panel.

import React, { useRef, useState, useEffect } from 'react';
import { MinimalPanel } from '../InputHubPanel';
import { BrainCanvas } from '../BrainCanvas/BrainCanvas';
import type { BrainActivity } from '../BrainCanvas/useBrainActivity';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface BrainPanelProps {
  activity: BrainActivity;
  keystrokeCount?: number;
  className?: string;
}

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function BrainPanel({
  activity,
  keystrokeCount = 0,
  className,
}: BrainPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(100);

  // Measure container and use the smaller dimension
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        // Use the smaller dimension minus some padding
        const newSize = Math.min(rect.width, rect.height) - 8;
        setSize(Math.max(newSize, 60)); // Minimum 60px
      }
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <MinimalPanel panelId="brain" className={className}>
      <div
        ref={containerRef}
        className="h-full w-full flex items-center justify-center overflow-hidden"
      >
        <BrainCanvas
          activity={activity}
          size={size}
          keystrokeCount={keystrokeCount}
        />
      </div>
    </MinimalPanel>
  );
}
