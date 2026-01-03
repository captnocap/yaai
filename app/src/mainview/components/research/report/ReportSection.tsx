// =============================================================================
// REPORT SECTION
// =============================================================================
// Collapsible section of the research report with markdown content.

import { useState } from 'react';
import { ChevronDown, ChevronRight, Sparkles, AlertTriangle } from 'lucide-react';
import type { ReportSection as ReportSectionType, Source, Contradiction } from '../../../../shared/research-types';
import { CitationRenderer } from './CitationLink';
import { ContradictionCallout } from './ContradictionCallout';

interface ReportSectionProps {
  section: ReportSectionType;
  sources: Source[];
  contradictions?: Contradiction[];
  onSourceClick?: (source: Source) => void;
  onResolveContradiction?: (contradiction: Contradiction) => void;
  defaultExpanded?: boolean;
  isStreaming?: boolean;
}

export function ReportSection({
  section,
  sources,
  contradictions = [],
  onSourceClick,
  onResolveContradiction,
  defaultExpanded = true,
  isStreaming = false,
}: ReportSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Get contradictions related to this section
  const sectionContradictions = contradictions.filter(
    (c) => c.topic.toLowerCase().includes(section.title.toLowerCase())
  );

  // Get finding count for this section
  const findingCount = section.citations.length;
  const hasUnresolvedContradictions = sectionContradictions.some(
    (c) => !c.resolution
  );

  return (
    <article className="border border-[var(--color-border)] rounded-lg overflow-hidden">
      {/* Section header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-tertiary)] transition-colors text-left"
      >
        {/* Expand/collapse icon */}
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-[var(--color-text-tertiary)] flex-shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-[var(--color-text-tertiary)] flex-shrink-0" />
        )}

        {/* Title */}
        <h3 className="flex-1 text-sm font-semibold text-[var(--color-text)]">
          {section.title}
        </h3>

        {/* Badges */}
        <div className="flex items-center gap-2">
          {/* Finding count */}
          {findingCount > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--color-accent)]/20 text-[var(--color-accent)]">
              <Sparkles className="w-3 h-3" />
              {findingCount} source{findingCount !== 1 ? 's' : ''}
            </span>
          )}

          {/* Contradiction warning */}
          {hasUnresolvedContradictions && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/20 text-amber-400">
              <AlertTriangle className="w-3 h-3" />
              Conflict
            </span>
          )}

          {/* Streaming indicator */}
          {isStreaming && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          )}
        </div>
      </button>

      {/* Section content */}
      {isExpanded && (
        <div className="px-4 py-4 space-y-4">
          {/* Main content with citations */}
          <div className="prose prose-sm prose-invert max-w-none">
            {section.content.split('\n\n').map((paragraph, i) => (
              <p key={i} className="text-sm text-[var(--color-text-secondary)] leading-relaxed mb-3 last:mb-0">
                <CitationRenderer
                  text={paragraph}
                  sources={sources}
                  onSourceClick={onSourceClick}
                />
              </p>
            ))}

            {/* Streaming cursor */}
            {isStreaming && (
              <span className="inline-block w-2 h-4 bg-[var(--color-accent)] animate-pulse ml-0.5" />
            )}
          </div>

          {/* Contradictions in this section */}
          {sectionContradictions.length > 0 && (
            <div className="space-y-3 pt-3 border-t border-[var(--color-border)]">
              <h4 className="text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wide">
                Conflicting Sources
              </h4>
              {sectionContradictions.map((contradiction) => (
                <ContradictionCallout
                  key={contradiction.id}
                  contradiction={contradiction}
                  sources={sources}
                  onResolve={onResolveContradiction}
                />
              ))}
            </div>
          )}

          {/* Citation references at bottom of section */}
          {section.citations.length > 0 && (
            <div className="pt-3 border-t border-[var(--color-border)]">
              <h4 className="text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wide mb-2">
                Sources in this section
              </h4>
              <div className="flex flex-wrap gap-2">
                {section.citations.map((citationNum) => {
                  const source = sources[citationNum - 1];
                  if (!source) return null;
                  return (
                    <button
                      key={citationNum}
                      onClick={() => onSourceClick?.(source)}
                      className="flex items-center gap-1.5 px-2 py-1 rounded bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-secondary)] transition-colors text-xs"
                    >
                      <span className="w-4 h-4 rounded-full bg-[var(--color-accent)]/20 text-[var(--color-accent)] text-[10px] font-semibold flex items-center justify-center">
                        {citationNum}
                      </span>
                      <span className="text-[var(--color-text-secondary)] truncate max-w-[150px]">
                        {source.domain}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

export default ReportSection;
