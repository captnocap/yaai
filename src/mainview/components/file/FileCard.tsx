import React from 'react';
import { X, Download, ExternalLink } from 'lucide-react';
import { cn } from '../../lib';
import { IconButton } from '../atoms';
import { FileThumbnail } from './FileThumbnail';
import { FileInfo } from './FileInfo';
import type { FileObject } from '../../types';

export interface FileCardProps {
  file: FileObject;
  onRemove?: () => void;
  onClick?: () => void;
  showActions?: boolean;
  compact?: boolean;
  className?: string;
}

export function FileCard({
  file,
  onRemove,
  onClick,
  showActions = true,
  compact = false,
  className,
}: FileCardProps) {
  if (compact) {
    return (
      <div
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onClick={onClick}
        onKeyDown={(e) => {
          if (onClick && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onClick();
          }
        }}
        className={cn(
          'group relative flex items-center gap-2 p-2 rounded-[var(--radius-md)]',
          'bg-[var(--color-bg-secondary)] border border-[var(--color-border)]',
          'transition-colors',
          onClick && 'cursor-pointer hover:bg-[var(--color-bg-tertiary)]',
          className
        )}
      >
        <FileThumbnail file={file} size="sm" />
        <FileInfo
          name={file.name}
          size={file.size}
          type={file.type}
          className="flex-1"
        />
        {onRemove && (
          <IconButton
            icon={<X />}
            onClick={(e) => {
              e?.stopPropagation();
              onRemove();
            }}
            size="sm"
            variant="ghost"
            tooltip="Remove"
            className="opacity-0 group-hover:opacity-100"
          />
        )}
      </div>
    );
  }

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        'group relative flex flex-col rounded-[var(--radius-lg)] overflow-hidden',
        'bg-[var(--color-bg-secondary)] border border-[var(--color-border)]',
        'transition-all',
        onClick && 'cursor-pointer hover:border-[var(--color-accent)] hover:shadow-md',
        className
      )}
    >
      {/* Thumbnail */}
      <div className="relative aspect-square bg-[var(--color-bg-tertiary)]">
        <FileThumbnail
          file={file}
          size="lg"
          className="absolute inset-0 h-full w-full rounded-none"
        />

        {/* Hover overlay with actions */}
        {showActions && (
          <div
            className={cn(
              'absolute inset-0 flex items-center justify-center gap-2',
              'bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity'
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <IconButton
              icon={<ExternalLink />}
              onClick={() => window.open(file.url, '_blank')}
              variant="filled"
              size="sm"
              tooltip="Open"
              className="bg-white/90 text-gray-900 hover:bg-white"
            />
            <IconButton
              icon={<Download />}
              onClick={() => {
                const a = document.createElement('a');
                a.href = file.url;
                a.download = file.name;
                a.click();
              }}
              variant="filled"
              size="sm"
              tooltip="Download"
              className="bg-white/90 text-gray-900 hover:bg-white"
            />
          </div>
        )}

        {/* Remove button */}
        {onRemove && (
          <IconButton
            icon={<X />}
            onClick={(e) => {
              e?.stopPropagation();
              onRemove();
            }}
            size="sm"
            variant="filled"
            tooltip="Remove"
            className={cn(
              'absolute top-2 right-2',
              'bg-black/60 text-white hover:bg-black/80',
              'opacity-0 group-hover:opacity-100 transition-opacity'
            )}
          />
        )}
      </div>

      {/* File info */}
      <div className="p-3">
        <FileInfo
          name={file.name}
          size={file.size}
          type={file.type}
        />
      </div>
    </div>
  );
}
