// =============================================================================
// MODEL CARD
// =============================================================================
// Individual model card with icon, name, and capability badges.
// Supports text, image, embedding, video, TTS, and TEE model types.

import React from 'react';
import { Eye, Brain, Wrench, Globe, Code, FileText, Image, Film, Volume2, Shield, MessageSquare, Hash } from 'lucide-react';
import type { ImageModelConfig } from '../../../types/image-model-config';
import type { EmbeddingModelInfo } from '../../../types/embedding-model-config';
import type { VideoModelConfig } from '../../../types/video-model-config';
import type { TTSModelConfig } from '../../../types/tts-model-config';
import type { TEEModelInfo } from '../../../types/tee-model-config';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export type ModelCapability = 'vision' | 'reasoning' | 'tools' | 'search' | 'code' | 'files';
export type ModelType = 'text' | 'image' | 'embedding' | 'video' | 'tts' | 'tee';

export interface ModelConfig {
    id: string;
    name: string;
    providerId: string;
    modelProviderId: string;
    capabilities: ModelCapability[];
    contextWindow?: number;
    groups?: string[];
    customName?: string;
    /** Model type - text (default), image, embedding, video, tts, or tee */
    type?: ModelType;
    /** Image model configuration (only for type='image') */
    imageConfig?: ImageModelConfig;
    /** Embedding model configuration (only for type='embedding') */
    embeddingConfig?: EmbeddingModelInfo;
    /** Video model configuration (only for type='video') */
    videoConfig?: VideoModelConfig;
    /** TTS model configuration (only for type='tts') */
    ttsConfig?: TTSModelConfig;
    /** TEE model configuration (only for type='tee') */
    teeConfig?: TEEModelInfo;
}

// -----------------------------------------------------------------------------
// MODEL TYPE STYLING
// -----------------------------------------------------------------------------

const MODEL_TYPE_CONFIG: Record<ModelType, { color: string; bgColor: string; icon: React.ElementType; label: string }> = {
    text: { color: 'var(--color-text-secondary)', bgColor: 'var(--color-bg-tertiary)', icon: MessageSquare, label: 'TEXT' },
    image: { color: '#a855f7', bgColor: 'rgba(168, 85, 247, 0.15)', icon: Image, label: 'IMAGE' },
    embedding: { color: '#06b6d4', bgColor: 'rgba(6, 182, 212, 0.15)', icon: Hash, label: 'EMBED' },
    video: { color: '#f97316', bgColor: 'rgba(249, 115, 22, 0.15)', icon: Film, label: 'VIDEO' },
    tts: { color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.15)', icon: Volume2, label: 'TTS' },
    tee: { color: '#eab308', bgColor: 'rgba(234, 179, 8, 0.15)', icon: Shield, label: 'TEE' },
};

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

// Helper to get subtext for a model based on its type
function getModelSubtext(model: ModelConfig): string {
    const modelType = model.type || 'text';
    switch (modelType) {
        case 'image':
            if (model.imageConfig) {
                const img2imgText = model.imageConfig.img2img.supported ? ` · img2img` : '';
                return `${model.imageConfig.parameters.length} params${img2imgText}`;
            }
            return '';
        case 'embedding':
            if (model.embeddingConfig) {
                return `${model.embeddingConfig.dimensions}d · ${model.embeddingConfig.maxTokens} tokens`;
            }
            return '';
        case 'video':
            if (model.videoConfig) {
                const mediaSupport = [];
                if (model.videoConfig.mediaInput.image.supported) mediaSupport.push('img2vid');
                if (model.videoConfig.mediaInput.video.supported) mediaSupport.push('vid2vid');
                if (model.videoConfig.mediaInput.audio.supported) mediaSupport.push('audio');
                return `${model.videoConfig.parameters.length} params${mediaSupport.length ? ` · ${mediaSupport.join(', ')}` : ''}`;
            }
            return '';
        case 'tts':
            if (model.ttsConfig) {
                const asyncText = model.ttsConfig.async ? ' · async' : '';
                return `${model.ttsConfig.parameters.length} params${asyncText}`;
            }
            return '';
        case 'tee':
            if (model.teeConfig) {
                return model.teeConfig.supportsVision ? 'Vision' : 'Text';
            }
            return '';
        default:
            return model.contextWindow ? `${Math.round(model.contextWindow / 1000)}k context` : (model.modelProviderId || '');
    }
}

export function ModelCard({
    model,
    viewMode,
    onClick,
    onCapabilityToggle,
}: ModelCardProps) {
    const modelType = model.type || 'text';
    const typeConfig = MODEL_TYPE_CONFIG[modelType];
    const isSpecialModel = modelType !== 'text';
    const TypeIcon = typeConfig.icon;

    const subtext = getModelSubtext(model);

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
                    border: isSpecialModel ? `1px solid ${typeConfig.color}30` : '1px solid var(--color-border)',
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
                        backgroundColor: isSpecialModel ? typeConfig.bgColor : 'var(--color-bg-tertiary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        fontWeight: 600,
                        color: isSpecialModel ? typeConfig.color : 'var(--color-text-tertiary)',
                    }}
                >
                    {isSpecialModel ? <TypeIcon size={16} /> : (model.modelProviderId || model.name || '?').charAt(0).toUpperCase()}
                </div>

                {/* Name */}
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text)' }}>
                            {model.customName || model.name}
                        </span>
                        {isSpecialModel && (
                            <span style={{
                                fontSize: '10px',
                                padding: '2px 6px',
                                backgroundColor: typeConfig.bgColor,
                                color: typeConfig.color,
                                borderRadius: 'var(--radius-sm)',
                                fontWeight: 500,
                            }}>
                                {typeConfig.label}
                            </span>
                        )}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
                        {subtext}
                    </div>
                </div>

                {/* Capabilities (only for text models) */}
                <div style={{ display: 'flex', gap: '4px' }}>
                    {!isSpecialModel && (
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
                border: isSpecialModel ? `1px solid ${typeConfig.color}30` : '1px solid var(--color-border)',
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
                    backgroundColor: isSpecialModel ? typeConfig.bgColor : 'var(--color-bg-tertiary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    fontWeight: 600,
                    color: isSpecialModel ? typeConfig.color : 'var(--color-text-tertiary)',
                    marginBottom: '12px',
                }}
            >
                {isSpecialModel ? <TypeIcon size={24} /> : (model.modelProviderId || model.name || '?').charAt(0).toUpperCase()}
            </div>

            {/* Type badge for special models */}
            {isSpecialModel && (
                <span style={{
                    fontSize: '9px',
                    padding: '2px 6px',
                    backgroundColor: typeConfig.bgColor,
                    color: typeConfig.color,
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: 600,
                    marginBottom: '8px',
                    letterSpacing: '0.5px',
                }}>
                    {typeConfig.label}
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
                {subtext}
            </div>

            {/* Capability Badges (only for text models) */}
            <div style={{ display: 'flex', gap: '4px', marginTop: 'auto' }}>
                {!isSpecialModel && (
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
