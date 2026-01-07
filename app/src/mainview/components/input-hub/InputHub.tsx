// =============================================================================
// INPUT HUB
// =============================================================================
// Two-column input area with memory visualization and live memory stream.
// Replaces InputContainer with an ambient command hub design.

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '../../lib';
import { ChipList, MemoryChip } from '../molecules';
import { AutoTextArea } from '../input/AutoTextArea';
import { AttachmentTray } from '../input/AttachmentTray';
import { InputFooter } from '../input/InputFooter';
import { VariableBlocksContainer } from '../input/VariableBlocksContainer';
import { PasteVariableConfirmDialog } from '../input/PasteVariableConfirmDialog';
import { ModelSelectorDropdown } from '../model-selector/ModelSelectorDropdown';
import { hasVariables, interpolate } from '../../lib/variable-syntax';
import { modelInfoToAIModel } from '../../lib/model-type-bridge';
import { BrainCanvas } from './BrainCanvas/BrainCanvas';
import { MemoryStream } from './MemoryStream/MemoryStream';
import { AffectFeedback } from './AffectFeedback/AffectFeedback';
import type { FileObject, FileUpload, Memory, ToolConfig, MessageInput, ModelInfo } from '../../types';
import type { AIModel } from '../model-selector/types';
import type { MemoryResult } from '../../types/memory';
import type { BrainActivity } from './BrainCanvas/useBrainActivity';

// =============================================================================
// TYPES
// =============================================================================

