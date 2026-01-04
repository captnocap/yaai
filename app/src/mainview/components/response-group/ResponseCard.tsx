import React from 'react'
import { Check, Copy, ThumbsUp, MoreVertical } from 'lucide-react'
import { cn } from '../../lib'
import type { Message } from '../../types'

export interface ResponseCardProps {
  message: Message
  isSelected: boolean
  onSelect: () => void
  isStreaming?: boolean
  compact?: boolean
  showSelection?: boolean
  className?: string
}

/**
 * Individual response card in a parallel response group
 * Shows model info, content, metadata, and selection controls
 */
export function ResponseCard({
  message,
  isSelected,
  onSelect,
  isStreaming = false,
  compact = false,
  showSelection = true,
  className,
}: ResponseCardProps) {
  const handleCopy = () => {
    const content = message.content.map(c => (c as any).value || '').join('\n\n')
    navigator.clipboard.writeText(content)
  }

  const modelName = message.model || 'Unknown Model'
  const provider = (message.metadata as any)?.provider || 'Unknown'

  return (
    <div
      className={cn(
        'relative group rounded-lg border transition-all duration-200',
        isSelected
          ? 'border-blue-500 bg-blue-50 shadow-md'
          : 'border-gray-200 bg-white hover:border-gray-300',
        compact ? 'p-3' : 'p-4',
        className
      )}
      onClick={!isSelected && showSelection ? onSelect : undefined}
    >
      {/* Selection indicator */}
      {showSelection && (
        <div
          className={cn(
            'absolute top-3 right-3 flex items-center gap-2 transition-opacity',
            isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          )}
        >
          {isSelected ? (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-blue-600 text-white text-xs font-medium">
              <Check size={12} />
              <span>Selected</span>
            </div>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onSelect()
              }}
              className="px-2 py-1 rounded-full border border-gray-300 bg-white hover:bg-gray-50 text-xs font-medium"
            >
              Select
            </button>
          )}
        </div>
      )}

      {/* Model info header */}
      <div className="flex items-center gap-2 mb-3 pr-20">
        <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-bold text-gray-700">{provider[0]?.toUpperCase() || 'A'}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900">{modelName}</div>
          <div className="text-xs text-gray-500">{provider}</div>
        </div>
        {isStreaming && (
          <div className="flex gap-1">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" style={{ animationDelay: '0.2s' }} />
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" style={{ animationDelay: '0.4s' }} />
          </div>
        )}
      </div>

      {/* Message content */}
      <div className={cn('prose prose-sm max-w-none', compact && 'text-sm')}>
        {message.content.map((block, idx) => {
          const content = (block as any)?.value || (block as any)?.text || ''
          const type = (block as any)?.type || 'text'

          if (type === 'text') {
            return (
              <div key={idx} className="text-gray-700 whitespace-pre-wrap">
                {content}
              </div>
            )
          }

          if (type === 'code') {
            return (
              <pre key={idx} className="bg-gray-100 p-2 rounded text-xs overflow-auto">
                {content}
              </pre>
            )
          }

          return (
            <div key={idx} className="text-gray-600 italic">
              [{type}]
            </div>
          )
        })}
      </div>

      {/* Footer with stats and actions */}
      {!compact && (
        <div className="mt-3 flex items-center justify-between text-xs text-gray-500 border-t border-gray-100 pt-2">
          <div className="flex gap-3">
            {message.tokenCount && <span>Tokens: {message.tokenCount}</span>}
            {message.generationTime && <span>Time: {message.generationTime}ms</span>}
          </div>

          <div className={cn('flex gap-1 transition-opacity', isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')}>
            <button
              onClick={handleCopy}
              title="Copy response"
              className="p-1 hover:bg-gray-100 rounded"
            >
              <Copy size={14} className="text-gray-600" />
            </button>
            <button
              title="Like this response"
              className="p-1 hover:bg-gray-100 rounded"
            >
              <ThumbsUp size={14} className="text-gray-600" />
            </button>
            <button
              title="More actions"
              className="p-1 hover:bg-gray-100 rounded"
            >
              <MoreVertical size={14} className="text-gray-600" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
