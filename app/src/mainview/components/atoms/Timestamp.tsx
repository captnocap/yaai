import React, { useEffect, useState } from 'react';
import { cn, formatRelativeTime, formatTime, formatDateTime } from '../../lib';
import { Tooltip } from './Tooltip';

export interface TimestampProps {
  date: Date | string | number;
  format?: 'relative' | 'time' | 'date' | 'full';
  live?: boolean;
  className?: string;
}

export function Timestamp({
  date,
  format = 'relative',
  live = false,
  className,
}: TimestampProps) {
  const [, setTick] = useState(0);
  const dateObj = new Date(date);

  // Update relative timestamps periodically
  useEffect(() => {
    if (!live || format !== 'relative') return;

    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [live, format]);

  const formatted = (() => {
    switch (format) {
      case 'relative':
        return formatRelativeTime(dateObj);
      case 'time':
        return formatTime(dateObj);
      case 'date':
        return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      case 'full':
        return formatDateTime(dateObj);
      default:
        return formatRelativeTime(dateObj);
    }
  })();

  const fullDateTime = dateObj.toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <Tooltip content={fullDateTime}>
      <time
        dateTime={dateObj.toISOString()}
        className={cn(
          'text-[var(--color-text-tertiary)] text-sm',
          className
        )}
      >
        {formatted}
      </time>
    </Tooltip>
  );
}
