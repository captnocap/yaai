// =============================================================================
// GET CODE MODAL
// =============================================================================
// Modal for exporting prompts as code snippets.

import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Code } from 'lucide-react';
import type { CodeExportFormat } from '../../../types/workbench';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface GetCodeModalProps {
  onClose: () => void;
  onGetCode: (format: CodeExportFormat) => Promise<string>;
}

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

const FORMATS: { value: CodeExportFormat; label: string; icon: string }[] = [
  { value: 'curl', label: 'cURL', icon: 'curl' },
  { value: 'python', label: 'Python', icon: 'py' },
  { value: 'typescript', label: 'TypeScript', icon: 'ts' },
  { value: 'node', label: 'Node.js', icon: 'js' },
];

export function GetCodeModal({ onClose, onGetCode }: GetCodeModalProps) {
  const [format, setFormat] = useState<CodeExportFormat>('python');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate code when format changes
  useEffect(() => {
    setLoading(true);
    setError(null);

    onGetCode(format)
      .then(setCode)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [format, onGetCode]);

  const handleCopy = async () => {
    if (code) {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Handle escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-[800px] max-h-[80vh] bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-3">
            <Code size={20} className="text-[var(--color-accent)]" />
            <h2 className="text-lg font-semibold text-[var(--color-text)]">
              Get Code
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors"
          >
            <X size={18} className="text-[var(--color-text-secondary)]" />
          </button>
        </div>

        {/* Format tabs */}
        <div className="flex items-center gap-1 px-6 py-3 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
          {FORMATS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFormat(f.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                format === f.value
                  ? 'bg-[var(--color-bg)] text-[var(--color-text)] shadow-sm'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Code content */}
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-[var(--color-border)] border-t-[var(--color-accent)] rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="h-64 flex items-center justify-center text-red-500">
              {error}
            </div>
          ) : (
            <div className="h-full overflow-auto">
              <pre className="p-6 text-sm text-[var(--color-text)] font-mono leading-relaxed whitespace-pre-wrap">
                {code}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
          <p className="text-xs text-[var(--color-text-secondary)]">
            API key placeholder: <code className="text-amber-500">$ANTHROPIC_API_KEY</code>
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCopy}
              disabled={!code || loading}
              className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {copied ? (
                <>
                  <Check size={14} />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={14} />
                  <span>Copy Code</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
