// =============================================================================
// ARTIFACT MANAGER
// =============================================================================
// Orchestrates the artifact panel - list view, detail view, and renderer.
// Manages artifact state and coordinates with the layout system.

import React, { useState, useCallback } from 'react';
import { ArtifactList, type ArtifactWithStatus } from './ArtifactList';
import { ArtifactCard } from './ArtifactCard';
import { ArtifactRenderer, ArtifactStaticRenderer } from './ArtifactRenderer';
import type { ArtifactManifest, ArtifactExecutionResult } from '../../types';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export type ArtifactManagerView = 'list' | 'detail' | 'output';

export interface ArtifactManagerProps {
  /** Available artifacts */
  artifacts: ArtifactWithStatus[];

  /** Currently executing artifact results */
  executionResults?: Map<string, ArtifactExecutionResult>;

  /** Currently loading artifact UI code */
  loadingUI?: Set<string>;

  /** Compiled UI code for artifacts */
  artifactUICode?: Map<string, string>;

  /** Callbacks */
  onInvoke?: (id: string, input?: unknown) => void;
  onCancel?: (requestId: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onToggleEnabled?: (id: string, enabled: boolean) => void;
  onInstall?: (manifest: ArtifactManifest, files: unknown) => void;

  /** Initial view */
  initialView?: ArtifactManagerView;

  /** Initial selected artifact */
  initialSelectedId?: string;

  /** Whether to show header */
  showHeader?: boolean;

  className?: string;
  style?: React.CSSProperties;
}

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function ArtifactManager({
  artifacts,
  executionResults = new Map(),
  loadingUI = new Set(),
  artifactUICode = new Map(),
  onInvoke,
  onCancel,
  onEdit,
  onDelete,
  onToggleEnabled,
  onInstall,
  initialView = 'list',
  initialSelectedId,
  showHeader = true,
  className,
  style,
}: ArtifactManagerProps) {
  const [view, setView] = useState<ArtifactManagerView>(initialView);
  const [selectedId, setSelectedId] = useState<string | undefined>(initialSelectedId);

  // Get selected artifact
  const selectedArtifact = artifacts.find(a => a.manifest.id === selectedId);
  const selectedResult = selectedId ? executionResults.get(selectedId) : undefined;
  const selectedUICode = selectedId ? artifactUICode.get(selectedId) : undefined;
  const isLoadingUI = selectedId ? loadingUI.has(selectedId) : false;

  // Handle artifact selection
  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
    setView('detail');
  }, []);

  // Handle invoke
  const handleInvoke = useCallback((id: string) => {
    onInvoke?.(id);
    setView('output');
  }, [onInvoke]);

  // Handle back navigation
  const handleBack = useCallback(() => {
    if (view === 'output') {
      setView('detail');
    } else if (view === 'detail') {
      setView('list');
      setSelectedId(undefined);
    }
  }, [view]);

  // Render header
  const renderHeader = () => {
    if (!showHeader) return null;

    const titles: Record<ArtifactManagerView, string> = {
      list: 'Artifacts',
      detail: selectedArtifact?.manifest.name || 'Details',
      output: selectedArtifact?.manifest.name || 'Output',
    };

    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 16px',
        borderBottom: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-bg-tertiary)',
      }}>
        {/* Back button */}
        {view !== 'list' && (
          <button
            onClick={handleBack}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'transparent',
              color: 'var(--color-text-secondary)',
              cursor: 'pointer',
              fontSize: '16px',
            }}
          >
            ←
          </button>
        )}

        {/* Title */}
        <h3 style={{
          flex: 1,
          margin: 0,
          fontSize: '14px',
          fontWeight: 600,
          color: 'var(--color-text)',
        }}>
          {titles[view]}
        </h3>

        {/* Action buttons */}
        {view === 'list' && (
          <button
            onClick={() => console.log('Add artifact')}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              backgroundColor: 'var(--color-accent)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              color: 'white',
              cursor: 'pointer',
            }}
          >
            + Add
          </button>
        )}

        {view === 'detail' && selectedArtifact?.status === 'installed' && (
          <button
            onClick={() => selectedId && handleInvoke(selectedId)}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              backgroundColor: 'var(--color-accent)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              color: 'white',
              cursor: 'pointer',
            }}
          >
            Run
          </button>
        )}

        {view === 'output' && selectedResult?.success === false && (
          <button
            onClick={() => selectedId && handleInvoke(selectedId)}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              backgroundColor: 'var(--color-accent)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              color: 'white',
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        )}
      </div>
    );
  };

  // Render list view
  const renderListView = () => (
    <ArtifactList
      artifacts={artifacts}
      selectedId={selectedId}
      onSelect={handleSelect}
      onInvoke={handleInvoke}
      onEdit={onEdit}
      onDelete={onDelete}
      onToggleEnabled={onToggleEnabled}
    />
  );

  // Render detail view
  const renderDetailView = () => {
    if (!selectedArtifact) {
      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: 'var(--color-text-tertiary)',
          fontSize: '13px',
        }}>
          No artifact selected
        </div>
      );
    }

    return (
      <div style={{
        padding: '16px',
        overflow: 'auto',
        height: '100%',
      }}>
        {/* Card with full details */}
        <ArtifactCard
          manifest={selectedArtifact.manifest}
          status={selectedArtifact.status}
          onInvoke={() => handleInvoke(selectedArtifact.manifest.id)}
          onEdit={onEdit ? () => onEdit(selectedArtifact.manifest.id) : undefined}
          onDelete={onDelete ? () => onDelete(selectedArtifact.manifest.id) : undefined}
          onToggleEnabled={
            onToggleEnabled
              ? (enabled) => onToggleEnabled(selectedArtifact.manifest.id, enabled)
              : undefined
          }
        />

        {/* Additional info sections */}
        <div style={{ marginTop: '16px' }}>
          {/* Input schema */}
          {selectedArtifact.manifest.input && (
            <section style={{ marginBottom: '16px' }}>
              <h4 style={{
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--color-text-secondary)',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>
                Input
              </h4>
              <div style={{
                padding: '12px',
                backgroundColor: 'var(--color-bg-tertiary)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
              }}>
                <p style={{
                  margin: 0,
                  fontSize: '13px',
                  color: 'var(--color-text-secondary)',
                }}>
                  {selectedArtifact.manifest.input.description || 'No description'}
                </p>
              </div>
            </section>
          )}

          {/* Output schema */}
          {selectedArtifact.manifest.output && (
            <section style={{ marginBottom: '16px' }}>
              <h4 style={{
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--color-text-secondary)',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>
                Output
              </h4>
              <div style={{
                padding: '12px',
                backgroundColor: 'var(--color-bg-tertiary)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
              }}>
                <p style={{
                  margin: 0,
                  fontSize: '13px',
                  color: 'var(--color-text-secondary)',
                }}>
                  {selectedArtifact.manifest.output.description || 'No description'}
                </p>
              </div>
            </section>
          )}

          {/* Required APIs */}
          {selectedArtifact.manifest.apis && selectedArtifact.manifest.apis.length > 0 && (
            <section style={{ marginBottom: '16px' }}>
              <h4 style={{
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--color-text-secondary)',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>
                Required APIs
              </h4>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '6px',
              }}>
                {selectedArtifact.manifest.apis.map(api => (
                  <span
                    key={api}
                    style={{
                      padding: '4px 10px',
                      fontSize: '12px',
                      backgroundColor: 'var(--color-warning-subtle)',
                      color: 'var(--color-warning)',
                      borderRadius: '9999px',
                    }}
                  >
                    🔑 {api}
                  </span>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    );
  };

  // Render output view
  const renderOutputView = () => {
    if (!selectedArtifact) {
      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: 'var(--color-text-tertiary)',
          fontSize: '13px',
        }}>
          No artifact selected
        </div>
      );
    }

    // If artifact has a UI component, use ArtifactRenderer
    if (selectedArtifact.manifest.ui) {
      return (
        <ArtifactRenderer
          manifest={selectedArtifact.manifest}
          data={selectedResult?.data}
          componentCode={selectedUICode}
          loading={isLoadingUI || selectedArtifact.status === 'running'}
          error={selectedResult?.error?.message}
          onAction={(action, payload) => {
            console.log('Artifact action:', action, payload);
          }}
          onRefresh={(input) => {
            onInvoke?.(selectedArtifact.manifest.id, input);
          }}
          onError={(error) => {
            console.error('Artifact error:', error);
          }}
          style={{ height: '100%' }}
        />
      );
    }

    // Otherwise use static renderer
    return (
      <ArtifactStaticRenderer
        manifest={selectedArtifact.manifest}
        data={selectedResult?.data || { message: 'No output yet. Run the artifact to see results.' }}
        style={{ height: '100%' }}
      />
    );
  };

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'var(--color-bg)',
        ...style,
      }}
    >
      {renderHeader()}

      <div style={{ flex: 1, overflow: 'hidden' }}>
        {view === 'list' && renderListView()}
        {view === 'detail' && renderDetailView()}
        {view === 'output' && renderOutputView()}
      </div>
    </div>
  );
}
