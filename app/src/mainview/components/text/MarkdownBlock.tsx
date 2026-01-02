import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '../../lib';
import { CodeBlock } from './CodeBlock';
import { InlineCode } from './InlineCode';
import { LinkPreview } from './LinkPreview';
import { StyledText } from '../effects';
import type { TextRule } from '../../types/effects';

export interface MarkdownBlockProps {
  content: string;
  allowHtml?: boolean;
  /** Optional text effect rules to apply */
  textRules?: TextRule[];
  /** Whether text effects are enabled */
  effectsEnabled?: boolean;
  className?: string;
}

export function MarkdownBlock({
  content,
  allowHtml = false,
  textRules = [],
  effectsEnabled = false,
  className,
}: MarkdownBlockProps) {
  // Create a text renderer that applies effects when enabled
  const TextWithEffects = ({ children }: { children: string }) => {
    if (!effectsEnabled || textRules.length === 0) {
      return <>{children}</>;
    }
    return <StyledText rules={textRules} enabled={effectsEnabled}>{children}</StyledText>;
  };

  return (
    <div
      className={cn(
        'prose prose-sm max-w-none',
        'prose-p:my-2 prose-p:leading-relaxed',
        'prose-headings:font-semibold prose-headings:mt-6 prose-headings:mb-3',
        'prose-h1:text-xl prose-h2:text-lg prose-h3:text-base',
        'prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5',
        'prose-blockquote:border-l-2 prose-blockquote:border-[var(--color-accent)] prose-blockquote:pl-4 prose-blockquote:italic',
        'prose-hr:my-6 prose-hr:border-[var(--color-border)]',
        'prose-img:rounded-[var(--radius-lg)] prose-img:my-4',
        'prose-table:border-collapse prose-th:border prose-th:border-[var(--color-border)] prose-th:px-3 prose-th:py-2 prose-th:bg-[var(--color-bg-secondary)]',
        'prose-td:border prose-td:border-[var(--color-border)] prose-td:px-3 prose-td:py-2',
        // Dark mode text colors
        'prose-p:text-[var(--color-text)]',
        'prose-headings:text-[var(--color-text)]',
        'prose-strong:text-[var(--color-text)]',
        'prose-a:text-[var(--color-accent)] prose-a:no-underline hover:prose-a:underline',
        'prose-blockquote:text-[var(--color-text-secondary)]',
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml={!allowHtml}
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const codeString = String(children).replace(/\n$/, '');

            // Check if it's a code block (has language) or inline code
            if (match) {
              return (
                <CodeBlock
                  code={codeString}
                  language={match[1]}
                />
              );
            }

            // Inline code
            return <InlineCode {...props}>{codeString}</InlineCode>;
          },

          pre({ children }) {
            // Let code component handle the rendering
            return <>{children}</>;
          },

          a({ href, children }) {
            if (!href) return <>{children}</>;

            // External links get special treatment
            const isExternal = href.startsWith('http');

            if (isExternal) {
              return (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--color-accent)] hover:underline"
                >
                  {children}
                </a>
              );
            }

            return (
              <a href={href} className="text-[var(--color-accent)] hover:underline">
                {children}
              </a>
            );
          },

          table({ children }) {
            return (
              <div className="overflow-x-auto my-4 rounded-[var(--radius-md)] border border-[var(--color-border)]">
                <table className="min-w-full">{children}</table>
              </div>
            );
          },

          img({ src, alt }) {
            return (
              <img
                src={src}
                alt={alt || ''}
                className="rounded-[var(--radius-lg)] max-w-full h-auto"
                loading="lazy"
              />
            );
          },

          // Apply text effects to paragraph text
          p({ children }) {
            // Process text children with effects
            const processedChildren = React.Children.map(children, (child) => {
              if (typeof child === 'string' && effectsEnabled && textRules.length > 0) {
                return <TextWithEffects>{child}</TextWithEffects>;
              }
              return child;
            });
            return <p>{processedChildren}</p>;
          },

          // Apply text effects to strong text
          strong({ children }) {
            const processedChildren = React.Children.map(children, (child) => {
              if (typeof child === 'string' && effectsEnabled && textRules.length > 0) {
                return <TextWithEffects>{child}</TextWithEffects>;
              }
              return child;
            });
            return <strong>{processedChildren}</strong>;
          },

          // Apply text effects to emphasis text
          em({ children }) {
            const processedChildren = React.Children.map(children, (child) => {
              if (typeof child === 'string' && effectsEnabled && textRules.length > 0) {
                return <TextWithEffects>{child}</TextWithEffects>;
              }
              return child;
            });
            return <em>{processedChildren}</em>;
          },

          // Apply text effects to list items
          li({ children }) {
            const processedChildren = React.Children.map(children, (child) => {
              if (typeof child === 'string' && effectsEnabled && textRules.length > 0) {
                return <TextWithEffects>{child}</TextWithEffects>;
              }
              return child;
            });
            return <li>{processedChildren}</li>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
