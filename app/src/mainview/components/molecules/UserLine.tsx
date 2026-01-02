import React from 'react';
import { cn } from '../../lib';
import { Avatar, Timestamp } from '../atoms';

export interface UserLineProps {
  user: {
    name: string;
    avatar?: string;
  };
  timestamp?: Date;
  className?: string;
}

export function UserLine({
  user,
  timestamp,
  className,
}: UserLineProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Avatar
        src={user.avatar}
        fallback={user.name}
        size="sm"
      />
      <span className="font-medium text-sm text-[var(--color-text)]">
        {user.name}
      </span>
      {timestamp && (
        <>
          <span className="text-[var(--color-text-tertiary)]">•</span>
          <Timestamp date={timestamp} format="relative" live />
        </>
      )}
    </div>
  );
}
