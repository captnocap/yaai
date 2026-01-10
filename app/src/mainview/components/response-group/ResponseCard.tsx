import React, { useState } from 'react'
import {
  Check, Copy, ThumbsUp, ThumbsDown, RotateCcw, ImagePlus, Pencil, X, Clock, Save,
  AlertTriangle, Ban, Clock3, Wifi, WifiOff, KeyRound, ShieldAlert, AlertCircle, RefreshCw,
  Maximize2, Minimize2
} from 'lucide-react'
import Editor from '@monaco-editor/react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '../../lib'
import { getProviderTheme } from './model-themes'
import { ThinkingBlock } from './ThinkingBlock'
import { CodeBlock } from '../text/CodeBlock'
import type { Message, MessageErrorCode } from '../../types'
import './styles.css'

// Error display configuration
const ERROR_CONFIG: Record<MessageErrorCode, {
  icon: typeof AlertTriangle;
  title: string;
  color: string;
}> = {
  context_length_exceeded: {
    icon: AlertTriangle,
    title: 'Context Limit Exceeded',
    color: '251, 146, 60', // orange
  },
  rate_limit: {
    icon: Clock3,
    title: 'Rate Limited',
    color: '251, 191, 36', // amber
  },
  service_unavailable: {
    icon: WifiOff,
    title: 'Service Unavailable',
    color: '239, 68, 68', // red
  },
  authentication_error: {
    icon: KeyRound,
    title: 'Authentication Failed',
    color: '239, 68, 68', // red
  },
  invalid_request: {
    icon: Ban,
    title: 'Invalid Request',
    color: '251, 146, 60', // orange
  },
  content_filter: {
    icon: ShieldAlert,
    title: 'Content Filtered',
    color: '168, 85, 247', // purple
  },
  timeout: {
    icon: Clock3,
    title: 'Request Timeout',
    color: '251, 191, 36', // amber
  },
  network_error: {
    icon: Wifi,
    title: 'Network Error',
    color: '239, 68, 68', // red
  },
  unknown: {
    icon: AlertCircle,
    title: 'Unknown Error',
    color: '156, 163, 175', // gray
  },
}

export interface ResponseCardProps {
  message: Message
  isSelected: boolean
  onSelect: () => void
  isStreaming?: boolean
  compact?: boolean
  showSelection?: boolean
  className?: string
  index?: number
  /** Callback when an image is selected as reference */
  onImageReference?: (url: string) => void
  /** Callback when message is edited */
  onEdit?: (messageId: string, newContent: string) => void
  /** Max height for the content area (default: 400px, compact: 160px) */
  maxHeight?: number
}

/**
 * Individual response card for parallel responses
 * Features provider-colored glow for visual identification
 */
