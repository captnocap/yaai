import React, { useRef, useState, useCallback } from 'react';
import { X, Plus, Image as ImageIcon, Loader2 } from 'lucide-react';
import { cn } from '../../../lib';

export interface SessionAttachment {
  id: string;
  type: 'image' | 'file';
  name: string;
  mimeType: string;
  size: number;
  base64?: string;
  preview?: string; // Data URL for image preview
}

export interface ImageAttachmentTrayProps {
  attachments: SessionAttachment[];
  onAdd: (attachments: SessionAttachment[]) => void;
  onRemove: (id: string) => void;
  maxAttachments?: number;
  maxSizeMB?: number;
  className?: string;
}

// Supported image types
const SUPPORTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

// Format file size
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Generate unique ID
function generateId(): string {
  return `att_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function ImageAttachmentTray({
  attachments,
  onAdd,
  onRemove,
  maxAttachments = 5,
  maxSizeMB = 10,
  className,
}: ImageAttachmentTrayProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Process files into attachments
  const processFiles = useCallback(async (files: FileList | File[]) => {
    setError(null);
    setIsProcessing(true);

    try {
      const fileArray = Array.from(files);
      const maxBytes = maxSizeMB * 1024 * 1024;
      const remainingSlots = maxAttachments - attachments.length;

      if (remainingSlots <= 0) {
        setError(`Maximum ${maxAttachments} attachments allowed`);
        return;
      }

      const newAttachments: SessionAttachment[] = [];

      for (const file of fileArray.slice(0, remainingSlots)) {
        // Validate type
        if (!SUPPORTED_TYPES.includes(file.type)) {
          setError(`Unsupported file type: ${file.type}`);
          continue;
        }

        // Validate size
        if (file.size > maxBytes) {
          setError(`File too large: ${file.name} (max ${maxSizeMB}MB)`);
          continue;
        }

        // Read file as base64
        const base64 = await readFileAsBase64(file);
        const preview = await createThumbnail(file);

        newAttachments.push({
          id: generateId(),
          type: 'image',
          name: file.name,
          mimeType: file.type,
          size: file.size,
          base64,
          preview,
        });
      }

      if (newAttachments.length > 0) {
        onAdd(newAttachments);
      }
    } finally {
      setIsProcessing(false);
    }
  }, [attachments.length, maxAttachments, maxSizeMB, onAdd]);

  // Read file as base64
  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix to get just base64
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Create thumbnail preview
  const createThumbnail = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(reader.result as string);
      };
      reader.readAsDataURL(file);
    });
  };

  // Handle file input change
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle drag events
  const handleDragOver = (e: React.DragEvent) => {
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

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
  };

  // Handle paste
  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const imageFiles: File[] = [];
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) imageFiles.push(file);
      }
    }

    if (imageFiles.length > 0) {
      processFiles(imageFiles);
    }
  }, [processFiles]);

  // Listen for paste events
  React.useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  const canAddMore = attachments.length < maxAttachments;

  return (
    <div className={cn('space-y-2', className)}>
      {/* Attachments preview */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((att) => (
            <div
              key={att.id}
              className={cn(
                'relative group',
                'w-16 h-16 rounded-lg overflow-hidden',
                'border border-[var(--color-border)]',
                'bg-[var(--color-bg-tertiary)]'
              )}
            >
              {/* Preview image */}
              {att.preview && (
                <img
                  src={att.preview}
                  alt={att.name}
                  className="w-full h-full object-cover"
                />
              )}

              {/* Fallback for no preview */}
              {!att.preview && (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="w-6 h-6 text-[var(--color-text-tertiary)]" />
                </div>
              )}

              {/* Remove button */}
              <button
                onClick={() => onRemove(att.id)}
                className={cn(
                  'absolute top-0.5 right-0.5',
                  'w-5 h-5 rounded-full',
                  'bg-black/60 text-white',
                  'flex items-center justify-center',
                  'opacity-0 group-hover:opacity-100',
                  'transition-opacity'
                )}
              >
                <X className="w-3 h-3" />
              </button>

              {/* File info tooltip */}
              <div className={cn(
                'absolute bottom-0 left-0 right-0',
                'px-1 py-0.5',
                'bg-black/60 text-white',
                'text-[10px] truncate',
                'opacity-0 group-hover:opacity-100',
                'transition-opacity'
              )}>
                {formatSize(att.size)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add button / Drop zone */}
      {canAddMore && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'relative flex items-center gap-2',
            isDragging && 'ring-2 ring-[var(--color-accent)] rounded-lg'
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={SUPPORTED_TYPES.join(',')}
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg',
              'text-sm text-[var(--color-text-secondary)]',
              'bg-[var(--color-bg-tertiary)]',
              'border border-[var(--color-border)]',
              'hover:bg-[var(--color-bg-secondary)]',
              'disabled:opacity-50',
              'transition-colors'
            )}
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            <span>Add Image</span>
          </button>

          {/* Drag indicator */}
          {isDragging && (
            <div className={cn(
              'absolute inset-0 rounded-lg',
              'bg-[var(--color-accent)]/10',
              'border-2 border-dashed border-[var(--color-accent)]',
              'flex items-center justify-center',
              'pointer-events-none'
            )}>
              <span className="text-sm text-[var(--color-accent)]">Drop images here</span>
            </div>
          )}
        </div>
      )}

      {/* Error message */}
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}

      {/* Hint */}
      {attachments.length === 0 && !error && (
        <p className="text-xs text-[var(--color-text-tertiary)]">
          Paste, drag & drop, or click to add images
        </p>
      )}
    </div>
  );
}
