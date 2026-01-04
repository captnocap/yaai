import React, { useState, useCallback, useRef } from 'react';
import { Plus } from 'lucide-react';
import { cn } from '../../lib';
import { ChipList, MemoryChip } from '../molecules';
import { AutoTextArea } from './AutoTextArea';
import { AttachmentTray } from './AttachmentTray';
import { InputFooter } from './InputFooter';
import { VariableBlocksContainer } from './VariableBlocksContainer';
import { UploadZone } from '../file';
import { ModelSelectorDropdown } from '../model-selector/ModelSelectorDropdown';
import { hasVariables, interpolate } from '../../lib/variable-syntax';
import type { FileObject, FileUpload, Memory, ToolConfig, MessageInput, ModelInfo } from '../../types';
import type { AIModel } from '../model-selector/types';
import { modelInfoToAIModel, aiModelToConfig } from '../../lib/model-type-bridge';

export interface InputContainerProps {
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
  onRemoveMemory: (id: string) => void;
  tools: ToolConfig[];
  onToolToggle: (toolId: string, enabled: boolean) => void;
  tokenEstimate: number;
  tokenTotal: number;
  tokenLimit: number;
  isLoading?: boolean;
  disabled?: boolean;
  /** Whether mood effects are enabled */
  moodEnabled?: boolean;
  /** Whether variable expansion is enabled */
  variablesEnabled?: boolean;
  /** Variable expansion mode: 'live' shows preview, 'runtime' expands on send */
  variableMode?: 'live' | 'runtime';
  className?: string;
}

export function InputContainer({
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
  className,
}: InputContainerProps) {
  const [value, setValue] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [resolvedVariables, setResolvedVariables] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canSend = value.trim().length > 0 && selectedModels.length > 0 && !disabled && !isLoading;

  // Handle + trigger for model selection
  const handleInputChange = useCallback((newValue: string) => {
    // If user types + at the start and input was empty, open model selector
    if (newValue === '+' && value === '') {
      setShowModelSelector(true);
      return; // Don't add + to input
    }
    setValue(newValue);
  }, [value]);

  // Convert ModelInfo to AIModel for dropdown
  const availableAIModels: AIModel[] = models.map(modelInfoToAIModel);
  const selectedAIModelIds = selectedModels.map(m => m.id);

  // Handle model selection from dropdown
  const handleModelsSelect = useCallback((modelIds: string[]) => {
    const selected = models.filter(m => modelIds.includes(m.id));
    onModelsChange(selected);
  }, [models, onModelsChange]);

  // Handle resolved variables from VariableBlocksContainer
  const handleVariablesResolved = useCallback((values: Record<string, string>) => {
    setResolvedVariables(values);
  }, []);

  const handleSend = useCallback(() => {
    if (!canSend) return;

    // Interpolate variables if enabled and we have resolved values
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
    // Cmd/Ctrl + Enter to send
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const files = Array.from(e.clipboardData.files);
    if (files.length > 0) {
      e.preventDefault();
      onAttach(files);
    }
  };

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

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'relative border-t border-[var(--color-border)]',
        'bg-[var(--color-bg)]',
        'mood-input-area', // Mood effect hook
        className
      )}
      data-mood-enabled={moodEnabled}
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

      <div className="max-w-3xl mx-auto">
        {/* Attachments */}
        {(attachments.length > 0 || uploads.length > 0) && (
          <div className="px-4 pt-3">
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
          <div className="px-4 pt-3">
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
          <div className="px-4 pt-3 flex flex-wrap gap-2">
            {memories.map((memory) => (
              <MemoryChip
                key={memory.id}
                memory={memory}
                onRemove={() => onRemoveMemory(memory.id)}
              />
            ))}
          </div>
        )}

        {/* Model selector (positioned above input) */}
        {showModelSelector && (
          <div className="px-4 pt-3 mb-3">
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
        <AutoTextArea
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder="Type a message... (⌘↵ to send)"
          disabled={disabled}
          autoFocus
        />

        {/* Variable blocks (live preview mode) */}
        {variablesEnabled && variableMode === 'live' && (
          <VariableBlocksContainer
            inputText={value}
            onVariablesResolved={handleVariablesResolved}
            livePreviewEnabled={true}
          />
        )}

        {/* Footer with actions */}
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
      </div>
    </div>
  );
}