export function ResponseCard({
  message,
  isSelected,
  onSelect,
  isStreaming = false,
  compact = false,
  showSelection = true,
  className,
  index = 0,
  onImageReference,
  onEdit,
  maxHeight,
}: ResponseCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    const content = message.content.map(c => (c as any).value || (c as any).text || '').join('\n\n')
    navigator.clipboard.writeText(content)
  }

  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    const content = message.content.map(c => (c as any).value || (c as any).text || '').join('\n\n')
    setEditContent(content)
    setIsEditing(true)
  }

  const handleSaveEdit = () => {
    onEdit?.(message.id, editContent)
    setIsEditing(false)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditContent('')
  }

  // Format timestamp
  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date)
  }

  // Only apply maxHeight if explicitly set or compact mode
  // When className includes h-full, let flexbox handle sizing
  const useFlexLayout = className?.includes('h-full')
  const contentMaxHeight = (useFlexLayout || isExpanded) ? undefined : (maxHeight ?? (compact ? 160 : 400))

  // Handle model as either string (demo) or ModelInfo object (real)
  const modelInfo = message.model

  // Extract display info from model
  const nickname = typeof modelInfo === 'string'
    ? modelInfo
    : modelInfo?.name || 'Unknown Model'
  const apiModel = typeof modelInfo === 'string'
    ? modelInfo
    : modelInfo?.apiModel || modelInfo?.id || nickname
  const modelProvider = typeof modelInfo === 'string'
    ? extractProvider(modelInfo)
    : modelInfo?.provider || extractProvider(nickname)
  const apiProvider = typeof modelInfo === 'string'
    ? undefined
    : modelInfo?.apiProvider

  const theme = getProviderTheme(modelProvider)
  const animationDelay = `${index * 80}ms`

  // Separate thinking blocks from other content
  const thinkingBlocks = message.content.filter((b: any) => b.type === 'thinking')
  const otherBlocks = message.content.filter((b: any) => b.type !== 'thinking')

  // Wrap in a container for backdrop glow when selected
  return (
    <div
      className={cn('relative', className)}
      style={{ animationDelay }}
    >
      {/* Backdrop glow - sits behind the card */}
      {isSelected && (
        <div
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{
            background: `rgba(${theme.glow}, 0.15)`,
            filter: 'blur(20px)',
            transform: 'scale(1.05)',
          }}
        />
      )}

      {/* The actual card */}
      <div
        className={cn(
          'response-card-enter group relative rounded-xl overflow-hidden flex flex-col h-full',
          'border bg-[var(--color-bg-elevated)]',
          'transition-all duration-200',
          isSelected && 'response-card-selected border-transparent',
          !isSelected && 'border-[var(--color-border)]',
          !isSelected && showSelection && 'hover:border-[var(--color-border-strong)]',
        )}
        style={{
          '--glow-color': theme.glow,
        } as React.CSSProperties}
      >
        {/* Colored accent bar at top */}
        <div
          className="h-1 w-full"
          style={{ backgroundColor: `rgb(${theme.glow})` }}
        />

        {/* Header */}
        <div className="flex items-stretch border-b border-[var(--color-border)]">
          {/* Model Initial - colored background */}
          <div
            className="w-12 flex items-center justify-center shrink-0 text-lg font-bold text-white"
            style={{ backgroundColor: `rgb(${theme.glow})` }}
          >
            {theme.initial}
          </div>

          {/* Model Info: Nickname, API Model, Providers, Timestamp */}
          <div className="flex-1 flex items-center justify-between px-3 py-2 min-w-0">
            <div className="min-w-0 flex-1">
              {/* Nickname - main display name */}
              <h3 className="text-sm font-semibold text-[var(--color-text)] truncate leading-tight">
                {nickname}
              </h3>
              {/* API Model ID */}
              <div className="text-[11px] text-[var(--color-text-secondary)] font-mono truncate">
                {apiModel}
              </div>
              {/* Provider info + timestamp */}
              <div className="flex items-center gap-1.5 text-[10px] text-[var(--color-text-tertiary)] mt-0.5">
                <span>{modelProvider}</span>
                {apiProvider && apiProvider !== modelProvider && (
                  <>
                    <span className="opacity-40">via</span>
                    <span>{apiProvider}</span>
                  </>
                )}
                {message.timestamp && (
                  <>
                    <span className="opacity-40">•</span>
                    <span className="flex items-center gap-0.5">
                      <Clock size={9} />
                      {formatTime(message.timestamp)}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Actions in header */}
            <div className={cn(
              'flex items-center gap-0.5 transition-opacity',
              !isSelected && 'opacity-0 group-hover:opacity-100'
            )}>
              <button
                onClick={handleStartEdit}
                className="p-1.5 rounded hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)] hover:text-[var(--color-accent)] transition-colors"
                title="Edit response"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={handleCopy}
                className="p-1.5 rounded hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text)] transition-colors"
                title="Copy"
              >
                <Copy size={14} />
              </button>
              <button
                className="p-1.5 rounded hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)] hover:text-[var(--color-success)] transition-colors"
                title="Good response"
              >
                <ThumbsUp size={14} />
              </button>
              <button
                className="p-1.5 rounded hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)] hover:text-[var(--color-error)] transition-colors"
                title="Poor response"
              >
                <ThumbsDown size={14} />
              </button>
              <button
                className="p-1.5 rounded hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text)] transition-colors"
                title="Regenerate"
              >
                <RotateCcw size={14} />
              </button>
            </div>
          </div>

          {/* Selection indicator - clickable to select */}
          {showSelection && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (!isSelected) onSelect()
              }}
              className={cn(
                'flex items-center px-3 border-l transition-colors',
                isSelected
                  ? 'border-transparent'
                  : 'border-[var(--color-border)] bg-transparent hover:bg-[var(--color-bg-tertiary)] cursor-pointer'
              )}
              style={isSelected ? { backgroundColor: `rgb(${theme.glow})` } : undefined}
              title={isSelected ? 'Selected' : 'Select this response'}
            >
              {isSelected ? (
                <Check size={16} className="text-white" />
              ) : (
                <div
                  className="w-4 h-4 rounded border-2 border-[var(--color-border-strong)] transition-colors"
                  style={{ borderColor: `rgba(${theme.glow}, 0.4)` }}
                />
              )}
            </button>
          )}
        </div>

        {/* Content Area - scrollable, fills available space */}
        <div
          className={cn(
            'flex-1 p-4 overflow-y-auto custom-scrollbar text-[var(--color-text)] min-h-0',
            compact && 'p-3'
          )}
          style={{
            ...(contentMaxHeight ? { maxHeight: contentMaxHeight } : {}),
            fontSize: compact ? 'calc(var(--chat-font-size) * 0.85)' : 'var(--chat-font-size)',
            fontFamily: 'var(--chat-font-family)',
            lineHeight: 'var(--chat-line-height)',
          }}
        >
          {/* Error State */}
          {message.error && (() => {
            const errorConfig = ERROR_CONFIG[message.error.code] || ERROR_CONFIG.unknown
            const ErrorIcon = errorConfig.icon
            return (
              <div
                className="flex flex-col items-center justify-center h-full min-h-[120px] text-center p-4"
              >
                {/* Error Icon with glow */}
                <div
                  className="relative mb-4"
                >
                  <div
                    className="absolute inset-0 blur-xl opacity-30"
                    style={{ backgroundColor: `rgb(${errorConfig.color})` }}
                  />
                  <div
                    className="relative p-3 rounded-xl"
                    style={{
                      backgroundColor: `rgba(${errorConfig.color}, 0.15)`,
                      border: `1px solid rgba(${errorConfig.color}, 0.3)`,
                    }}
                  >
                    <ErrorIcon
                      size={compact ? 24 : 32}
                      style={{ color: `rgb(${errorConfig.color})` }}
                      strokeWidth={2}
                    />
                  </div>
                </div>

                {/* Error Title */}
                <h4
                  className={cn(
                    'font-bold mb-2',
                    compact ? 'text-sm' : 'text-base'
                  )}
                  style={{ color: `rgb(${errorConfig.color})` }}
                >
                  {errorConfig.title}
                </h4>

                {/* Error Message */}
                <p className={cn(
                  'text-[var(--color-text-secondary)] mb-3 max-w-sm',
                  compact ? 'text-xs' : 'text-sm'
                )}>
                  {message.error.message}
                </p>

                {/* Error Details (collapsible in compact) */}
                {message.error.details && !compact && (
                  <div
                    className="w-full max-w-md mt-2 p-3 rounded-lg text-left font-mono text-xs"
                    style={{
                      backgroundColor: `rgba(${errorConfig.color}, 0.1)`,
                      border: `1px solid rgba(${errorConfig.color}, 0.2)`,
                      color: `rgba(${errorConfig.color}, 0.9)`,
                    }}
                  >
                    <div className="text-[10px] uppercase tracking-wider opacity-60 mb-1">Details</div>
                    {message.error.details}
                  </div>
                )}

                {/* Retry button if retryable */}
                {message.error.retryable && (
                  <button
                    className={cn(
                      'mt-4 flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all',
                      'hover:scale-105 active:scale-95',
                      compact ? 'text-xs' : 'text-sm'
                    )}
                    style={{
                      backgroundColor: `rgba(${errorConfig.color}, 0.2)`,
                      color: `rgb(${errorConfig.color})`,
                      border: `1px solid rgba(${errorConfig.color}, 0.3)`,
                    }}
                  >
                    <RefreshCw size={14} />
                    Retry
                  </button>
                )}
              </div>
            )
          })()}

          {/* Normal content (only if no error) */}
          {!message.error && (
            <>
              {/* Thinking blocks at top - styled with model color */}
              {thinkingBlocks.map((block: any, idx: number) => (
                <ThinkingBlock
                  key={`thinking-${idx}`}
                  content={(block as any).value || (block as any).text || ''}
                  isStreaming={isStreaming && idx === thinkingBlocks.length - 1}
                  defaultExpanded={false}
                  glowColor={theme.glow}
                />
              ))}
            </>
          )}

          {/* Other content blocks (only if no error) */}
          {!message.error && otherBlocks.map((block: any, idx: number) => {
            const content = (block as any)?.value || (block as any)?.text || ''
            const type = (block as any)?.type || 'text'
            const language = (block as any)?.language

            if (type === 'text') {
              return (
                <div key={idx} className="prose prose-invert max-w-none [&>*]:my-0 [&>*+*]:mt-3">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      // Use our CodeBlock for fenced code
                      code({ node, className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || '')
                        const isInline = !match && !String(children).includes('\n')
                        if (isInline) {
                          return (
                            <code className="px-1.5 py-0.5 rounded bg-[var(--color-bg-tertiary)] text-[var(--color-accent)] text-[0.9em] font-mono" {...props}>
                              {children}
                            </code>
                          )
                        }
                        return (
                          <CodeBlock
                            code={String(children).replace(/\n$/, '')}
                            language={match?.[1] || 'text'}
                            showLineNumbers={!compact}
                            compact={compact}
                            className="my-3"
                          />
                        )
                      },
                      // Style other elements
                      p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                      ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>,
                      li: ({ children }) => <li className="text-[var(--color-text)]">{children}</li>,
                      h1: ({ children }) => <h1 className="text-xl font-bold mb-3 mt-4 first:mt-0">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-lg font-bold mb-2 mt-4 first:mt-0">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-base font-bold mb-2 mt-3 first:mt-0">{children}</h3>,
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-2 border-[var(--color-accent)] pl-4 my-3 text-[var(--color-text-secondary)] italic">
                          {children}
                        </blockquote>
                      ),
                      a: ({ href, children }) => (
                        <a href={href} className="text-[var(--color-accent)] hover:underline" target="_blank" rel="noopener noreferrer">
                          {children}
                        </a>
                      ),
                      strong: ({ children }) => <strong className="font-bold text-[var(--color-text)]">{children}</strong>,
                      em: ({ children }) => <em className="italic">{children}</em>,
                      hr: () => <hr className="my-4 border-[var(--color-border)]" />,
                      table: ({ children }) => (
                        <div className="overflow-x-auto my-3">
                          <table className="min-w-full border-collapse border border-[var(--color-border)]">{children}</table>
                        </div>
                      ),
                      th: ({ children }) => (
                        <th className="border border-[var(--color-border)] px-3 py-2 bg-[var(--color-bg-tertiary)] text-left font-semibold">{children}</th>
                      ),
                      td: ({ children }) => (
                        <td className="border border-[var(--color-border)] px-3 py-2">{children}</td>
                      ),
                    }}
                  >
                    {content}
                  </ReactMarkdown>
                  {isStreaming && idx === otherBlocks.length - 1 && (
                    <span
                      className="inline-block w-2 h-4 ml-0.5 animate-pulse"
                      style={{ backgroundColor: `rgb(${theme.glow})` }}
                    />
                  )}
                </div>
              )
            }

            if (type === 'code') {
              return (
                <CodeBlock
                  key={idx}
                  code={content}
                  language={language}
                  showLineNumbers={!compact}
                  compact={compact}
                  className="my-3"
                />
              )
            }

            // Image block
            if (type === 'image' || type === 'image_gen') {
              const imageUrl = (block as any)?.url || (block as any)?.data || content
              return (
                <div key={idx} className="my-3 relative group/image rounded-lg overflow-hidden border border-[var(--color-border)]">
                  <img
                    src={imageUrl}
                    alt="Generated"
                    className="w-full h-auto max-h-64 object-cover"
                  />
                  {/* Image hover overlay */}
                  {onImageReference && (
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/image:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onImageReference(imageUrl)
                        }}
                        className="flex items-center gap-2 px-3 py-2 bg-white text-black rounded-lg text-xs font-medium hover:bg-gray-100 transition-colors"
                      >
                        <ImagePlus size={14} />
                        Use as Reference
                      </button>
                    </div>
                  )}
                </div>
              )
            }

            return (
              <div key={idx} className="text-[var(--color-text-tertiary)] italic text-xs">
                [{type}]
              </div>
            )
          })}

          {/* Empty streaming state */}
          {message.content.length === 0 && isStreaming && (
            <div className="flex items-center gap-2 text-[var(--color-text-tertiary)]">
              <div className="flex gap-1">
                {[0, 150, 300].map((delay) => (
                  <span
                    key={delay}
                    className="w-2 h-2 rounded-full animate-bounce"
                    style={{
                      backgroundColor: `rgb(${theme.glow})`,
                      animationDelay: `${delay}ms`
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={cn(
          "px-4 py-2 border-t border-[var(--color-border)] text-[var(--color-text-tertiary)] flex items-center justify-between shrink-0",
          compact ? "py-1" : "py-2"
        )}>
          <div className="flex items-center gap-4 text-xs">
            {!compact && message.tokenCount && (
              <span>
                {typeof message.tokenCount === 'number'
                  ? `${message.tokenCount} tokens`
                  : `${message.tokenCount.input || 0}/${message.tokenCount.output || 0} tokens`}
              </span>
            )}
            {!compact && message.generationTime && (
              <span>{message.generationTime}ms</span>
            )}
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation()
              setIsExpanded(!isExpanded)
            }}
            className="p-1 rounded hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text)] transition-colors ml-auto"
            title={isExpanded ? "Collapse" : "Expand to fit content"}
          >
            {isExpanded ? <Minimize2 size={compact ? 12 : 14} /> : <Maximize2 size={compact ? 12 : 14} />}
          </button>
        </div>

        {/* Hover glow effect - only for non-selected cards */}
        {!isSelected && (
          <div
            className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"
            style={{
              boxShadow: `0 0 20px rgba(${theme.glow}, 0.3), inset 0 0 0 1px rgba(${theme.glow}, 0.2)`
            }}
          />
        )}

        {/* Edit overlay with Monaco editor */}
        {isEditing && (
          <div className="absolute inset-0 z-10 flex flex-col bg-[var(--color-bg-elevated)] rounded-xl overflow-hidden">
            {/* Edit header */}
            <div
              className="flex items-center justify-between px-3 py-2 border-b"
              style={{
                borderColor: `rgba(${theme.glow}, 0.3)`,
                background: `rgba(${theme.glow}, 0.1)`,
              }}
            >
              <span className="text-sm font-medium" style={{ color: `rgb(${theme.glow})` }}>
                Edit Response
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleSaveEdit}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-white transition-colors"
                  style={{ backgroundColor: `rgb(${theme.glow})` }}
                >
                  <Save size={12} />
                  Save
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="p-1.5 rounded-md text-[var(--color-text-tertiary)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Monaco editor */}
            <div className="flex-1 min-h-0">
              <Editor
                height="100%"
                defaultLanguage="markdown"
                value={editContent}
                onChange={(value) => setEditContent(value || '')}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineNumbers: 'off',
                  wordWrap: 'on',
                  padding: { top: 12, bottom: 12 },
                  scrollBeyondLastLine: false,
                  renderLineHighlight: 'none',
                  overviewRulerBorder: false,
                  hideCursorInOverviewRuler: true,
                  scrollbar: {
                    vertical: 'auto',
                    horizontal: 'hidden',
                    verticalScrollbarSize: 8,
                  },
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function extractProvider(modelName: string): string {
  const lower = modelName.toLowerCase()
  if (lower.includes('claude') || lower.includes('anthropic')) return 'Anthropic'
  if (lower.includes('gpt') || lower.includes('openai')) return 'OpenAI'
  if (lower.includes('gemini') || lower.includes('google')) return 'Google'
  if (lower.includes('mistral') || lower.includes('mixtral')) return 'Mistral'
  if (lower.includes('cohere') || lower.includes('command')) return 'Cohere'
  if (lower.includes('llama') || lower.includes('meta')) return 'Meta'
  if (lower.includes('imagen') || lower.includes('deepmind')) return 'DeepMind'
  return 'AI'
}
