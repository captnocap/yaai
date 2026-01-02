import React, { useState } from 'react';
import { Check, Copy, FileCode } from 'lucide-react';
import { cn } from '../../lib';
import { IconButton } from '../atoms';

export interface CodeBlockProps {
  code: string;
  language?: string;
  showLineNumbers?: boolean;
  highlightLines?: number[];
  maxHeight?: number;
  filename?: string;
  className?: string;
}

export function CodeBlock({
  code,
  language,
  showLineNumbers = false,
  highlightLines = [],
  maxHeight,
  filename,
  className,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = code.split('\n');

  return (
    <div
      className={cn(
        'relative group rounded-[var(--radius-lg)] overflow-hidden',
        'bg-[#1e1e1e] text-[#d4d4d4]',
        'border border-[var(--color-border)]',
        className
      )}
    >
      {/* Header with filename and copy button */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#333]">
        <div className="flex items-center gap-2 text-sm text-[#888]">
          <FileCode className="h-4 w-4" />
          {filename || language || 'code'}
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <IconButton
            icon={copied ? <Check className="text-green-500" /> : <Copy />}
            onClick={handleCopy}
            size="sm"
            variant="ghost"
            tooltip={copied ? 'Copied!' : 'Copy code'}
            className="text-[#888] hover:text-white hover:bg-[#333]"
          />
        </div>
      </div>

      {/* Code content */}
      <div
        className={cn(
          'overflow-auto custom-scrollbar',
          maxHeight && `max-h-[${maxHeight}px]`
        )}
        style={maxHeight ? { maxHeight } : undefined}
      >
        <pre className="p-4 text-sm leading-relaxed">
          <code className="font-mono">
            {lines.map((line, i) => (
              <div
                key={i}
                className={cn(
                  'flex',
                  highlightLines.includes(i + 1) && 'bg-yellow-500/10 -mx-4 px-4'
                )}
              >
                {showLineNumbers && (
                  <span className="select-none pr-4 text-[#666] text-right w-12 shrink-0">
                    {i + 1}
                  </span>
                )}
                <span className="flex-1 whitespace-pre-wrap break-words">
                  {line || ' '}
                </span>
              </div>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
}
