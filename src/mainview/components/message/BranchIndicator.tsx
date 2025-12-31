import React from 'react';
import { cn } from '../../lib';

// Different colors for different branches
const branchColors = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-cyan-500',
];

export interface BranchIndicatorProps {
  branchId: string;
  depth: number;
  isActive: boolean;
  className?: string;
}

export function BranchIndicator({
  branchId,
  depth,
  isActive,
  className,
}: BranchIndicatorProps) {
  // Generate consistent color from branchId
  const colorIndex = branchId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % branchColors.length;
  const color = branchColors[colorIndex];

  return (
    <div
      className={cn(
        'absolute left-0 top-0 bottom-0 w-0.5',
        'transition-opacity',
        isActive ? 'opacity-100' : 'opacity-40',
        className
      )}
      style={{ left: `${depth * 8}px` }}
    >
      <div
        className={cn(
          'h-full w-full',
          color,
          'animate-slide-in-top'
        )}
      />
    </div>
  );
}
