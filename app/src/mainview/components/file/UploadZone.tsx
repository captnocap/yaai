import React, { useCallback, useState, useRef } from 'react';
import { Upload, FileUp } from 'lucide-react';
import { cn } from '../../lib';

export interface UploadZoneProps {
  onFiles: (files: File[]) => void;
  accept?: string[];
  maxSize?: number;
  multiple?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export function UploadZone({
  onFiles,
  accept,
  maxSize,
  multiple = true,
  children,
  className,
}: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const validateFiles = useCallback(
    (files: FileList): File[] => {
      const valid: File[] = [];

      for (const file of Array.from(files)) {
        // Check MIME type
        if (accept && accept.length > 0) {
          const matches = accept.some((type) => {
            if (type.endsWith('/*')) {
              return file.type.startsWith(type.slice(0, -1));
            }
            return file.type === type;
          });
          if (!matches) continue;
        }

        // Check size
        if (maxSize && file.size > maxSize) {
          continue;
        }

        valid.push(file);
      }

      return multiple ? valid : valid.slice(0, 1);
    },
    [accept, maxSize, multiple]
  );

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    if (e.dataTransfer.files.length > 0) {
      const files = validateFiles(e.dataTransfer.files);
      if (files.length > 0) {
        onFiles(files);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = validateFiles(e.target.files);
      if (files.length > 0) {
        onFiles(files);
      }
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={cn(
        'relative flex flex-col items-center justify-center p-6',
        'rounded-[var(--radius-lg)] border-2 border-dashed',
        'transition-colors cursor-pointer',
        'focus-ring',
        isDragging
          ? 'border-[var(--color-accent)] bg-[var(--color-accent-subtle)]'
          : 'border-[var(--color-border)] hover:border-[var(--color-text-tertiary)] bg-[var(--color-bg-secondary)]',
        className
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept?.join(',')}
        multiple={multiple}
        onChange={handleInputChange}
        className="hidden"
      />

      {children || (
        <>
          <div
            className={cn(
              'mb-3 p-3 rounded-full',
              'bg-[var(--color-bg-tertiary)]',
              isDragging && 'bg-[var(--color-accent)] text-white animate-scale-bounce'
            )}
          >
            {isDragging ? (
              <FileUp className="h-6 w-6" />
            ) : (
              <Upload className="h-6 w-6 text-[var(--color-text-tertiary)]" />
            )}
          </div>
          <p className="text-sm text-[var(--color-text-secondary)] text-center">
            {isDragging ? (
              'Drop files here'
            ) : (
              <>
                <span className="font-medium text-[var(--color-accent)]">
                  Click to upload
                </span>{' '}
                or drag and drop
              </>
            )}
          </p>
          {accept && (
            <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
              {accept.map((t) => t.replace('/*', '')).join(', ')}
            </p>
          )}
        </>
      )}
    </div>
  );
}
