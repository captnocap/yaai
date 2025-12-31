import React from 'react';
import { cn } from '../../lib';
import { MessageHeader } from './MessageHeader';
import { MessageBody } from './MessageBody';
import { MessageActions } from './MessageActions';
import { MessageFooter } from './MessageFooter';
import { BranchIndicator } from './BranchIndicator';
import { FileCard } from '../file';
import type { Message, FileObject } from '../../types';
import type { TextRule } from '../../types/effects';

export interface MessageContainerProps {
  message: Message;
  showActions?: boolean;
  showBranch?: boolean;
  isStreaming?: boolean;
  branchDepth?: number;
  user?: { name: string; avatar?: string };
  /** Text effect rules from mood system */
  textRules?: TextRule[];
  /** Whether mood effects are enabled */
  moodEnabled?: boolean;
  onCopy?: () => void;
  onEdit?: () => void;
  onRegenerate?: () => void;
  onLike?: () => void;
  onSaveToMemory?: () => void;
  onDelete?: () => void;
  onBranch?: () => void;
  onExport?: () => void;
  onAttachmentClick?: (file: FileObject) => void;
  className?: string;
}

export function MessageContainer({
  message,
  showActions = true,
  showBranch = false,
  isStreaming = false,
  branchDepth = 0,
  user,
  textRules = [],
  moodEnabled = false,
  onCopy,
  onEdit,
  onRegenerate,
  onLike,
  onSaveToMemory,
  onDelete,
  onBranch,
  onExport,
  onAttachmentClick,
  className,
}: MessageContainerProps) {
  const isUser = message.role === 'user';

  // Compute content string for copying
  const contentString = message.content
    .map((c) => c.value)
    .join('\n\n');

  return (
    <div
      className={cn(
        'group relative',
        'py-4 px-4',
        'animate-slide-in-bottom',
        'mood-message-bubble', // Mood effect hook
        isUser ? 'bg-[var(--color-bg)]' : 'bg-[var(--color-bg-secondary)]',
        className
      )}
      data-mood-enabled={moodEnabled}
    >
      {/* Branch indicator */}
      {showBranch && message.branchId && (
        <BranchIndicator
          branchId={message.branchId}
          depth={branchDepth}
          isActive
        />
      )}

      <div
        className={cn(
          'max-w-3xl mx-auto',
          showBranch && message.branchId && 'pl-4'
        )}
      >
        {/* Header */}
        <MessageHeader
          role={message.role}
          model={message.model}
          user={user}
          timestamp={message.timestamp}
        />

        {/* Body */}
        <MessageBody
          content={message.content}
          isStreaming={isStreaming}
          textRules={textRules}
          effectsEnabled={moodEnabled}
        />

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {message.attachments.map((file) => (
              <FileCard
                key={file.id}
                file={file}
                compact
                onClick={() => onAttachmentClick?.(file)}
              />
            ))}
          </div>
        )}

        {/* Tool calls - TODO: Implement ToolCallCard */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mt-3 text-sm text-[var(--color-text-tertiary)]">
            {message.toolCalls.length} tool call(s)
          </div>
        )}

        {/* Footer with stats */}
        {message.role === 'assistant' && (
          <MessageFooter
            tokenCount={message.tokenCount}
            generationTime={message.generationTime}
          />
        )}

        {/* Actions */}
        {showActions && (
          <div className="mt-2">
            <MessageActions
              messageId={message.id}
              role={message.role}
              content={contentString}
              isLiked={message.isLiked}
              onCopy={onCopy}
              onEdit={isUser ? onEdit : undefined}
              onRegenerate={!isUser ? onRegenerate : undefined}
              onLike={!isUser ? onLike : undefined}
              onSaveToMemory={!isUser ? onSaveToMemory : undefined}
              onDelete={onDelete}
              onBranch={onBranch}
              onExport={!isUser ? onExport : undefined}
            />
          </div>
        )}
      </div>
    </div>
  );
}
