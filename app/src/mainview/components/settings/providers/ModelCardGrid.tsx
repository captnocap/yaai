// =============================================================================
// MODEL CARD GRID
// =============================================================================
// Grid display of model cards with capability badges.

import React from 'react';
import { ModelCard, type ModelConfig } from './ModelCard';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface ModelCardGridProps {
    models: ModelConfig[];
    viewMode: 'grid' | 'list';
    onModelClick: (id: string) => void;
    onCapabilityToggle: (modelId: string, capability: string) => void;
}

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function ModelCardGrid({
    models,
    viewMode,
    onModelClick,
    onCapabilityToggle,
}: ModelCardGridProps) {
    if (models.length === 0) {
        return (
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '48px',
                    color: 'var(--color-text-tertiary)',
                    textAlign: 'center',
                }}
            >
                <div
                    style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: 'var(--radius-lg)',
                        backgroundColor: 'var(--color-bg)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '16px',
                        fontSize: '24px',
                    }}
                >
                    📦
                </div>
                <p style={{ margin: 0, fontSize: '14px', fontWeight: 500, color: 'var(--color-text-secondary)' }}>
                    No models added yet
                </p>
                <p style={{ margin: '8px 0 0 0', fontSize: '13px' }}>
                    Click "Fetch Models" to discover available models from this provider
                </p>
            </div>
        );
    }

    return (
        <div
            style={{
                display: viewMode === 'grid' ? 'grid' : 'flex',
                gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(140px, 1fr))' : undefined,
                flexDirection: viewMode === 'list' ? 'column' : undefined,
                gap: '12px',
            }}
        >
            {models.map((model) => (
                <ModelCard
                    key={model.id}
                    model={model}
                    viewMode={viewMode}
                    onClick={() => onModelClick(model.id)}
                    onCapabilityToggle={(cap) => onCapabilityToggle(model.id, cap)}
                />
            ))}
        </div>
    );
}
