// =============================================================================
// MODEL CARD
// =============================================================================
// Individual model card with icon, name, and capability badges.
// Supports both text and image model types with different renderings.

import React from 'react';
import { Eye, Brain, Wrench, Globe, Code, FileText, Image, Layers, ImagePlus } from 'lucide-react';
import type { ImageModelConfig } from '../../../types/image-model-config';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export type ModelCapability = 'vision' | 'reasoning' | 'tools' | 'search' | 'code' | 'files';
export type ModelType = 'text' | 'image';

export interface ModelConfig {
    id: string;
    name: string;
    providerId: string;
    modelProviderId: string;
    capabilities: ModelCapability[];
    contextWindow?: number;
    groups?: string[];
    customName?: string;
    /** Model type - text (default) or image */
    type?: ModelType;
    /** Image model configuration (only for type='image') */
    imageConfig?: ImageModelConfig;
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
    const isImageModel = model.type === 'image';
    const imageConfig = model.imageConfig;

    // List view
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
                        backgroundColor: isImageModel ? 'rgba(168, 85, 247, 0.15)' : 'var(--color-bg-tertiary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        fontWeight: 600,
                        color: isImageModel ? '#a855f7' : 'var(--color-text-tertiary)',
                    }}
                >
                    {isImageModel ? <Image size={16} /> : (model.modelProviderId || model.name || '?').charAt(0).toUpperCase()}
                </div>

                {/* Name */}
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text)' }}>
                            {model.customName || model.name}
                        </span>
                        {isImageModel && (
                            <span style={{
                                fontSize: '10px',
                                padding: '2px 6px',
                                backgroundColor: 'rgba(168, 85, 247, 0.15)',
                                color: '#a855f7',
                                borderRadius: 'var(--radius-sm)',
                                fontWeight: 500,
                            }}>
                                IMAGE
                            </span>
                        )}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
                        {isImageModel && imageConfig ? (
                            <>
                                {imageConfig.parameters.length} params
                                {imageConfig.img2img.supported && ` · img2img (${imageConfig.img2img.maxImages})`}
                            </>
                        ) : (
                            model.contextWindow ? `${Math.round(model.contextWindow / 1000)}k context` : (model.modelProviderId || '')
                        )}
                    </div>
                </div>

                {/* Capabilities or Image badges */}
                <div style={{ display: 'flex', gap: '4px' }}>
                    {isImageModel && imageConfig ? (
                        <>
                            <div
                                title={`${imageConfig.parameters.length} parameters`}
                                style={{
                                    padding: '4px',
                                    color: '#a855f7',
                                }}
                            >
                                <Layers size={14} />
                            </div>
                            {imageConfig.img2img.supported && (
                                <div
                                    title="Supports img2img"
                                    style={{
                                        padding: '4px',
                                        color: '#22c55e',
                                    }}
                                >
                                    <ImagePlus size={14} />
                                </div>
                            )}
                        </>
                    ) : (
                        ALL_CAPABILITIES.map((cap) => {
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
                        })
                    )}
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
                border: isImageModel ? '1px solid rgba(168, 85, 247, 0.3)' : '1px solid var(--color-border)',
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
                    backgroundColor: isImageModel ? 'rgba(168, 85, 247, 0.15)' : 'var(--color-bg-tertiary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    fontWeight: 600,
                    color: isImageModel ? '#a855f7' : 'var(--color-text-tertiary)',
                    marginBottom: '12px',
                }}
            >
                {isImageModel ? <Image size={24} /> : (model.modelProviderId || model.name || '?').charAt(0).toUpperCase()}
            </div>

            {/* Type badge for image models */}
            {isImageModel && (
                <span style={{
                    fontSize: '9px',
                    padding: '2px 6px',
                    backgroundColor: 'rgba(168, 85, 247, 0.15)',
                    color: '#a855f7',
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: 600,
                    marginBottom: '8px',
                    letterSpacing: '0.5px',
                }}>
                    IMAGE
                </span>
            )}

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
                    textAlign: 'center',
                }}
            >
                {isImageModel && imageConfig ? (
                    <>
                        {imageConfig.parameters.length} params
                        {imageConfig.img2img.supported && (
                            <span style={{ color: '#22c55e' }}> · img2img</span>
                        )}
                    </>
                ) : (
                    model.contextWindow ? `${Math.round(model.contextWindow / 1000)}k` : (model.modelProviderId || '')
                )}
            </div>

            {/* Capability Badges or Image badges */}
            <div style={{ display: 'flex', gap: '4px', marginTop: 'auto' }}>
                {isImageModel && imageConfig ? (
                    <>
                        <div
                            title={`${imageConfig.parameters.length} parameters`}
                            style={{
                                padding: '4px',
                                color: '#a855f7',
                            }}
                        >
                            <Layers size={14} />
                        </div>
                        {imageConfig.img2img.supported && (
                            <div
                                title={`Supports img2img (max ${imageConfig.img2img.maxImages})`}
                                style={{
                                    padding: '4px',
                                    color: '#22c55e',
                                }}
                            >
                                <ImagePlus size={14} />
                            </div>
                        )}
                    </>
                ) : (
                    ALL_CAPABILITIES.map((cap) => {
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
                    })
                )}
            </div>
        </div>
    );
}
