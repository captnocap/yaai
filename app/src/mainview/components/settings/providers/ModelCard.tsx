// =============================================================================
// MODEL CARD
// =============================================================================
// Individual model card with icon, name, and capability badges.

import React from 'react';
import { Eye, Brain, Wrench, Globe, Code, FileText } from 'lucide-react';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export type ModelCapability = 'vision' | 'reasoning' | 'tools' | 'search' | 'code' | 'files';

export interface ModelConfig {
    id: string;
    name: string;
    providerId: string;
    modelProviderId: string;
    capabilities: ModelCapability[];
    contextWindow?: number;
    groups?: string[];
    customName?: string;
}

export interface ModelCardProps {
    model: ModelConfig;
    viewMode: 'grid' | 'list';
    onClick: () => void;
    onCapabilityToggle: (capability: ModelCapability) => void;
}

// -----------------------------------------------------------------------------
// CAPABILITY CONFIG
// -----------------------------------------------------------------------------

const CAPABILITY_CONFIG: Record<ModelCapability, { icon: React.ElementType; color: string; label: string }> = {
    vision: { icon: Eye, color: '#22d3ee', label: 'Vision' },
    reasoning: { icon: Brain, color: '#a855f7', label: 'Reasoning' },
    tools: { icon: Wrench, color: '#f59e0b', label: 'Tool Use' },
    search: { icon: Globe, color: '#22c55e', label: 'Web Search' },
    code: { icon: Code, color: '#3b82f6', label: 'Code' },
    files: { icon: FileText, color: '#ec4899', label: 'Files' },
};

const ALL_CAPABILITIES: ModelCapability[] = ['vision', 'reasoning', 'tools', 'search'];

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function ModelCard({
    model,
    viewMode,
    onClick,
    onCapabilityToggle,
}: ModelCardProps) {
    if (viewMode === 'list') {
        return (
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '12px 16px',
                    backgroundColor: 'var(--color-bg)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    cursor: 'pointer',
                }}
                onClick={onClick}
            >
                {/* Icon */}
                <div
                    style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--color-bg-tertiary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        fontWeight: 600,
                        color: 'var(--color-text-tertiary)',
                    }}
                >
                    {(model.modelProviderId || model.name || '?').charAt(0).toUpperCase()}
                </div>

                {/* Name */}
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text)' }}>
                        {model.customName || model.name}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
                        {model.contextWindow ? `${Math.round(model.contextWindow / 1000)}k context` : (model.modelProviderId || '')}
                    </div>
                </div>

                {/* Capabilities */}
                <div style={{ display: 'flex', gap: '4px' }}>
                    {ALL_CAPABILITIES.map((cap) => {
                        const config = CAPABILITY_CONFIG[cap];
                        const Icon = config.icon;
                        const isActive = model.capabilities.includes(cap);

                        return (
                            <button
                                key={cap}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onCapabilityToggle(cap);
                                }}
                                title={config.label}
                                style={{
                                    padding: '4px',
                                    border: 'none',
                                    borderRadius: 'var(--radius-sm)',
                                    backgroundColor: 'transparent',
                                    color: isActive ? config.color : 'var(--color-text-tertiary)',
                                    opacity: isActive ? 1 : 0.3,
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                }}
                            >
                                <Icon size={14} />
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    }

    // Grid view (card)
    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '16px 12px',
                backgroundColor: 'var(--color-bg)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--color-border)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                minHeight: '160px',
            }}
            onClick={onClick}
        >
            {/* Icon */}
            <div
                style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: 'var(--radius-lg)',
                    backgroundColor: 'var(--color-bg-tertiary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    fontWeight: 600,
                    color: 'var(--color-text-tertiary)',
                    marginBottom: '12px',
                }}
            >
                {(model.modelProviderId || model.name || '?').charAt(0).toUpperCase()}
            </div>

            {/* Name */}
            <div
                style={{
                    fontSize: '13px',
                    fontWeight: 500,
                    color: 'var(--color-text)',
                    textAlign: 'center',
                    marginBottom: '4px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    width: '100%',
                }}
                title={model.customName || model.name}
            >
                {model.customName || model.name}
            </div>

            {/* Subtext */}
            <div
                style={{
                    fontSize: '11px',
                    color: 'var(--color-text-tertiary)',
                    marginBottom: '12px',
                }}
            >
                {model.contextWindow ? `${Math.round(model.contextWindow / 1000)}k` : (model.modelProviderId || '')}
            </div>

            {/* Capability Badges */}
            <div style={{ display: 'flex', gap: '4px', marginTop: 'auto' }}>
                {ALL_CAPABILITIES.map((cap) => {
                    const config = CAPABILITY_CONFIG[cap];
                    const Icon = config.icon;
                    const isActive = model.capabilities.includes(cap);

                    return (
                        <button
                            key={cap}
                            onClick={(e) => {
                                e.stopPropagation();
                                onCapabilityToggle(cap);
                            }}
                            title={config.label}
                            style={{
                                padding: '4px',
                                border: 'none',
                                borderRadius: 'var(--radius-sm)',
                                backgroundColor: 'transparent',
                                color: isActive ? config.color : 'var(--color-text-tertiary)',
                                opacity: isActive ? 1 : 0.3,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                            }}
                        >
                            <Icon size={14} />
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
