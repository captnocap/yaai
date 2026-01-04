import React from 'react';
import { Paperclip, Sparkles } from 'lucide-react';
import { cn, formatCompact } from '../../lib';
import { IconButton, Counter } from '../atoms';
import { TokenMeter } from '../molecules';
import { SendButton } from './SendButton';
import { ToolToggle } from './ToolToggle';
import type { ToolConfig, ModelInfo } from '../../types';

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
  selectedModels?: ModelInfo[];
  onOpenModelSelector?: () => void;
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
  selectedModels = [],
  onOpenModelSelector,
}: InputFooterProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 px-4 py-2',
        'border-t border-[var(--color-border)]',
        className
      )}
    >
      {/* Left side: attach + models + tools */}
      <div className="flex items-center gap-2">
        <IconButton
          icon={<Paperclip />}
          onClick={onAttach}
          size="sm"
          variant="ghost"
          tooltip="Attach files"
        />

        <div className="h-4 w-px bg-[var(--color-border)]" />

        {/* Model selector button */}
        <div className="relative">
          <IconButton
            icon={<Sparkles />}
            onClick={onOpenModelSelector}
            size="sm"
            variant={selectedModels.length > 0 ? 'default' : 'ghost'}
            tooltip={selectedModels.length > 0 ? `${selectedModels.length} model${selectedModels.length === 1 ? '' : 's'} selected` : 'Select models...'}
          />
          {selectedModels.length > 0 && (
            <div className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 bg-[var(--color-accent)] text-white text-xs font-bold rounded-full">
              {selectedModels.length}
            </div>
          )}
        </div>

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
