import React from 'react';
import { cn, formatBytes } from '../../lib';

export interface FileInfoProps {
  name: string;
  size?: number;
  type?: string;
  truncate?: boolean;
  className?: string;
}

export function FileInfo({
  name,
  size,
  type,
  truncate = true,
  className,
}: FileInfoProps) {
  // Extract extension from name
  const ext = name.split('.').pop()?.toLowerCase();

  // Format MIME type to readable form
  const readableType = (() => {
    if (!type) return ext?.toUpperCase();
    if (type.startsWith('image/')) return type.replace('image/', '').toUpperCase();
    if (type.startsWith('video/')) return type.replace('video/', '').toUpperCase();
    if (type.startsWith('audio/')) return type.replace('audio/', '').toUpperCase();
    if (type === 'application/pdf') return 'PDF';
    if (type === 'application/json') return 'JSON';
    if (type.includes('spreadsheet') || type.includes('excel')) return 'XLSX';
    if (type.includes('zip')) return 'ZIP';
    return ext?.toUpperCase() || 'FILE';
  })();

  const meta = [readableType, size ? formatBytes(size) : null]
    .filter(Boolean)
    .join(' • ');

  return (
    <div className={cn('min-w-0', className)}>
      <p
        className={cn(
          'text-sm font-medium text-[var(--color-text)]',
          truncate && 'truncate'
        )}
        title={name}
      >
        {name}
      </p>
      {meta && (
        <p className="text-xs text-[var(--color-text-tertiary)]">
          {meta}
        </p>
      )}
    </div>
  );
}
