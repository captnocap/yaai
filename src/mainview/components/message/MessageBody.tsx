import React from 'react';
import { cn } from '../../lib';
import { MarkdownBlock, CodeBlock } from '../text';
import type { MessageContent, ContentType } from '../../types';
import type { TextRule } from '../../types/effects';

export interface MessageBodyProps {
  content: MessageContent[];
  isStreaming?: boolean;
  /** Optional text effect rules from mood system */
  textRules?: TextRule[];
  /** Whether text effects are enabled */
  effectsEnabled?: boolean;
  className?: string;
}

interface ContentRendererProps {
  item: MessageContent;
  textRules?: TextRule[];
  effectsEnabled?: boolean;
}

function ContentRenderer({ item, textRules, effectsEnabled }: ContentRendererProps) {
  switch (item.type) {
    case 'text':
      return (
        <MarkdownBlock
          content={item.value}
          textRules={textRules}
          effectsEnabled={effectsEnabled}
        />
      );

    case 'code':
      return (
        <CodeBlock
          code={item.value}
          language={item.language}
          showLineNumbers
        />
      );

    case 'html':
      // TODO: Implement HTMLSandbox
      return (
        <div className="p-4 bg-[var(--color-bg-tertiary)] rounded-[var(--radius-md)]">
          <p className="text-sm text-[var(--color-text-secondary)]">
            [HTML content - sandbox pending]
          </p>
        </div>
      );

    case 'react':
      // TODO: Implement ReactPreview
      return (
        <div className="p-4 bg-[var(--color-bg-tertiary)] rounded-[var(--radius-md)]">
          <p className="text-sm text-[var(--color-text-secondary)]">
            [React component - preview pending]
          </p>
          <CodeBlock code={item.value} language="tsx" />
        </div>
      );

    case 'csv':
      // TODO: Implement CSVTable
      return (
        <div className="p-4 bg-[var(--color-bg-tertiary)] rounded-[var(--radius-md)] overflow-x-auto">
          <pre className="text-sm font-mono">{item.value}</pre>
        </div>
      );

    case 'image':
      return (
        <img
          src={item.value}
          alt=""
          className="max-w-full rounded-[var(--radius-lg)]"
        />
      );

    case 'video':
      return (
        <video
          src={item.value}
          controls
          className="max-w-full rounded-[var(--radius-lg)]"
        />
      );

    default:
      return (
        <MarkdownBlock
          content={item.value}
          textRules={textRules}
          effectsEnabled={effectsEnabled}
        />
      );
  }
}

export function MessageBody({
  content,
  isStreaming = false,
  textRules = [],
  effectsEnabled = false,
  className,
}: MessageBodyProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {content.map((item, index) => (
        <div key={index} className="animate-fade-in">
          <ContentRenderer
            item={item}
            textRules={textRules}
            effectsEnabled={effectsEnabled}
          />
        </div>
      ))}

      {/* Streaming cursor */}
      {isStreaming && (
        <span className="inline-block w-2 h-4 bg-[var(--color-accent)] animate-blink" />
      )}
    </div>
  );
}
