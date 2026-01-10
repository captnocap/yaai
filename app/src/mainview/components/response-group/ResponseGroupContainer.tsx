import React, { useEffect } from 'react'
import { User } from 'lucide-react'
import { cn } from '../../lib'
import { ResponseCard } from './ResponseCard'
import { useParallelLayout, type LayoutMode } from './ParallelLayoutContext'
import type { Message } from '../../types'
import './styles.css'

export type { LayoutMode }

export interface ResponseGroupContainerProps {
  responses: Message[]
  selectedResponseId: string | null | undefined
  onSelectResponse: (messageId: string) => void
  userMessage?: Message
  isStreaming?: boolean
  onImageReference?: (url: string) => void
  className?: string
}

/** Extract text content from a message */
function getMessageText(message: Message): string {
  return message.content
    .map((c: any) => c.value || c.text || '')
    .join('\n')
}

/**
 * Container for displaying parallel responses
 * Uses ParallelLayoutContext for layout state (controlled from BottomToolbar)
 */
export function ResponseGroupContainer({
  responses,
  selectedResponseId,
  onSelectResponse,
  userMessage,
  isStreaming = false,
  onImageReference,
  className,
}: ResponseGroupContainerProps) {
  const { layoutMode, gridColumns, setHasParallelResponses } = useParallelLayout()

  // Signal to BottomToolbar when we have parallel responses to display
  useEffect(() => {
    const hasMultiple = responses.length > 1
    setHasParallelResponses(hasMultiple)
    return () => setHasParallelResponses(false)
  }, [responses.length, setHasParallelResponses])

  const selectedResponse = responses.find(r => r.id === selectedResponseId)
  const alternatives = responses.filter(r => r.id !== selectedResponseId)

  // Get layout classes based on mode
  const getLayoutClasses = () => {
    switch (layoutMode) {
      case 'stacked':
        return 'flex flex-col gap-4 max-w-2xl mx-auto'
      case 'columns':
        return 'grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
      case 'grid':
        return cn(
          'grid gap-3',
          gridColumns === 2 && 'grid-cols-2',
          gridColumns === 3 && 'grid-cols-2 lg:grid-cols-3',
          gridColumns === 4 && 'grid-cols-2 lg:grid-cols-4',
          gridColumns === 5 && 'grid-cols-2 lg:grid-cols-5',
          gridColumns === 6 && 'grid-cols-3 lg:grid-cols-6'
        )
      default:
        return 'grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
    }
  }

  // User message header component - always visible, truncated if long
  const UserMessageHeader = () => {
    if (!userMessage) return null
    const text = getMessageText(userMessage)
    const isTruncated = text.length > 200

    return (
      <div className="px-4 py-3 bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)] sticky top-0 z-10">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-[var(--color-accent)] flex items-center justify-center shrink-0">
            <User size={16} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-[var(--color-text-tertiary)] mb-1">You asked</div>
            <p className={cn(
              'text-sm text-[var(--color-text)] leading-relaxed',
              isTruncated && 'line-clamp-2'
            )}>
              {text}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Single response - render directly
  if (responses.length === 1 && selectedResponseId) {
    return (
      <div className={className}>
        <UserMessageHeader />
        <div className="px-4 py-4">
          <ResponseCard
            message={responses[0]}
            isSelected
            onSelect={() => { }}
            isStreaming={isStreaming}
            showSelection={false}
            onImageReference={onImageReference}
            index={0}
          />
        </div>
      </div>
    )
  }

  // No selection yet - show all responses
  if (!selectedResponseId) {
    return (
      <div className={cn('space-y-0', className)}>
        <UserMessageHeader />

        {/* Header */}
        <div className="px-4 py-3 text-sm text-[var(--color-text-secondary)]">
          Choose a response to continue
        </div>

        {/* Response cards */}
        <div className={cn('px-4 pb-4', getLayoutClasses())}>
          {responses.map((response, idx) => (
            <ResponseCard
              key={response.id}
              message={response}
              isSelected={false}
              onSelect={() => onSelectResponse(response.id)}
              isStreaming={isStreaming && idx === responses.length - 1}
              onImageReference={onImageReference}
              index={idx}
            />
          ))}
        </div>
      </div>
    )
  }

  // Selected response with alternatives shown inline (consolidated view)
  // Fill available space - no fixed height
  return (
    <div className={cn('flex flex-col h-full', className)}>
      <UserMessageHeader />

      <div className="flex-1 px-4 py-4 min-h-0">
        <div className="flex flex-col lg:flex-row gap-4 h-full">
          {/* Selected response - takes more space */}
          <div className="flex-1 lg:flex-[3] min-w-0 min-h-0">
            {selectedResponse && (
              <ResponseCard
                message={selectedResponse}
                isSelected
                onSelect={() => { }}
                isStreaming={isStreaming}
                onImageReference={onImageReference}
                showSelection={false}
                index={0}
                className="h-full"
              />
            )}
          </div>

          {/* Alternatives - smart layout based on count */}
          {alternatives.length > 0 && (
            <div className="lg:flex-[2] flex flex-col min-w-0 min-h-0">
              {/* Smart grid - adapts to count */}
              <div
                className={cn(
                  'flex-1 min-h-0 gap-3 overflow-y-auto custom-scrollbar pr-1',
                  // 1 item: single centered
                  alternatives.length === 1 && 'flex items-center justify-center',
                  // 2 items: stack vertically
                  alternatives.length === 2 && 'flex flex-col',
                  // 3 items: 2 on top, 1 on bottom (or column)
                  alternatives.length === 3 && 'grid grid-cols-2 grid-rows-2',
                  // 4+ items: 2-column grid
                  alternatives.length >= 4 && 'grid grid-cols-2'
                )}
              >
                {alternatives.map((response, idx) => (
                  <ResponseCard
                    key={response.id}
                    message={response}
                    isSelected={false}
                    onSelect={() => onSelectResponse(response.id)}
                    onImageReference={onImageReference}
                    compact={alternatives.length >= 3}
                    index={idx}
                    className={cn(
                      // For 3 items, last one spans full width
                      alternatives.length === 3 && idx === 2 && 'col-span-2',
                      // For 1-2 items, let them grow
                      alternatives.length <= 2 && 'flex-1'
                    )}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
