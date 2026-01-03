// =============================================================================
// CITATION TOOLTIP
// =============================================================================
// Hover preview popup showing source details and key findings.

import { createPortal } from 'react-dom';
import { ExternalLink, Sparkles } from 'lucide-react';
import type { Source } from '../../../../shared/research-types';

interface CitationTooltipProps {
  source: Source;
  position: { x: number; y: number };
  onClose: () => void;
}

export function CitationTooltip({ source, position, onClose }: CitationTooltipProps) {
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${source.domain}&sz=32`;

  // Calculate position - show above the citation link
  const tooltipStyle: React.CSSProperties = {
    position: 'fixed',
    left: position.x,
    top: position.y - 8,
    transform: 'translate(-50%, -100%)',
    zIndex: 9999,
  };

  return createPortal(
    <div
      style={tooltipStyle}
      className="w-72 p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] shadow-xl animate-in fade-in zoom-in-95 duration-150"
      onMouseEnter={(e) => e.stopPropagation()}
      onMouseLeave={onClose}
    >
      {/* Arrow */}
      <div
        className="absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-full w-0 h-0"
        style={{
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderTop: '6px solid var(--color-border)',
        }}
      />
      <div
        className="absolute left-1/2 -translate-x-1/2 bottom-0.5 translate-y-full w-0 h-0"
        style={{
          borderLeft: '5px solid transparent',
          borderRight: '5px solid transparent',
          borderTop: '5px solid var(--color-bg-primary)',
        }}
      />

      {/* Header */}
      <div className="flex items-start gap-2 mb-2">
        <img
          src={faviconUrl}
          alt=""
          className="w-4 h-4 rounded mt-0.5 flex-shrink-0"
          loading="lazy"
        />
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-[var(--color-text)] line-clamp-2">
            {source.title}
          </h4>
          <p className="text-xs text-[var(--color-text-tertiary)] truncate">
            {source.domain}
          </p>
        </div>
      </div>

      {/* Snippet */}
      {source.snippet && (
        <p className="text-xs text-[var(--color-text-secondary)] line-clamp-3 mb-2">
          {source.snippet}
        </p>
      )}

      {/* Key findings */}
      {source.findings.length > 0 && (
        <div className="pt-2 border-t border-[var(--color-border)]">
          <div className="flex items-center gap-1 mb-1.5">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span className="text-[10px] font-medium text-[var(--color-text-tertiary)] uppercase tracking-wide">
              Key findings
            </span>
          </div>
          <div className="space-y-1">
            {source.findings.slice(0, 2).map((finding) => (
              <p
                key={finding.id}
                className="text-xs text-[var(--color-text-secondary)] line-clamp-2 pl-2 border-l border-amber-500/50"
              >
                {finding.claim}
              </p>
            ))}
            {source.findings.length > 2 && (
              <p className="text-[10px] text-[var(--color-text-tertiary)]">
                +{source.findings.length - 2} more findings
              </p>
            )}
          </div>
        </div>
      )}

      {/* Footer with link */}
      <div className="mt-2 pt-2 border-t border-[var(--color-border)]">
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-[var(--color-accent)] hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="w-3 h-3" />
          View source
        </a>
      </div>
    </div>,
    document.body
  );
}

export default CitationTooltip;
