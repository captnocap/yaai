// =============================================================================
// REPORT VIEW
// =============================================================================
// Main container for the research report, handling progressive rendering.

import { FileText, Sparkles, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import type { Report, Source, Contradiction, SessionStatus } from '../../../../shared/research-types';
import { ReportSection } from './ReportSection';

interface ReportViewProps {
  report: Report | null;
  sources: Source[];
  contradictions: Contradiction[];
  status: SessionStatus;
  onSourceClick?: (source: Source) => void;
  onResolveContradiction?: (contradiction: Contradiction) => void;
}

export function ReportView({
  report,
  sources,
  contradictions,
  status,
  onSourceClick,
  onResolveContradiction,
}: ReportViewProps) {
  const isGenerating = status === 'synthesizing';
  const isComplete = status === 'completed';
  const isRunning = ['scouting', 'reading', 'synthesizing'].includes(status);

  // Calculate stats
  const totalSections = report?.sections.length || 0;
  const completedSources = sources.filter((s) => s.state === 'complete').length;
  const totalFindings = sources.reduce((acc, s) => acc + s.findings.length, 0);
  const unresolvedContradictions = contradictions.filter((c) => !c.resolution).length;

  // No report yet
  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        {status === 'scouting' || status === 'reading' ? (
          <>
            <div className="w-16 h-16 rounded-full bg-[var(--color-bg-tertiary)] flex items-center justify-center mb-4">
              <Loader2 className="w-8 h-8 text-[var(--color-accent)] animate-spin" />
            </div>
            <h3 className="text-lg font-medium text-[var(--color-text)] mb-2">
              Gathering Information
            </h3>
            <p className="text-sm text-[var(--color-text-secondary)] max-w-md">
              {status === 'scouting'
                ? 'Scouts are discovering relevant sources. The report will begin once reading starts.'
                : 'Reading and extracting insights from sources. The report will appear shortly.'}
            </p>
            <div className="mt-6 flex items-center gap-6 text-xs text-[var(--color-text-tertiary)]">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                {completedSources} sources read
              </span>
              <span className="flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-emerald-400" />
                {totalFindings} findings
              </span>
            </div>
          </>
        ) : status === 'idle' || status === 'initializing' ? (
          <>
            <div className="w-16 h-16 rounded-full bg-[var(--color-bg-tertiary)] flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-[var(--color-text-tertiary)]" />
            </div>
            <h3 className="text-lg font-medium text-[var(--color-text)] mb-2">
              No Report Yet
            </h3>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Start a research session to generate a comprehensive report.
            </p>
          </>
        ) : status === 'paused' ? (
          <>
            <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-amber-400" />
            </div>
            <h3 className="text-lg font-medium text-[var(--color-text)] mb-2">
              Research Paused
            </h3>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Resume the session to continue generating the report.
            </p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-red-400" />
            </div>
            <h3 className="text-lg font-medium text-[var(--color-text)] mb-2">
              Research Failed
            </h3>
            <p className="text-sm text-[var(--color-text-secondary)]">
              An error occurred while generating the report.
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Report header */}
      <header className="flex-shrink-0 px-6 py-4 border-b border-[var(--color-border)]">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[var(--color-text)]">
              {report.title}
            </h2>
            {report.summary && (
              <p className="mt-1 text-sm text-[var(--color-text-secondary)] max-w-2xl">
                {report.summary}
              </p>
            )}
          </div>

          {/* Status badge */}
          {isComplete ? (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium">
              <CheckCircle className="w-3.5 h-3.5" />
              Complete
            </span>
          ) : isGenerating ? (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--color-accent)]/20 text-[var(--color-accent)] text-xs font-medium animate-pulse">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Writing...
            </span>
          ) : null}
        </div>

        {/* Stats row */}
        <div className="mt-4 flex items-center gap-6 text-xs">
          <span className="flex items-center gap-1.5 text-[var(--color-text-secondary)]">
            <FileText className="w-3.5 h-3.5 text-[var(--color-accent)]" />
            {totalSections} sections
          </span>
          <span className="flex items-center gap-1.5 text-[var(--color-text-secondary)]">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            {completedSources} sources
          </span>
          <span className="flex items-center gap-1.5 text-[var(--color-text-secondary)]">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            {totalFindings} findings
          </span>
          {unresolvedContradictions > 0 && (
            <span className="flex items-center gap-1.5 text-amber-400">
              <AlertTriangle className="w-3.5 h-3.5" />
              {unresolvedContradictions} conflict{unresolvedContradictions !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </header>

      {/* Sections list */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {report.sections.map((section, index) => (
          <ReportSection
            key={section.id}
            section={section}
            sources={sources}
            contradictions={contradictions}
            onSourceClick={onSourceClick}
            onResolveContradiction={onResolveContradiction}
            defaultExpanded={index < 3} // First 3 sections expanded by default
            isStreaming={isGenerating && index === report.sections.length - 1}
          />
        ))}

        {/* Loading more sections indicator */}
        {isGenerating && (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
              <Loader2 className="w-4 h-4 animate-spin" />
              Synthesizing more sections...
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ReportView;
