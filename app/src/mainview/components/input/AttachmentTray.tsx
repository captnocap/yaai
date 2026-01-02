import React from 'react';
import { Plus } from 'lucide-react';
import { cn } from '../../lib';
import { IconButton } from '../atoms';
import { FileCard, UploadProgress } from '../file';
import type { FileObject, FileUpload } from '../../types';

export interface AttachmentTrayProps {
  files: FileObject[];
  uploads?: FileUpload[];
  onRemove?: (id: string) => void;
  onAdd?: () => void;
  onCancelUpload?: (index: number) => void;
  onClick?: (file: FileObject) => void;
  className?: string;
}

export function AttachmentTray({
  files,
  uploads = [],
  onRemove,
  onAdd,
  onCancelUpload,
  onClick,
  className,
}: AttachmentTrayProps) {
  if (files.length === 0 && uploads.length === 0 && !onAdd) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex items-start gap-2 overflow-x-auto pb-2',
        'custom-scrollbar',
        className
      )}
    >
      {/* Completed files */}
      {files.map((file, index) => (
        <div
          key={file.id}
          className="shrink-0 w-[200px] animate-slide-in-right"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <FileCard
            file={file}
            compact
            onRemove={onRemove ? () => onRemove(file.id) : undefined}
            onClick={onClick ? () => onClick(file) : undefined}
          />
        </div>
      ))}

      {/* Uploading files */}
      {uploads.map((upload, index) => (
        <div
          key={index}
          className="shrink-0 w-[200px] animate-slide-in-right"
        >
          <UploadProgress
            file={upload.file}
            progress={upload.progress}
            status={upload.status}
            error={upload.error}
            onCancel={
              onCancelUpload && upload.status === 'uploading'
                ? () => onCancelUpload(index)
                : undefined
            }
          />
        </div>
      ))}

      {/* Add button */}
      {onAdd && (
        <div className="shrink-0">
          <IconButton
            icon={<Plus />}
            onClick={onAdd}
            size="md"
            variant="outline"
            tooltip="Add attachment"
            className="h-[52px] w-[52px] rounded-[var(--radius-md)]"
          />
        </div>
      )}
    </div>
  );
}
