import React, { useState } from 'react';
import { cn } from '../../lib';
import { FileIcon } from './FileIcon';
import { Spinner } from '../atoms';

const sizes = {
  sm: 'h-10 w-10',
  md: 'h-16 w-16',
  lg: 'h-[120px] w-[120px]',
} as const;

export interface FileThumbnailProps {
  file: {
    type: string;
    url?: string;
    name: string;
  };
  size?: keyof typeof sizes;
  className?: string;
}

export function FileThumbnail({
  file,
  size = 'md',
  className,
}: FileThumbnailProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');
  const canPreview = (isImage || isVideo) && file.url && !error;

  return (
    <div
      className={cn(
        'relative flex items-center justify-center rounded-[var(--radius-md)]',
        'bg-[var(--color-bg-tertiary)] overflow-hidden',
        sizes[size],
        className
      )}
    >
      {canPreview ? (
        <>
          {!loaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Spinner size="sm" />
            </div>
          )}
          {isImage && (
            <img
              src={file.url}
              alt={file.name}
              className={cn(
                'h-full w-full object-cover',
                'transition-opacity',
                loaded ? 'opacity-100' : 'opacity-0'
              )}
              onLoad={() => setLoaded(true)}
              onError={() => setError(true)}
            />
          )}
          {isVideo && (
            <video
              src={file.url}
              className={cn(
                'h-full w-full object-cover',
                'transition-opacity',
                loaded ? 'opacity-100' : 'opacity-0'
              )}
              onLoadedData={() => setLoaded(true)}
              onError={() => setError(true)}
              muted
            />
          )}
        </>
      ) : (
        <FileIcon
          type={file.type || file.name}
          size={size === 'lg' ? 'lg' : 'md'}
        />
      )}
    </div>
  );
}