export interface InputHubProps {
  chatId: string | null;
  onSend: (input: MessageInput) => void;
  models: ModelInfo[];
  selectedModels: ModelInfo[];
  onModelsChange: (models: ModelInfo[]) => void;
  attachments: FileObject[];
  uploads: FileUpload[];
  onAttach: (files: File[]) => void;
  onRemoveAttachment: (id: string) => void;
  onCancelUpload: (index: number) => void;
  memories: Memory[];
  onAddMemory: (memory: MemoryResult) => void;
  onRemoveMemory: (id: string) => void;
  tools: ToolConfig[];
  onToolToggle: (toolId: string, enabled: boolean) => void;
  tokenEstimate: number;
  tokenTotal: number;
  tokenLimit: number;
  isLoading?: boolean;
  disabled?: boolean;
  moodEnabled?: boolean;
  variablesEnabled?: boolean;
  variableMode?: 'live' | 'runtime';
  initialContent?: string;
  onContentChange?: (content: string) => void;
  /** Last message ID for affect feedback */
  lastAssistantMessageId?: string;
  className?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function InputHub({
  chatId,
  onSend,
  models,
  selectedModels,
  onModelsChange,
  attachments,
  uploads,
  onAttach,
  onRemoveAttachment,
  onCancelUpload,
  memories,
  onAddMemory,
  onRemoveMemory,
  tools,
  onToolToggle,
  tokenEstimate,
  tokenTotal,
  tokenLimit,
  isLoading = false,
  disabled = false,
  moodEnabled = false,
  variablesEnabled = true,
  variableMode = 'live',
  initialContent = '',
  onContentChange,
  lastAssistantMessageId,
  className,
}: InputHubProps) {
  const [value, setValue] = useState(initialContent);
  const [isDragging, setIsDragging] = useState(false);
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [resolvedVariables, setResolvedVariables] = useState<Record<string, string>>({});
  const [pendingPaste, setPendingPaste] = useState<{ text: string; cursorPos: number } | null>(null);
  const [brainActivity, setBrainActivity] = useState<BrainActivity>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync with initialContent
  useEffect(() => {
    if (initialContent !== value) {
      setValue(initialContent);
    }
  }, [initialContent]);

  // Update brain activity based on typing
  useEffect(() => {
    if (value.length > 0 && !isLoading) {
      setBrainActivity('typing');
    } else if (isLoading) {
      setBrainActivity('memory_retrieve');
    } else {
      setBrainActivity('idle');
    }
  }, [value, isLoading]);

  const canSend = value.trim().length > 0 && selectedModels.length > 0 && !disabled && !isLoading;

  // Handle input change
  const handleInputChange = useCallback((newValue: string) => {
    setValue(newValue);
    onContentChange?.(newValue);

    if (newValue === '+' && value === '') {
      setShowModelSelector(true);
    } else if (newValue.length > 1) {
      setShowModelSelector(false);
    }
  }, [value, onContentChange]);

  // Model selection
  const availableAIModels: AIModel[] = models.map(modelInfoToAIModel);
  const selectedAIModelIds = selectedModels.map(m => m.id);

  const handleModelsSelect = useCallback((modelIds: string[]) => {
    const selected = models.filter(m => modelIds.includes(m.id));
    onModelsChange(selected);
  }, [models, onModelsChange]);

  // Variables
  const handleVariablesResolved = useCallback((values: Record<string, string>) => {
    setResolvedVariables(values);
  }, []);

  // Send
  const handleSend = useCallback(() => {
    if (!canSend) return;

    let content = value.trim();
    if (variablesEnabled && hasVariables(content) && Object.keys(resolvedVariables).length > 0) {
      content = interpolate(content, resolvedVariables);
    }

    onSend({
      content,
      models: selectedModels.map((m) => m.id),
      tools: tools.filter((t) => t.enabled).map((t) => t.id),
      memoryIds: memories.map((m) => m.id),
    });

    setValue('');
    setResolvedVariables({});
  }, [canSend, value, selectedModels, tools, memories, onSend, variablesEnabled, resolvedVariables]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  // Paste handling
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const files = Array.from(e.clipboardData.files);
    if (files.length > 0) {
      e.preventDefault();
      onAttach(files);
      return;
    }

    if (variablesEnabled) {
      const pastedText = e.clipboardData.getData('text');
      if (pastedText && hasVariables(pastedText)) {
        e.preventDefault();
        const cursorPos = e.currentTarget.selectionStart || value.length;
        setPendingPaste({ text: pastedText, cursorPos });
        return;
      }
    }
  };

  const handlePasteConfirm = useCallback((processVariables: boolean) => {
    if (!pendingPaste) return;

    const { text, cursorPos } = pendingPaste;

    if (processVariables) {
      const newValue = value.slice(0, cursorPos) + text + value.slice(cursorPos);
      setValue(newValue);
    } else {
      const escapedText = text.replace(/\{\{/g, '{ {').replace(/\}\}/g, '} }');
      const newValue = value.slice(0, cursorPos) + escapedText + value.slice(cursorPos);
      setValue(newValue);
    }

    setPendingPaste(null);
  }, [pendingPaste, value]);

  const handlePasteCancel = useCallback(() => {
    setPendingPaste(null);
  }, []);

  // Drag and drop
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onAttach(files);
    }
  };

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onAttach(Array.from(e.target.files));
    }
    e.target.value = '';
  };

  // Memory injection from stream
  const handleMemorySelect = useCallback((memory: MemoryResult) => {
    setBrainActivity('memory_retrieve');
    // Convert MemoryResult to Memory format and add
    onAddMemory(memory);
    // Reset activity after short delay
    setTimeout(() => setBrainActivity('idle'), 500);
  }, [onAddMemory]);

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'relative border-t border-[var(--color-border)]',
        'bg-[var(--color-bg)]',
        className
      )}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-10 bg-[var(--color-accent-subtle)] border-2 border-dashed border-[var(--color-accent)] rounded-[var(--radius-lg)] flex items-center justify-center">
          <p className="text-[var(--color-accent)] font-medium">
            Drop files here
          </p>
        </div>
      )}

      {/* Two-column layout */}
      <div className="flex gap-4 p-4">
        {/* Left Column: Brain + Memory Stream */}
        <div className="w-[200px] flex-shrink-0 flex flex-col gap-3">
          {/* Brain Canvas */}
          <div className="flex flex-col items-center">
            <BrainCanvas
              activity={brainActivity}
              size={120}
            />
            <span className="text-[10px] text-[var(--color-text-tertiary)] uppercase tracking-wider mt-1">
              {brainActivity === 'idle' ? 'Ready' :
               brainActivity === 'typing' ? 'Listening' :
               brainActivity === 'memory_retrieve' ? 'Recalling' :
               brainActivity === 'memory_write' ? 'Storing' :
               'Processing'}
            </span>
          </div>

          {/* Memory Stream */}
          <MemoryStream
            chatId={chatId}
            query={value}
            onSelect={handleMemorySelect}
            attachedMemoryIds={memories.map(m => m.id)}
          />
        </div>

        {/* Right Column: Input Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Attachments */}
          {(attachments.length > 0 || uploads.length > 0) && (
            <div className="mb-2">
              <AttachmentTray
                files={attachments}
                uploads={uploads}
                onRemove={onRemoveAttachment}
                onCancelUpload={onCancelUpload}
              />
            </div>
          )}

          {/* Selected models */}
          {selectedModels.length > 0 && (
            <div className="mb-2">
              <ChipList
                items={selectedModels.map((m) => ({
                  id: m.id,
                  label: m.name,
                  color: '#2563eb',
                }))}
                onRemove={(id) => {
                  onModelsChange(selectedModels.filter((m) => m.id !== id));
                }}
              />
            </div>
          )}

          {/* Attached memories */}
          {memories.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {memories.map((memory) => (
                <MemoryChip
                  key={memory.id}
                  memory={memory}
                  onRemove={() => onRemoveMemory(memory.id)}
                />
              ))}
            </div>
          )}

          {/* Model selector */}
          {showModelSelector && (
            <div className="mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-[var(--color-text-secondary)]">Select models:</span>
                <ModelSelectorDropdown
                  models={availableAIModels}
                  selectedModelIds={selectedAIModelIds}
                  onSelect={handleModelsSelect}
                  multiSelect
                  placeholder="Search models..."
                />
                <button
                  onClick={() => setShowModelSelector(false)}
                  className="px-2 py-1 text-sm bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-tertiary)] rounded transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          )}

          {/* Text input */}
          <div className="flex-1">
            <AutoTextArea
              value={value}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder="Type a message... (⌘↵ to send)"
              disabled={disabled}
              autoFocus
            />
          </div>

          {/* Variable blocks */}
          {variablesEnabled && variableMode === 'live' && (
            <VariableBlocksContainer
              inputText={value}
              onVariablesResolved={handleVariablesResolved}
              livePreviewEnabled={true}
            />
          )}

          {/* Footer with controls */}
          <div className="flex items-center justify-between mt-2">
            <InputFooter
              onAttach={handleAttachClick}
              tools={tools}
              onToolToggle={onToolToggle}
              tokenEstimate={tokenEstimate}
              tokenTotal={tokenTotal}
              tokenLimit={tokenLimit}
              onSend={handleSend}
              canSend={canSend}
              isLoading={isLoading}
              selectedModels={selectedModels}
              onOpenModelSelector={() => setShowModelSelector(true)}
            />

            {/* Affect Feedback */}
            {lastAssistantMessageId && chatId && (
              <AffectFeedback
                chatId={chatId}
                messageId={lastAssistantMessageId}
              />
            )}
          </div>
        </div>
      </div>

      {/* Paste confirmation dialog */}
      <PasteVariableConfirmDialog
        isOpen={!!pendingPaste}
        pastedText={pendingPaste?.text || ''}
        onConfirm={handlePasteConfirm}
        onCancel={handlePasteCancel}
      />
    </div>
  );
}
