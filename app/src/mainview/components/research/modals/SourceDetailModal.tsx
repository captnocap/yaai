// =============================================================================
// SOURCE DETAIL MODAL
// =============================================================================
// Modal showing full details of a source including all findings and context.

import { X, ExternalLink, Sparkles, Clock, CheckCircle, AlertCircle, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import type { Source } from '../../../../shared/research-types';
import { SourceStateBadge } from '../sources/SourceStateIndicator';

interface SourceDetailModalProps {
  source: Source;
  citationNumber?: number;
  onClose: () => void;
}

export function SourceDetailModal({ source, citationNumber, onClose }: SourceDetailModalProps) {
  const [copied, setCopied] = useState(false);

  const faviconUrl = `https://www.google.com/s2/favicons?domain=${source.domain}&sz=64`;

  const handleCopyUrl = async () => {
    await navigator.clipboard.writeText(source.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return 'Unknown';
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[85vh] mx-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <header className="flex items-start justify-between px-6 py-4 border-b border-[var(--color-border)]">
          <div className="flex items-start gap-3">
            {citationNumber && (
              <div className="w-8 h-8 rounded-full bg-[var(--color-accent)]/20 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-[var(--color-accent)]">
                  {citationNumber}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <img
                  src={faviconUrl}
                  alt=""
                  className="w-5 h-5 rounded"
                  loading="lazy"
                />
                <SourceStateBadge state={source.state} />
              </div>
              <h2 className="text-lg font-semibold text-[var(--color-text)] line-clamp-2">
                {source.title}
              </h2>
              <p className="text-sm text-[var(--color-text-tertiary)]">
                {source.domain}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-[var(--color-text-tertiary)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-tertiary)] transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* URL with copy */}
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wide mb-2">
              Source URL
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-sm text-[var(--color-text-secondary)] truncate">
                {source.url}
              </div>
              <button
                onClick={handleCopyUrl}
                className="p-2 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
                title="Copy URL"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
                title="Open in new tab"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)]">
              <div className="text-xs text-[var(--color-text-tertiary)] uppercase tracking-wide mb-1">
                Relevance Score
              </div>
              <div className="text-lg font-semibold text-[var(--color-text)]">
                {Math.round(source.relevanceScore * 100)}%
              </div>
            </div>
            <div className="p-3 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)]">
              <div className="text-xs text-[var(--color-text-tertiary)] uppercase tracking-wide mb-1">
                Findings Extracted
              </div>
              <div className="text-lg font-semibold text-[var(--color-text)]">
                {source.findings.length}
              </div>
            </div>
          </div>

          {/* Snippet */}
          {source.snippet && (
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wide mb-2">
                Snippet
              </label>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed p-3 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)]">
                {source.snippet}
              </p>
            </div>
          )}

          {/* Findings */}
          {source.findings.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <label className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wide">
                  Extracted Findings ({source.findings.length})
                </label>
              </div>
              <div className="space-y-3">
                {source.findings.map((finding) => (
                  <div
                    key={finding.id}
                    className="p-3 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)]"
                  >
                    <p className="text-sm text-[var(--color-text)] mb-2">
                      {finding.claim}
                    </p>
                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${
                          finding.confidence >= 0.8
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : finding.confidence >= 0.6
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-gray-500/20 text-gray-400'
                        }`}
                      >
                        {finding.confidence >= 0.8 ? (
                          <CheckCircle className="w-3 h-3" />
                        ) : finding.confidence >= 0.6 ? (
                          <AlertCircle className="w-3 h-3" />
                        ) : null}
                        {Math.round(finding.confidence * 100)}% confidence
                      </span>
                      {finding.extractedAt && (
                        <span className="flex items-center gap-1 text-[10px] text-[var(--color-text-tertiary)]">
                          <Clock className="w-3 h-3" />
                          {formatDate(finding.extractedAt)}
                        </span>
                      )}
                    </div>
                    {finding.supportingQuote && (
                      <blockquote className="mt-2 pl-3 border-l-2 border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] italic">
                        "{finding.supportingQuote}"
                      </blockquote>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="flex items-center justify-end px-6 py-4 border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[var(--color-accent)] text-white hover:brightness-110 transition-all"
          >
            <ExternalLink className="w-4 h-4" />
            View Full Source
          </a>
        </footer>
      </div>
    </div>
  );
}

export default SourceDetailModal;
