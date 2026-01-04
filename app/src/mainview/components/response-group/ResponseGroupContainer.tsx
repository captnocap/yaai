import React, { useState } from 'react'
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '../../lib'
import { ResponseCard } from './ResponseCard'
import type { Message, MessageId } from '../../types'

export type LayoutMode = 'horizontal' | 'grid' | 'vertical' | 'single'

export interface ResponseGroupContainerProps {
  responses: Message[]
  selectedResponseId: MessageId | null
  onSelectResponse: (messageId: MessageId) => void
  layoutMode?: LayoutMode
  isStreaming?: boolean
  className?: string
}

/**
 * Container for displaying parallel responses
 * Manages layout, selection UI, and expandable alternatives
 */
export function ResponseGroupContainer({
  responses,
  selectedResponseId,
  onSelectResponse,
  layoutMode = 'horizontal',
  isStreaming = false,
  className,
}: ResponseGroupContainerProps) {
  const [showAlternatives, setShowAlternatives] = useState(selectedResponseId === null)
  const [singleViewIndex, setSingleViewIndex] = useState(0)

  const selectedResponse = responses.find(r => r.id === selectedResponseId)
  const alternatives = responses.filter(r => r.id !== selectedResponseId)

  // If only one response, render it directly
  if (responses.length === 1 && selectedResponseId) {
    return (
      <ResponseCard
        message={responses[0]}
        isSelected
        onSelect={() => {}}
        isStreaming={isStreaming}
        showSelection={false}
        className={className}
      />
    )
  }

  // No selection yet - show all responses with selection prompt
  if (!selectedResponseId) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="text-sm text-gray-600 px-4">
          Choose a response to continue the conversation
        </div>

        {/* Display all responses in chosen layout */}
        <div
          className={cn(
            'gap-4 px-4',
            layoutMode === 'grid' && 'grid grid-cols-2',
            layoutMode === 'horizontal' && 'flex overflow-x-auto snap-x snap-mandatory gap-4 pb-2',
            layoutMode === 'vertical' && 'flex flex-col gap-4',
            layoutMode === 'single' && 'relative'
          )}
        >
          {layoutMode === 'single' ? (
            <>
              {/* Single mode with navigation */}
              {responses[singleViewIndex] && (
                <ResponseCard
                  message={responses[singleViewIndex]}
                  isSelected={false}
                  onSelect={() => onSelectResponse(responses[singleViewIndex].id as MessageId)}
                  isStreaming={isStreaming && responses.length - 1 === singleViewIndex}
                />
              )}

              {/* Navigation arrows */}
              {responses.length > 1 && (
                <>
                  {singleViewIndex > 0 && (
                    <button
                      onClick={() => setSingleViewIndex(i => Math.max(0, i - 1))}
                      className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 p-2 rounded-full hover:bg-gray-100"
                    >
                      <ChevronLeft size={20} />
                    </button>
                  )}
                  {singleViewIndex < responses.length - 1 && (
                    <button
                      onClick={() => setSingleViewIndex(i => Math.min(responses.length - 1, i + 1))}
                      className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 p-2 rounded-full hover:bg-gray-100"
                    >
                      <ChevronRight size={20} />
                    </button>
                  )}
                </>
              )}

              {/* Pagination dots */}
              {responses.length > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                  {responses.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSingleViewIndex(idx)}
                      className={cn(
                        'w-2 h-2 rounded-full transition-colors',
                        idx === singleViewIndex ? 'bg-gray-800' : 'bg-gray-300'
                      )}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            responses.map(response => (
              <div
                key={response.id}
                className={cn(layoutMode === 'horizontal' && 'flex-shrink-0 w-96 snap-start')}
              >
                <ResponseCard
                  message={response}
                  isSelected={false}
                  onSelect={() => onSelectResponse(response.id as MessageId)}
                  isStreaming={isStreaming && responses.indexOf(response) === responses.length - 1}
                />
              </div>
            ))
          )}
        </div>
      </div>
    )
  }

  // Selected response + collapsed alternatives
  return (
    <div className={cn('space-y-4', className)}>
      {/* Selected response */}
      <div className="px-4">
        {selectedResponse && (
          <ResponseCard
            message={selectedResponse}
            isSelected
            onSelect={() => {}}
            isStreaming={isStreaming}
          />
        )}
      </div>

      {/* Alternatives section */}
      {alternatives.length > 0 && (
        <div className="px-4">
          <button
            onClick={() => setShowAlternatives(!showAlternatives)}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          >
            {showAlternatives ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            <span>
              {alternatives.length} alternative response{alternatives.length > 1 ? 's' : ''}
            </span>
          </button>

          {showAlternatives && (
            <div
              className={cn(
                'mt-3 gap-4 animate-in fade-in',
                layoutMode === 'grid' && 'grid grid-cols-2',
                layoutMode === 'horizontal' && 'flex overflow-x-auto snap-x gap-4 pb-2',
                layoutMode === 'vertical' && 'flex flex-col gap-4',
                layoutMode === 'single' && 'flex flex-col gap-4'
              )}
            >
              {alternatives.map(response => (
                <div
                  key={response.id}
                  className={cn(layoutMode === 'horizontal' && 'flex-shrink-0 w-96 snap-start')}
                >
                  <ResponseCard
                    message={response}
                    isSelected={false}
                    onSelect={() => onSelectResponse(response.id as MessageId)}
                    compact
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
