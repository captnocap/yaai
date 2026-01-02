import React, { useEffect, useRef, useState } from 'react';
import { cn, formatCompact, formatBytes } from '../../lib';

export interface CounterProps {
  value: number;
  format?: 'number' | 'compact' | 'bytes';
  duration?: number;
  className?: string;
}

export function Counter({
  value,
  format = 'number',
  duration = 300,
  className,
}: CounterProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const prevValue = useRef(value);
  const rafRef = useRef<number>();

  useEffect(() => {
    const start = prevValue.current;
    const end = value;
    const startTime = performance.now();

    if (start === end) return;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out quad
      const eased = 1 - (1 - progress) * (1 - progress);
      const current = Math.round(start + (end - start) * eased);

      setDisplayValue(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        prevValue.current = end;
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [value, duration]);

  const formatted = (() => {
    switch (format) {
      case 'compact':
        return formatCompact(displayValue);
      case 'bytes':
        return formatBytes(displayValue);
      default:
        return displayValue.toLocaleString();
    }
  })();

  return (
    <span className={cn('tabular-nums', className)}>
      {formatted}
    </span>
  );
}
