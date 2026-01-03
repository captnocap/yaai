// =============================================================================
// EXPORT MODAL
// =============================================================================
// Modal for exporting research reports in various formats.

import { useState } from 'react';
import { X, FileText, FileCode, Globe, Download, Check, Loader2 } from 'lucide-react';
import type { Report, Source, ExportFormat } from '../../../../shared/research-types';

interface ExportModalProps {
  report: Report;
  sources: Source[];
  onExport: (format: ExportFormat) => Promise<void>;
  onClose: () => void;
}

interface FormatOption {
  format: ExportFormat;
  icon: React.ElementType;
  label: string;
  description: string;
  extension: string;
}

const formatOptions: FormatOption[] = [
  {
    format: 'markdown',
    icon: FileText,
    label: 'Markdown',
    description: 'Plain text with formatting, great for notes and documentation',
    extension: '.md',
  },
  {
    format: 'pdf',
    icon: FileCode,
    label: 'PDF Document',
    description: 'Formatted document for printing and sharing',
    extension: '.pdf',
  },
  {
    format: 'html',
    icon: Globe,
    label: 'Interactive HTML',
    description: 'Web page with clickable citations and collapsible sections',
    extension: '.html',
  },
];

export function ExportModal({ report, sources, onExport, onClose }: ExportModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('markdown');
  const [includeOptions, setIncludeOptions] = useState({
    citations: true,
    findings: true,
    sourceDetails: false,
    metadata: true,
  });
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      await onExport(selectedFormat);
      setExported(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExporting(false);
    }
  };

  const selectedOption = formatOptions.find((o) => o.format === selectedFormat);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] shadow-2xl overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--color-accent)]/20 flex items-center justify-center">
              <Download className="w-5 h-5 text-[var(--color-accent)]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--color-text)]">
                Export Research
              </h2>
              <p className="text-sm text-[var(--color-text-secondary)]">
                {report.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-[var(--color-text-tertiary)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Format selection */}
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wide mb-3">
              Export Format
            </label>
            <div className="grid grid-cols-3 gap-3">
              {formatOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = selectedFormat === option.format;

                return (
                  <button
                    key={option.format}
                    onClick={() => setSelectedFormat(option.format)}
                    className={`p-3 rounded-lg border-2 transition-all text-center ${
                      isSelected
                        ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10'
                        : 'border-[var(--color-border)] hover:border-[var(--color-border-hover)] bg-[var(--color-bg-secondary)]'
                    }`}
                  >
                    <Icon
                      className={`w-6 h-6 mx-auto mb-2 ${
                        isSelected
                          ? 'text-[var(--color-accent)]'
                          : 'text-[var(--color-text-secondary)]'
                      }`}
                    />
                    <span
                      className={`text-sm font-medium ${
                        isSelected
                          ? 'text-[var(--color-accent)]'
                          : 'text-[var(--color-text)]'
                      }`}
                    >
                      {option.label}
                    </span>
                  </button>
                );
              })}
            </div>
            {selectedOption && (
              <p className="mt-2 text-xs text-[var(--color-text-tertiary)]">
                {selectedOption.description}
              </p>
            )}
          </div>

          {/* Include options */}
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wide mb-3">
              Include in Export
            </label>
            <div className="space-y-2">
              {Object.entries(includeOptions).map(([key, value]) => {
                const labels: Record<string, string> = {
                  citations: 'Inline citations',
                  findings: 'Key findings from each source',
                  sourceDetails: 'Full source details',
                  metadata: 'Research metadata (date, duration, costs)',
                };

                return (
                  <label
                    key={key}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--color-bg-secondary)] cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={(e) =>
                        setIncludeOptions((prev) => ({
                          ...prev,
                          [key]: e.target.checked,
                        }))
                      }
                      className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-accent)] focus:ring-[var(--color-accent)] focus:ring-offset-0"
                    />
                    <span className="text-sm text-[var(--color-text)]">
                      {labels[key]}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Summary */}
          <div className="p-3 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)]">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--color-text-tertiary)]">
                {report.sections.length} sections
              </span>
              <span className="text-[var(--color-text-tertiary)]">
                {sources.filter((s) => s.state === 'complete').length} sources
              </span>
              <span className="text-[var(--color-text-secondary)] font-medium">
                {selectedOption?.extension}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="flex items-center justify-between px-6 py-4 border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
          <button
            onClick={onClose}
            disabled={exporting}
            className="px-4 py-2 rounded-lg text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-tertiary)] transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={exporting || exported}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[var(--color-accent)] text-white hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {exported ? (
              <>
                <Check className="w-4 h-4" />
                Exported!
              </>
            ) : exporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Export {selectedOption?.label}
              </>
            )}
          </button>
        </footer>
      </div>
    </div>
  );
}

export default ExportModal;
