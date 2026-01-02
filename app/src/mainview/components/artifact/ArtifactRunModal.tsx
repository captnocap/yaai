// =============================================================================
// ARTIFACT RUN MODAL
// =============================================================================
// Modal dialog for running an artifact with input parameters.

import React from 'react';
import { ArtifactInputForm } from './ArtifactInputForm';
import type { ArtifactManifest } from '../../types';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface ArtifactRunModalProps {
  /** Artifact to run */
  manifest: ArtifactManifest;

  /** Called when form is submitted */
  onRun: (input: Record<string, unknown>) => void;

  /** Called when modal is closed */
  onClose: () => void;

  /** Whether artifact is currently running */
  loading?: boolean;
}

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function ArtifactRunModal({
  manifest,
  onRun,
  onClose,
  loading = false,
}: ArtifactRunModalProps) {
  const hasInput = manifest.input && 'schema' in manifest.input;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) {
          onClose();
        }
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-[var(--color-bg-elevated)] rounded-[var(--radius-lg)] shadow-xl border border-[var(--color-border)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-bg-tertiary)]">
          <div className="flex items-center gap-2">
            {manifest.icon && (
              <span className="text-lg">{manifest.icon}</span>
            )}
            <div>
              <h3 className="text-sm font-semibold text-[var(--color-text)]">
                Run {manifest.name}
              </h3>
              <p className="text-xs text-[var(--color-text-tertiary)]">
                v{manifest.version}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1 text-[var(--color-text-tertiary)] hover:text-[var(--color-text)] rounded transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 max-h-[60vh] overflow-y-auto">
          {hasInput ? (
            <ArtifactInputForm
              schema={manifest.input!}
              onSubmit={onRun}
              onCancel={onClose}
              loading={loading}
              submitLabel="Run"
            />
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-[var(--color-text-secondary)] mb-4">
                {manifest.description}
              </p>
              <p className="text-xs text-[var(--color-text-tertiary)] mb-6">
                This artifact requires no input parameters.
              </p>
              <div className="flex justify-center gap-2">
                <button
                  onClick={onClose}
                  disabled={loading}
                  className="px-4 py-2 text-sm border border-[var(--color-border)] rounded-[var(--radius-md)] hover:bg-[var(--color-bg-tertiary)] disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => onRun({})}
                  disabled={loading}
                  className="px-4 py-2 text-sm bg-[var(--color-accent)] text-white rounded-[var(--radius-md)] hover:opacity-90 disabled:opacity-50"
                >
                  {loading ? 'Running...' : 'Run'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
