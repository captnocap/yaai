// =============================================================================
// SOURCE CARD
// =============================================================================
// Card displaying a discovered source with its state, findings, and actions.

import { ExternalLink, ThumbsUp, ThumbsDown, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { useState } from 'react';
import type { Source, SourceState } from '../../../../shared/research-types';
import { SourceStateIndicator } from './SourceStateIndicator';

interface SourceCardProps {
  source: Source;
  onApprove?: (sourceId: string) => void;
  onReject?: (sourceId: string) => void;
  onClick?: (source: Source) => void;
  compact?: boolean;
}

export function SourceCard({
  source,
  onApprove,
  onReject,
  onClick,
  compact = false,
}: SourceCardProps) {
  const [expanded, setExpanded] = useState(false);

  const canApprove = source.state === 'pending';
  const hasFindings = source.findings.length > 0;
  const isInteractive = source.state !== 'rejected';

  // Get favicon URL from domain
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${source.domain}&sz=32`;

  // Format relevance score as percentage
  const relevancePercent = Math.round(source.relevanceScore * 100);

  // Get state-specific border color
  const getBorderColor = (state: SourceState): string => {
    switch (state) {
      case 'reading':
        return 'border-purple-500/50';
      case 'complete':
        return 'border-emerald-500/30';
      case 'failed':
        return 'border-red-500/30';
      case 'rejected':
        return 'border-gray-500/20';
      default:
        return 'border-[var(--color-border)]';
    }
  };

  // Get background for reading state
  const getBackground = (state: SourceState): string => {
    if (state === 'reading') {
      return 'bg-gradient-to-r from-purple-500/5 to-transparent';
    }
    return 'bg-[var(--color-bg-secondary)]';
  };

  return (
    <article
      className={`
        group relative rounded-lg border transition-all duration-200
        ${getBorderColor(source.state)}
        ${getBackground(source.state)}
        ${isInteractive ? 'hover:border-[var(--color-border-hover)] cursor-pointer' : 'opacity-60'}
        ${source.state === 'reading' ? 'ring-1 ring-purple-500/20' : ''}
      `}
      onClick={() => onClick?.(source)}
    >
      {/* Reading progress bar */}
      {source.state === 'reading' && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-[var(--color-bg-tertiary)] overflow-hidden rounded-t-lg">
          <div
            className="h-full bg-purple-500 animate-pulse"
            style={{ width: `${Math.random() * 60 + 20}%` }}
          />
        </div>
      )}

      <div className={`${compact ? 'p-2' : 'p-3'}`}>
        <div className="flex items-start gap-3">
          {/* Favicon */}
          <img
            src={faviconUrl}
            alt=""
            className="w-5 h-5 rounded mt-0.5 flex-shrink-0"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%236b7280"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>';
            }}
          />

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Title */}
            <h4 className="text-sm font-medium text-[var(--color-text)] truncate group-hover:text-[var(--color-accent)] transition-colors">
              {source.title}
            </h4>

            {/* Domain & Relevance */}
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-[var(--color-text-tertiary)] truncate">
                {source.domain}
              </span>
              {source.relevanceScore > 0 && (
                <>
                  <span className="text-[var(--color-text-tertiary)]">·</span>
                  <span
                    className={`text-xs font-medium ${
                      relevancePercent >= 80
                        ? 'text-emerald-400'
                        : relevancePercent >= 60
                          ? 'text-amber-400'
                          : 'text-gray-400'
                    }`}
                  >
                    {relevancePercent}% match
                  </span>
                </>
              )}
            </div>

            {/* Snippet (when not compact) */}
            {!compact && source.snippet && (
              <p className="mt-1.5 text-xs text-[var(--color-text-secondary)] line-clamp-2">
                {source.snippet}
              </p>
            )}

            {/* Findings preview */}
            {hasFindings && !expanded && (
              <div className="mt-2 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span className="text-xs text-[var(--color-text-secondary)]">
                  {source.findings.length} finding{source.findings.length !== 1 ? 's' : ''} extracted
                </span>
              </div>
            )}
          </div>

          {/* State Indicator */}
          <SourceStateIndicator state={source.state} />
        </div>

        {/* Expanded findings */}
        {expanded && hasFindings && (
          <div className="mt-3 pt-3 border-t border-[var(--color-border)] space-y-2">
            {source.findings.map((finding) => (
              <div
                key={finding.id}
                className="pl-3 border-l-2 border-amber-500/50"
              >
                <p className="text-xs text-[var(--color-text)]">
                  {finding.claim}
                </p>
                <span
                  className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                    finding.confidence >= 0.8
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : finding.confidence >= 0.6
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-gray-500/20 text-gray-400'
                  }`}
                >
                  {Math.round(finding.confidence * 100)}% confidence
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Footer with actions */}
        {(canApprove || hasFindings) && (
          <div className="mt-3 pt-3 border-t border-[var(--color-border)] flex items-center justify-between">
            {/* Expand toggle for findings */}
            <div>
              {hasFindings && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpanded(!expanded);
                  }}
                  className="flex items-center gap-1 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors"
                >
                  {expanded ? (
                    <>
                      <ChevronUp className="w-3.5 h-3.5" />
                      Hide findings
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3.5 h-3.5" />
                      Show findings
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Approve/Reject buttons */}
            {canApprove && (
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onReject?.(source.id);
                  }}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs text-[var(--color-text-secondary)] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  title="Reject source"
                >
                  <ThumbsDown className="w-3.5 h-3.5" />
                  Skip
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onApprove?.(source.id);
                  }}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs text-[var(--color-text-secondary)] hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                  title="Approve for reading"
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  Read
                </button>
              </div>
            )}

            {/* External link for completed sources */}
            {source.state === 'complete' && (
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-accent)] transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                View source
              </a>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

export default SourceCard;
