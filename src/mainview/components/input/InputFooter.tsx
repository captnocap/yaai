import React from 'react';
import { Paperclip } from 'lucide-react';
import { cn, formatCompact } from '../../lib';
import { IconButton, Counter } from '../atoms';
import { TokenMeter } from '../molecules';
import { SendButton } from './SendButton';
import { ToolToggle } from './ToolToggle';
import type { ToolConfig } from '../../types';

export interface InputFooterProps {
  onAttach: () => void;
  tools: ToolConfig[];
  onToolToggle: (toolId: string, enabled: boolean) => void;
  tokenEstimate: number;
  tokenTotal: number;
  tokenLimit: number;
  onSend: () => void;
  canSend: boolean;
  isLoading?: boolean;
  className?: string;
}

export function InputFooter({
  onAttach,
  tools,
  onToolToggle,
  tokenEstimate,
  tokenTotal,
  tokenLimit,
  onSend,
  canSend,
  isLoading = false,
  className,
}: InputFooterProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 px-4 py-2',
        'border-t border-[var(--color-border)]',
        className
      )}
    >
      {/* Left side: attach + tools */}
      <div className="flex items-center gap-2">
        <IconButton
          icon={<Paperclip />}
          onClick={onAttach}
          size="sm"
          variant="ghost"
          tooltip="Attach files"
        />

        <div className="h-4 w-px bg-[var(--color-border)]" />

        {/* Tool toggles */}
        <div className="flex items-center gap-1">
          {tools.map((tool) => (
            <ToolToggle
              key={tool.id}
              tool={tool}
              enabled={tool.enabled}
              onChange={(enabled) => onToolToggle(tool.id, enabled)}
            />
          ))}
        </div>
      </div>

      {/* Right side: tokens + send */}
      <div className="flex items-center gap-3">
        {/* Token estimate for current input */}
        {tokenEstimate > 0 && (
          <span className="text-xs text-[var(--color-text-tertiary)]">
            +<Counter value={tokenEstimate} format="compact" />
          </span>
        )}

        {/* Total token meter */}
        <TokenMeter
          used={tokenTotal}
          limit={tokenLimit}
          size="sm"
        />

        {/* Send button */}
        <SendButton
          onClick={onSend}
          loading={isLoading}
          disabled={!canSend}
        />
      </div>
    </div>
  );
}
