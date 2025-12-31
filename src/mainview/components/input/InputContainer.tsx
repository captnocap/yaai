import React, { useState, useCallback, useRef } from 'react';
import { cn } from '../../lib';
import { ChipList, MemoryChip } from '../molecules';
import { AutoTextArea } from './AutoTextArea';
import { AttachmentTray } from './AttachmentTray';
import { InputFooter } from './InputFooter';
import { UploadZone } from '../file';
import type { FileObject, FileUpload, Memory, ToolConfig, MessageInput, ModelInfo } from '../../types';

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
  className,
}: InputContainerProps) {
  const [value, setValue] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canSend = value.trim().length > 0 && selectedModels.length > 0 && !disabled && !isLoading;

  const handleSend = useCallback(() => {
    if (!canSend) return;

    onSend({
      content: value.trim(),
      models: selectedModels.map((m) => m.id),
      tools: tools.filter((t) => t.enabled).map((t) => t.id),
      memoryIds: memories.map((m) => m.id),
    });

    setValue('');
  }, [canSend, value, selectedModels, tools, memories, onSend]);

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

        {/* Text input */}
        <AutoTextArea
          value={value}
          onChange={setValue}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder="Type a message... (⌘↵ to send)"
          disabled={disabled}
          autoFocus
        />

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
        />
      </div>
    </div>
  );
}
