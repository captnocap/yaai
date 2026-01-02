import React from 'react';
import { cn } from '../../lib';
import { YesNoPrompt, NumberedPrompt, FreeformInput } from './prompt';
import { SnippetList } from './viewer';
import type { InputPrompt } from '../../types/code-session';
import type { CodeSnippet } from '../../types/snippet';

export interface CodeInputProps {
  currentPrompt: InputPrompt | null;
  isStreaming?: boolean;
  disabled?: boolean;
  snippets?: CodeSnippet[];
  onSendInput: (input: string) => void;
  onSendYesNo: (answer: boolean) => void;
  onSendSelection: (index: number) => void;
  onRemoveSnippet?: (snippetId: string) => void;
  onClearSnippets?: () => void;
  onSnippetClick?: (snippet: CodeSnippet) => void;
  className?: string;
}

export function CodeInput({
  currentPrompt,
  isStreaming = false,
  disabled = false,
  snippets = [],
  onSendInput,
  onSendYesNo,
  onSendSelection,
  onRemoveSnippet,
  onClearSnippets,
  onSnippetClick,
  className,
}: CodeInputProps) {
  const isDisabled = disabled || isStreaming;

  // Render prompt-specific input
  const renderPromptInput = () => {
    if (!currentPrompt) {
      return (
        <FreeformInput
          placeholder="Send a message to Claude..."
          onSubmit={onSendInput}
          disabled={isDisabled}
          autoFocus
        />
      );
    }

    switch (currentPrompt.type) {
      case 'yes_no':
        return (
          <YesNoPrompt
            prompt={currentPrompt}
            onAnswer={onSendYesNo}
            disabled={isDisabled}
          />
        );

      case 'numbered':
        return (
          <NumberedPrompt
            prompt={currentPrompt}
            onSelect={onSendSelection}
            disabled={isDisabled}
          />
        );

      case 'confirmation':
        return (
          <div className="animate-fade-in">
            <p className="text-sm text-[var(--color-text)] mb-3">
              {currentPrompt.message}
            </p>
            <button
              onClick={() => onSendInput('')}
              disabled={isDisabled}
              className={cn(
                'w-full py-2.5 px-4 rounded-lg',
                'text-sm font-medium',
                'bg-[var(--color-accent)] text-white',
                'hover:opacity-90 transition-opacity',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              Press Enter to continue
            </button>
          </div>
        );

      case 'freeform':
      default:
        return (
          <FreeformInput
            prompt={currentPrompt}
            placeholder="Enter your response..."
            onSubmit={onSendInput}
            disabled={isDisabled}
            autoFocus
          />
        );
    }
  };

  return (
    <div className={cn(
      'border-t border-[var(--color-border)]',
      'bg-[var(--color-bg)]',
      className
    )}>
      {/* Attached snippets */}
      {snippets.length > 0 && onRemoveSnippet && onClearSnippets && (
        <SnippetList
          snippets={snippets}
          onRemove={onRemoveSnippet}
          onClear={onClearSnippets}
          onSnippetClick={onSnippetClick}
        />
      )}

      {/* Input area */}
      <div className="p-4">
        {renderPromptInput()}
      </div>
    </div>
  );
}
