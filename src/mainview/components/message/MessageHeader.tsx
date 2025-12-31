import React from 'react';
import { cn } from '../../lib';
import { Timestamp } from '../atoms';
import { ModelBadge, UserLine } from '../molecules';
import type { ModelInfo } from '../../types';

export interface MessageHeaderProps {
  role: 'user' | 'assistant';
  model?: ModelInfo;
  user?: { name: string; avatar?: string };
  timestamp: Date;
  className?: string;
}

export function MessageHeader({
  role,
  model,
  user,
  timestamp,
  className,
}: MessageHeaderProps) {
  return (
    <div className={cn('flex items-center gap-3 mb-2', className)}>
      {role === 'assistant' && model ? (
        <>
          <ModelBadge model={model} size="sm" showProvider />
          <Timestamp date={timestamp} format="relative" live />
        </>
      ) : (
        <UserLine
          user={user || { name: 'You' }}
          timestamp={timestamp}
        />
      )}
    </div>
  );
}
