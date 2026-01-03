// =============================================================================
// CITATION LINK
// =============================================================================
// Inline citation marker [1] that shows source preview on hover.

import { useState, useRef } from 'react';
import type { Source } from '../../../../shared/research-types';
import { CitationTooltip } from './CitationTooltip';

interface CitationLinkProps {
  number: number;
  source: Source;
  onClick?: (source: Source) => void;
}

export function CitationLink({ number, source, onClick }: CitationLinkProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const linkRef = useRef<HTMLButtonElement>(null);

  const handleMouseEnter = () => {
    if (linkRef.current) {
      const rect = linkRef.current.getBoundingClientRect();
      setTooltipPosition({
        x: rect.left + rect.width / 2,
        y: rect.top,
      });
    }
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  return (
    <>
      <button
        ref={linkRef}
        onClick={() => onClick?.(source)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 mx-0.5 rounded text-[10px] font-semibold bg-[var(--color-accent)]/20 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/30 transition-colors cursor-pointer"
        title={source.title}
      >
        {number}
      </button>

      {showTooltip && (
        <CitationTooltip
          source={source}
          position={tooltipPosition}
          onClose={() => setShowTooltip(false)}
        />
      )}
    </>
  );
}

// Render citations from text containing [n] markers
interface CitationRendererProps {
  text: string;
  sources: Source[];
  onSourceClick?: (source: Source) => void;
}

export function CitationRenderer({ text, sources, onSourceClick }: CitationRendererProps) {
  // Match citation markers like [1], [2], etc.
  const parts = text.split(/(\[\d+\])/g);

  return (
    <>
      {parts.map((part, index) => {
        const match = part.match(/^\[(\d+)\]$/);
        if (match) {
          const citationNum = parseInt(match[1], 10);
          const source = sources[citationNum - 1]; // Citations are 1-indexed
          if (source) {
            return (
              <CitationLink
                key={index}
                number={citationNum}
                source={source}
                onClick={onSourceClick}
              />
            );
          }
          // Fallback for missing source
          return (
            <span
              key={index}
              className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 mx-0.5 rounded text-[10px] font-semibold bg-gray-500/20 text-gray-400"
            >
              {citationNum}
            </span>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </>
  );
}

export default CitationLink;
