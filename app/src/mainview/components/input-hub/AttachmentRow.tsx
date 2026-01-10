// =============================================================================
// ATTACHMENT ROW
// =============================================================================
// Horizontal row of attachment badges for the B2 slot in GridChainHub.
// Shows file badges with hover previews, remove buttons, and count/size summary.

import React, { useState, useRef, useCallback } from 'react';
import { cn } from '../../lib';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface Attachment {
  id: string;
  name: string;
  type: string;       // MIME type
  size: number;       // bytes
  preview?: string;   // data URL for images, text content for text files
}

export interface AttachmentRowProps {
  attachments: Attachment[];
  onRemove: (id: string) => void;
  onAdd?: () => void;
  className?: string;
}

// -----------------------------------------------------------------------------
// UTILS
// -----------------------------------------------------------------------------

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function isImageType(type: string): boolean {
  return type.startsWith('image/');
}

function isTextType(type: string): boolean {
  return (
    type.startsWith('text/') ||
    type === 'application/json' ||
    type === 'application/javascript' ||
    type === 'application/typescript' ||
    type === 'application/xml' ||
    type.includes('yaml') ||
    type.includes('markdown')
  );
}

function getFileIcon(type: string): string {
  if (isImageType(type)) return '🖼';
  if (isTextType(type)) return '📄';
  if (type.includes('pdf')) return '📕';
  if (type.includes('zip') || type.includes('tar') || type.includes('gz')) return '📦';
  if (type.includes('audio')) return '🎵';
  if (type.includes('video')) return '🎬';
  return '📎';
}

// -----------------------------------------------------------------------------
// ATTACHMENT BADGE
// -----------------------------------------------------------------------------

interface AttachmentBadgeProps {
  attachment: Attachment;
  onRemove: () => void;
}

function AttachmentBadge({ attachment, onRemove }: AttachmentBadgeProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [previewPos, setPreviewPos] = useState<{ x: number; y: number } | null>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const handleMouseEnter = useCallback((e: React.MouseEvent) => {
    // Only show preview if we have preview content
    if (!attachment.preview) return;

    // Delay before showing preview
    timeoutRef.current = setTimeout(() => {
      if (badgeRef.current) {
        const rect = badgeRef.current.getBoundingClientRect();
        setPreviewPos({ x: rect.left, y: rect.top });
        setShowPreview(true);
      }
    }, 200);
  }, [attachment.preview]);

  const handleMouseLeave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setShowPreview(false);
  }, []);

  const handleRemove = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove();
  }, [onRemove]);

  const isImage = isImageType(attachment.type);
  const isText = isTextType(attachment.type);
  const icon = getFileIcon(attachment.type);

  // Truncate name for display
  const displayName = attachment.name.length > 12
    ? `${attachment.name.slice(0, 8)}...${attachment.name.slice(-3)}`
    : attachment.name;

  return (
    <>
      <div
        ref={badgeRef}
        className={cn(
          'flex-shrink-0 h-[22px] max-w-[100px]',
          'flex items-center gap-1 px-1.5',
          'bg-white/10 hover:bg-white/15 rounded',
          'border border-white/10 hover:border-white/20',
          'cursor-default transition-all group'
        )}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <span className="text-[10px]">{icon}</span>
        <span className="text-[10px] text-white/70 truncate flex-1" title={attachment.name}>
          {displayName}
        </span>
        <button
          onClick={handleRemove}
          className={cn(
            'w-3 h-3 flex items-center justify-center',
            'text-white/30 hover:text-white/80 hover:bg-white/10 rounded-sm',
            'opacity-0 group-hover:opacity-100 transition-opacity',
            'text-[8px] leading-none'
          )}
          title="Remove"
        >
          ✕
        </button>
      </div>

      {/* Preview popover */}
      {showPreview && previewPos && attachment.preview && (
        <div
          className={cn(
            'fixed z-50 pointer-events-none',
            'bg-black/90 border border-white/20 rounded shadow-xl',
            'max-w-[300px] max-h-[200px] overflow-hidden'
          )}
          style={{
            left: previewPos.x,
            bottom: `calc(100vh - ${previewPos.y}px + 4px)`,
          }}
        >
          {isImage ? (
            <img
              src={attachment.preview}
              alt={attachment.name}
              className="max-w-full max-h-[200px] object-contain"
            />
          ) : isText ? (
            <div className="p-2 max-h-[200px] overflow-auto">
              <pre className="text-[10px] text-white/80 font-mono whitespace-pre-wrap break-all">
                {attachment.preview.slice(0, 500)}
                {attachment.preview.length > 500 && '...'}
              </pre>
            </div>
          ) : null}
          <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-black/80 to-transparent" />
          <div className="absolute bottom-0.5 left-1 text-[8px] text-white/50">
            {attachment.name} · {formatBytes(attachment.size)}
          </div>
        </div>
      )}
    </>
  );
}

