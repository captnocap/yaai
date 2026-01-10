/**
 * PreviewViewPane - Renders HTML/React code in a sandboxed iframe
 */

import React, { useMemo, useState, useCallback, useRef } from 'react';
import { RefreshCw, ExternalLink, Code2, Maximize2, Minimize2 } from 'lucide-react';
import { usePreviewContent } from '../../lib/preview-store';
import { createHTMLPreview, createReactPreviewHTML } from '../../lib/preview-utils';
import { IconButton } from '../atoms/IconButton';
import { cn } from '../../lib';

export interface PreviewViewPaneProps {
  previewId: string | null;
  className?: string;
}

export function PreviewViewPane({ previewId, className }: PreviewViewPaneProps) {
  const content = usePreviewContent(previewId);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showSource, setShowSource] = useState(false);

  // Generate the HTML to render in the iframe
  const srcDoc = useMemo(() => {
    if (!content) return undefined;

    if (content.type === 'react') {
      return createReactPreviewHTML(content.code);
    } else {
      return createHTMLPreview(content.code);
    }
  }, [content, refreshKey]);

  // Refresh the preview
  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  // Open in new window
  const handleOpenExternal = useCallback(() => {
    if (!srcDoc) return;

    const blob = new Blob([srcDoc], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');

    // Clean up blob URL after a delay
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [srcDoc]);

  // Toggle source view
  const handleToggleSource = useCallback(() => {
    setShowSource((v) => !v);
  }, []);

  // Empty state
  if (!content) {
    return (
      <div
        className={cn(
          'h-full flex items-center justify-center text-[var(--color-text-tertiary)]',
          className
        )}
      >
        No preview content
      </div>
    );
  }

  return (
    <div
      className={cn('h-full flex flex-col bg-[var(--color-bg)]', className)}
    >
      {/* Header */}
      <header className="flex items-center justify-between px-3 py-2 border-b border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
        <div className="flex items-center gap-2">
          {/* Type badge */}
          <span
            className={cn(
              'px-2 py-0.5 rounded text-[11px] font-semibold uppercase',
              content.type === 'react'
                ? 'bg-[#61dafb20] text-[#61dafb]'
                : 'bg-[#e34c2620] text-[#e34c26]'
            )}
          >
            {content.type}
          </span>
          {/* Title */}
          <span className="text-[13px] text-[var(--color-text-secondary)] truncate max-w-[200px]">
            {content.title || 'Preview'}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <IconButton
            icon={<Code2 size={14} />}
            size="sm"
            variant="ghost"
            tooltip={showSource ? 'Hide source' : 'View source'}
            onClick={handleToggleSource}
            active={showSource}
          />
          <IconButton
            icon={<RefreshCw size={14} />}
            size="sm"
            variant="ghost"
            tooltip="Refresh preview"
            onClick={handleRefresh}
          />
          <IconButton
            icon={<ExternalLink size={14} />}
            size="sm"
            variant="ghost"
            tooltip="Open in new window"
            onClick={handleOpenExternal}
          />
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-hidden relative">
        {showSource ? (
          /* Source code view */
          <div className="h-full overflow-auto p-4 bg-[#0d1117]">
            <pre className="text-[13px] font-mono text-[#e6edf3] whitespace-pre-wrap">
              {content.code}
            </pre>
          </div>
        ) : (
          /* Preview iframe */
          <iframe
            ref={iframeRef}
            key={refreshKey}
            srcDoc={srcDoc}
            sandbox="allow-scripts"
            className="w-full h-full border-none bg-[#0a0a0a]"
            title={`Preview: ${content.title || content.type}`}
          />
        )}
      </div>
    </div>
  );
}
