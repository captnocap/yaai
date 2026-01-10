import React, { useState } from 'react'
import { ChevronDown, Brain } from 'lucide-react'
import { cn } from '../../lib'

export interface ThinkingBlockProps {
  /** The thinking/reasoning content to display */
  content: string
  /** Whether the content is currently streaming */
  isStreaming?: boolean
  /** Initial expanded state */
  defaultExpanded?: boolean
  /** RGB glow color from provider theme (e.g., "251, 146, 60") */
  glowColor?: string
  className?: string
}

/**
 * Collapsible thinking/reasoning block
 * Shows model's reasoning process with visual flair
 */
export function ThinkingBlock({
  content,
  isStreaming = false,
  defaultExpanded = false,
  glowColor = '156, 163, 175', // gray default
  className,
}: ThinkingBlockProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  if (!content) return null

  const lines = content.split('\n')
  const lastLine = lines[lines.length - 1] || ''

  return (
    <div
      className={cn(
        'mb-4 rounded-lg overflow-hidden',
        'border transition-all duration-300',
        isExpanded ? 'shadow-lg' : 'shadow-sm cursor-pointer hover:shadow-md',
        className
      )}
      style={{
        borderColor: `rgba(${glowColor}, 0.3)`,
        background: `linear-gradient(135deg, rgba(${glowColor}, 0.08) 0%, rgba(${glowColor}, 0.02) 100%)`,
      }}
      onClick={!isExpanded ? () => setIsExpanded(true) : undefined}
    >
      {/* Header / Toggle */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          setIsExpanded(!isExpanded)
        }}
        className="w-full flex items-center gap-2 px-3 py-2.5 transition-all hover:bg-white/5 group"
        style={{ color: `rgb(${glowColor})` }}
      >
        {/* Animated brain icon */}
        <div
          className={cn(
            'p-1.5 rounded-md transition-all',
            isStreaming && 'animate-pulse'
          )}
          style={{
            backgroundColor: `rgba(${glowColor}, 0.15)`,
          }}
        >
          <Brain size={14} strokeWidth={2.5} />
        </div>

        {/* Title */}
        <span className="text-xs font-bold uppercase tracking-wider">
          Reasoning
        </span>

        {/* Streaming indicator */}
        {isStreaming && (
          <div className="flex gap-1 ml-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-1.5 h-1.5 rounded-full animate-bounce"
                style={{
                  backgroundColor: `rgb(${glowColor})`,
                  animationDelay: `${i * 100}ms`,
                }}
              />
            ))}
          </div>
        )}

        {/* Expand/Collapse indicator */}
        <div className="ml-auto flex items-center gap-2">
          <span
            className="text-[10px] font-mono px-2 py-0.5 rounded opacity-60 group-hover:opacity-100 transition-opacity"
            style={{ backgroundColor: `rgba(${glowColor}, 0.1)` }}
          >
            {isExpanded ? 'COLLAPSE' : 'EXPAND'}
          </span>
          <div
            className={cn(
              'transition-transform duration-200',
              isExpanded && 'rotate-180'
            )}
          >
            <ChevronDown size={14} strokeWidth={2.5} />
          </div>
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div
          className="px-4 pb-3 pt-2 border-t animate-in slide-in-from-top-2 duration-200"
          style={{ borderColor: `rgba(${glowColor}, 0.2)` }}
        >
          <pre
            className="font-mono whitespace-pre-wrap"
            style={{
              color: `rgba(${glowColor}, 0.9)`,
              fontSize: 'calc(var(--chat-font-size) * 0.85)',
              lineHeight: 'var(--chat-line-height)',
            }}
          >
            {content}
            {isStreaming && (
              <span
                className="inline-block w-2 h-4 ml-0.5 animate-pulse"
                style={{ backgroundColor: `rgb(${glowColor})` }}
              />
            )}
          </pre>
        </div>
      )}

      {/* Collapsed Preview - Terminal style (clickable to expand) */}
      {!isExpanded && content && (
        <div
          className="px-3 pb-2.5 -mt-1 cursor-pointer"
          onClick={() => setIsExpanded(true)}
        >
          <div
            className="relative h-7 overflow-hidden rounded-md hover:ring-1 transition-all"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.2)',
            }}
          >
            <div className="absolute inset-0 flex items-center px-3">
              <span
                className="font-mono truncate flex items-center gap-2"
                style={{ fontSize: 'calc(var(--chat-font-size) * 0.8)' }}
              >
                <span style={{ color: `rgb(${glowColor})` }} className="font-bold">
                  {'>'}
                </span>
                <span className="text-[var(--color-text-secondary)] opacity-80">
                  {lastLine}
                </span>
                {isStreaming && (
                  <span
                    className="inline-block w-1.5 h-3 animate-pulse"
                    style={{ backgroundColor: `rgb(${glowColor})` }}
                  />
                )}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Get thinking theme based on provider (kept for API compatibility)
 */
export function getThinkingTheme(_provider: string): string {
  return 'default'
}
