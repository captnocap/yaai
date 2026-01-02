import React from 'react';
import { X, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { cn, formatBytes } from '../../lib';
import { IconButton, ProgressRing } from '../atoms';
import { FileIcon } from './FileIcon';

export interface UploadProgressProps {
  file: File;
  progress: number;
  status: 'uploading' | 'processing' | 'complete' | 'error';
  error?: string;
  onCancel?: () => void;
  className?: string;
}

export function UploadProgress({
  file,
  progress,
  status,
  error,
  onCancel,
  className,
}: UploadProgressProps) {
  const statusConfig = {
    uploading: {
      icon: <ProgressRing value={progress} size="sm" />,
      text: `Uploading... ${progress}%`,
      color: 'text-[var(--color-accent)]',
    },
    processing: {
      icon: <Loader2 className="h-5 w-5 animate-spin" />,
      text: 'Processing...',
      color: 'text-[var(--color-accent)]',
    },
    complete: {
      icon: <CheckCircle className="h-5 w-5" />,
      text: 'Complete',
      color: 'text-[var(--color-success)]',
    },
    error: {
      icon: <AlertCircle className="h-5 w-5" />,
      text: error || 'Upload failed',
      color: 'text-[var(--color-error)]',
    },
  };

  const config = statusConfig[status];

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-[var(--radius-md)]',
        'bg-[var(--color-bg-secondary)] border border-[var(--color-border)]',
        status === 'error' && 'border-[var(--color-error)]/30 bg-[var(--color-error-subtle)]',
        className
      )}
    >
      {/* File icon */}
      <div className="shrink-0">
        <FileIcon type={file.type || file.name} size="md" />
      </div>

      {/* File info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--color-text)] truncate">
          {file.name}
        </p>
        <p className={cn('text-xs', config.color)}>
          {config.text}
        </p>
      </div>

      {/* Size */}
      <span className="text-xs text-[var(--color-text-tertiary)] shrink-0">
        {formatBytes(file.size)}
      </span>

      {/* Status icon or cancel */}
      <div className={cn('shrink-0', config.color)}>
        {status === 'uploading' && onCancel ? (
          <IconButton
            icon={<X />}
            onClick={onCancel}
            size="sm"
            variant="ghost"
            tooltip="Cancel"
          />
        ) : (
          config.icon
        )}
      </div>

      {/* Progress bar for uploading state */}
      {status === 'uploading' && (
        <div
          className={cn(
            'absolute bottom-0 left-0 right-0 h-0.5',
            'bg-[var(--color-border)] rounded-b-[var(--radius-md)] overflow-hidden'
          )}
        >
          <div
            className="h-full bg-[var(--color-accent)] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}
