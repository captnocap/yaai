import React from 'react';
import { ExternalLink, Globe } from 'lucide-react';
import { cn } from '../../lib';

export interface LinkPreviewProps {
  url: string;
  title?: string;
  favicon?: string;
  description?: string;
  compact?: boolean;
  className?: string;
}

export function LinkPreview({
  url,
  title,
  favicon,
  description,
  compact = true,
  className,
}: LinkPreviewProps) {
  const domain = (() => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url;
    }
  })();

  if (compact) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          'inline-flex items-center gap-1.5 px-2 py-1 rounded-[var(--radius-md)]',
          'bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-border)]',
          'text-sm text-[var(--color-text)] no-underline',
          'transition-colors',
          className
        )}
      >
        {favicon ? (
          <img src={favicon} alt="" className="h-4 w-4 rounded" />
        ) : (
          <Globe className="h-4 w-4 text-[var(--color-text-tertiary)]" />
        )}
        <span className="truncate max-w-[200px]">{title || domain}</span>
        <ExternalLink className="h-3 w-3 text-[var(--color-text-tertiary)] shrink-0" />
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'block p-3 rounded-[var(--radius-lg)]',
        'border border-[var(--color-border)]',
        'bg-[var(--color-bg)] hover:bg-[var(--color-bg-secondary)]',
        'no-underline transition-colors',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 h-10 w-10 rounded-[var(--radius-md)] bg-[var(--color-bg-tertiary)] flex items-center justify-center">
          {favicon ? (
            <img src={favicon} alt="" className="h-6 w-6 rounded" />
          ) : (
            <Globe className="h-5 w-5 text-[var(--color-text-tertiary)]" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-[var(--color-text)] truncate">
              {title || domain}
            </span>
            <ExternalLink className="h-3 w-3 text-[var(--color-text-tertiary)] shrink-0" />
          </div>
          {description && (
            <p className="text-sm text-[var(--color-text-secondary)] line-clamp-2 mt-1">
              {description}
            </p>
          )}
          <span className="text-xs text-[var(--color-text-tertiary)] mt-1 block">
            {domain}
          </span>
        </div>
      </div>
    </a>
  );
}
