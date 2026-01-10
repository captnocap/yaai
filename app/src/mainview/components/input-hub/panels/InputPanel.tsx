// =============================================================================
// INPUT PANEL
// =============================================================================
// Core text input panel - extracted from InputHub for grid layout.

import React, { useState, useCallback, useRef } from 'react';
import { cn } from '../../../lib';
import { MinimalPanel } from '../InputHubPanel';
import { AutoTextArea } from '../../input/AutoTextArea';
import { AttachmentTray } from '../../input/AttachmentTray';
import { ChipList, MemoryChip } from '../../molecules';
import { Send, Paperclip, Loader2 } from 'lucide-react';
import type { FileObject, FileUpload, Memory, ModelInfo } from '../../../types';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface InputPanelProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  canSend: boolean;
  isLoading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  // Attachments
  attachments?: FileObject[];
  uploads?: FileUpload[];
  onAttach?: (files: File[]) => void;
  onRemoveAttachment?: (id: string) => void;
  onCancelUpload?: (index: number) => void;
  // Selected models (shown as chips)
  selectedModels?: ModelInfo[];
  onRemoveModel?: (id: string) => void;
  // Attached memories (shown as chips)
  memories?: Memory[];
  onRemoveMemory?: (id: string) => void;
  className?: string;
}

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function InputPanel({
  value,
  onChange,
  onSend,
  canSend,
  isLoading = false,
  disabled = false,
  placeholder = 'Type a message... (⌘↵ to send)',
  attachments = [],
  uploads = [],
  onAttach,
  onRemoveAttachment,
  onCancelUpload,
  selectedModels = [],
  onRemoveModel,
  memories = [],
  onRemoveMemory,
  className,
}: InputPanelProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (canSend) onSend();
      }
    },
    [canSend, onSend]
  );

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
    if (files.length > 0 && onAttach) {
      onAttach(files);
    }
  };

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && onAttach) {
      onAttach(Array.from(e.target.files));
    }
    e.target.value = '';
  };

  return (
    <MinimalPanel panelId="input" className={className}>
      <div
        className={cn(
          'h-full flex flex-col p-2',
          'relative'
        )}
        onDragEnter={handleDragEnter}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
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
          <div className="absolute inset-0 z-10 bg-[var(--color-accent-subtle)] border-2 border-dashed border-[var(--color-accent)] rounded flex items-center justify-center">
            <p className="text-[var(--color-accent)] font-medium text-sm">
              Drop files here
            </p>
          </div>
        )}

        {/* Attachments */}
        {(attachments.length > 0 || uploads.length > 0) && (
          <div className="mb-2 shrink-0">
            <AttachmentTray
              files={attachments}
              uploads={uploads}
              onRemove={onRemoveAttachment}
              onCancelUpload={onCancelUpload}
            />
          </div>
        )}

        {/* Selected models chips */}
        {selectedModels.length > 0 && (
          <div className="mb-2 shrink-0">
            <ChipList
              items={selectedModels.map((m) => ({
                id: m.id,
                label: m.name,
                color: '#2563eb',
              }))}
              onRemove={onRemoveModel}
            />
          </div>
        )}

        {/* Attached memories */}
        {memories.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1 shrink-0">
            {memories.map((memory) => (
              <MemoryChip
                key={memory.id}
                memory={memory}
                onRemove={() => onRemoveMemory?.(memory.id)}
              />
            ))}
          </div>
        )}

        {/* Text input */}
        <div className="flex-1 min-h-0">
          <AutoTextArea
            value={value}
            onChange={onChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            autoFocus
            className="h-full"
          />
        </div>

        {/* Footer with attach and send */}
        <div className="flex items-center justify-between mt-2 shrink-0">
          <button
            onClick={handleAttachClick}
            className={cn(
              'p-1.5 rounded',
              'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]',
              'hover:bg-[var(--color-bg-secondary)]',
              'transition-colors'
            )}
            title="Attach files"
          >
            <Paperclip size={16} />
          </button>

          <button
            onClick={onSend}
            disabled={!canSend || isLoading}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded',
              'text-sm font-medium',
              'transition-all duration-150',
              canSend && !isLoading
                ? 'bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)]'
                : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)] cursor-not-allowed'
            )}
          >
            {isLoading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Sending</span>
              </>
            ) : (
              <>
                <Send size={14} />
                <span>Send</span>
              </>
            )}
          </button>
        </div>
      </div>
    </MinimalPanel>
  );
}