// -----------------------------------------------------------------------------
// ATTACHMENT ROW
// -----------------------------------------------------------------------------

export function AttachmentRow({
  attachments,
  onRemove,
  onAdd,
  className,
}: AttachmentRowProps) {
  const totalSize = attachments.reduce((sum, a) => sum + a.size, 0);

  if (attachments.length === 0) {
    return (
      <div className={cn(
        'w-full h-full flex items-center justify-center',
        className
      )}>
        {onAdd ? (
          <button
            onClick={onAdd}
            className="text-[10px] text-white/30 hover:text-white/50 transition-colors"
          >
            + Add attachments
          </button>
        ) : (
          <span className="text-[10px] text-white/20">No attachments</span>
        )}
      </div>
    );
  }

  return (
    <div className={cn('relative w-full h-full', className)}>
      <div
        className={cn(
          'absolute inset-0',
          'flex items-center gap-1 px-1',
          'overflow-x-auto overflow-y-hidden',
          'scrollbar-hide'
        )}
      >
        {/* Count & size summary */}
        <div className="flex-shrink-0 flex items-center gap-1 pr-1 border-r border-white/10">
          <span className="text-[10px] text-white/50 font-mono">
            {attachments.length}
          </span>
          <span className="text-[8px] text-white/30">
            {formatBytes(totalSize)}
          </span>
        </div>

        {/* Attachment badges */}
        {attachments.map((attachment) => (
          <AttachmentBadge
            key={attachment.id}
            attachment={attachment}
            onRemove={() => onRemove(attachment.id)}
          />
        ))}

        {/* Add button */}
        {onAdd && (
          <button
            onClick={onAdd}
            className={cn(
              'flex-shrink-0 w-5 h-5',
              'flex items-center justify-center',
              'text-white/30 hover:text-white/60 hover:bg-white/10',
              'rounded transition-all text-[12px]'
            )}
            title="Add attachment"
          >
            +
          </button>
        )}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// MOCK DATA FOR TESTING
// -----------------------------------------------------------------------------

export const MOCK_ATTACHMENTS: Attachment[] = [
  {
    id: '1',
    name: 'screenshot.png',
    type: 'image/png',
    size: 245000,
    preview: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="%23333" width="100" height="100"/><text x="50" y="50" text-anchor="middle" fill="white" font-size="10">Preview</text></svg>',
  },
  {
    id: '2',
    name: 'config.json',
    type: 'application/json',
    size: 1024,
    preview: '{\n  "name": "my-project",\n  "version": "1.0.0",\n  "dependencies": {\n    "react": "^18.0.0"\n  }\n}',
  },
  {
    id: '3',
    name: 'notes.txt',
    type: 'text/plain',
    size: 512,
    preview: 'This is a sample text file with some notes about the project...',
  },
  {
    id: '4',
    name: 'document.pdf',
    type: 'application/pdf',
    size: 1048576,
  },
  {
    id: '5',
    name: 'verylongfilename_with_details.tsx',
    type: 'text/typescript',
    size: 2048,
    preview: 'import React from "react";\n\nexport function Component() {\n  return <div>Hello</div>;\n}',
  },
];
