// =============================================================================
// MODEL PROVIDER PAGE
// =============================================================================
// Main settings page for configuring model providers, API keys, and models.

import React, { useState, useEffect, useCallback } from 'react';
import { ProviderIconBar, type Provider } from './ProviderIconBar';
import { APIKeySection } from './APIKeySection';
import { APIHostSection } from './APIHostSection';
import { ModelCardGrid } from './ModelCardGrid';
import { GridToolbar } from './GridToolbar';
import { FetchModelsModal } from './FetchModelsModal';
import { AddProviderModal, type NewProvider } from './AddProviderModal';
import { ImageModelBuilderModal } from './ImageModelBuilderModal';
import { VideoModelBuilderModal } from './VideoModelBuilderModal';
import { TTSModelBuilderModal } from './TTSModelBuilderModal';
import { EmbeddingModelModal } from './EmbeddingModelModal';
import { type ModelConfig, type ModelCapability } from './ModelCard';
import { useProviderSettings, type ModelInfo, type UserModel } from '../../../hooks/useProviderSettings';
import type { ImageModelConfig } from '../../../types/image-model-config';
import type { EmbeddingModelInfo, ProviderFormat } from '../../../types/embedding-model-config';
import type { VideoModelConfig } from '../../../types/video-model-config';
import type { TTSModelConfig } from '../../../types/tts-model-config';
import type { TEEModelInfo } from '../../../types/tee-model-config';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface ModelProviderPageProps {
    className?: string;
}

// -----------------------------------------------------------------------------
// BUILT-IN PROVIDERS (shown even without credentials)
// -----------------------------------------------------------------------------

const BUILT_IN_PROVIDERS: Provider[] = [
    { id: 'anthropic', name: 'Anthropic', brandColor: '#d4a27f' },
    { id: 'openai', name: 'OpenAI', brandColor: '#10a37f' },
    { id: 'google', name: 'Google', brandColor: '#4285F4' },
];

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

function userModelToModelConfig(model: UserModel): ModelConfig {
    const capabilities: ModelCapability[] = [];
    if (model.supportsVision) capabilities.push('vision');
    if (model.supportsTools) capabilities.push('tools');

    return {
        id: model.id,
        name: model.displayName,
        providerId: model.provider,
        modelProviderId: model.provider,
        capabilities,
        contextWindow: model.contextWindow,
    };
}

function modelInfoToAvailableModel(model: ModelInfo) {
    const capabilities: string[] = [];
    if (model.supportsVision) capabilities.push('vision');
    if (model.supportsTools) capabilities.push('tools');

    return {
        id: model.id,
        name: model.displayName,
        capabilities,
        contextWindow: model.contextWindow,
    };
}

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function ModelProviderPage({ className }: ModelProviderPageProps) {
    const [selectedProviderId, setSelectedProviderId] = useState<string>('anthropic');
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [activeGroup, setActiveGroup] = useState('All');

    // Provider list (includes built-in + custom)
    const [providers, setProviders] = useState<Provider[]>(BUILT_IN_PROVIDERS);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // API key state
    const [apiKeys, setApiKeys] = useState<string[]>(['']);
    const [baseUrl, setBaseUrl] = useState('');
    const [hasCredential, setHasCredential] = useState(false);

    // Image API state
    const [imageEndpoint, setImageEndpoint] = useState('');
    const [imageModels, setImageModels] = useState<ImageModelConfig[]>([]);
    const [isImageBuilderOpen, setIsImageBuilderOpen] = useState(false);
    const [editingImageModel, setEditingImageModel] = useState<ImageModelConfig | undefined>();

    // Embedding API state
    const [embeddingEndpoint, setEmbeddingEndpoint] = useState('');
    const [embeddingModels, setEmbeddingModels] = useState<EmbeddingModelInfo[]>([]);
    const [isEmbeddingModalOpen, setIsEmbeddingModalOpen] = useState(false);
    const [editingEmbeddingModel, setEditingEmbeddingModel] = useState<EmbeddingModelInfo | undefined>();
    const [providerFormat, setProviderFormat] = useState<ProviderFormat>('openai');

    // Video API state
    const [videoEndpoint, setVideoEndpoint] = useState('');
    const [videoModels, setVideoModels] = useState<VideoModelConfig[]>([]);
    const [isVideoBuilderOpen, setIsVideoBuilderOpen] = useState(false);
    const [editingVideoModel, setEditingVideoModel] = useState<VideoModelConfig | undefined>();

    // TTS API state
    const [ttsEndpoint, setTtsEndpoint] = useState('');
    const [ttsModels, setTtsModels] = useState<TTSModelConfig[]>([]);
    const [isTTSBuilderOpen, setIsTTSBuilderOpen] = useState(false);
    const [editingTTSModel, setEditingTTSModel] = useState<TTSModelConfig | undefined>();

    // TEE API state
    const [teeEndpoint, setTeeEndpoint] = useState('');
    const [teeModels, setTeeModels] = useState<TEEModelInfo[]>([]);

    // Model state
    const [userModels, setUserModels] = useState<UserModel[]>([]);
    const [isFetchModalOpen, setIsFetchModalOpen] = useState(false);
    const [availableModels, setAvailableModels] = useState<ModelInfo[]>([]);

    // Hook
    const {
        loading,
        error,
        getCredential,
        setCredential,
        updateBaseUrl: updateBaseUrlBackend,
        getAllProviders,
        getAvailableModels,
        fetchModelsFromAPI,
        getUserModels,
        addModel,
        removeModel,
        setDefaultModel,
        revealApiKey,
        // Image
        getImageEndpoint,
        setImageEndpoint: setImageEndpointBackend,
        getImageModels,
        addImageModel,
        updateImageModel,
        removeImageModel,
        // Embedding
        getEmbeddingEndpoint,
        setEmbeddingEndpoint: setEmbeddingEndpointBackend,
        getEmbeddingModels,
        addEmbeddingModel,
        updateEmbeddingModel,
        removeEmbeddingModel,
        // Video
        getVideoEndpoint,
        setVideoEndpoint: setVideoEndpointBackend,
        getVideoModels,
        addVideoModel,
        updateVideoModel,
        removeVideoModel,
        // TTS
        getTTSEndpoint,
        setTTSEndpoint: setTTSEndpointBackend,
        getTTSModels,
        addTTSModel,
        updateTTSModel,
        removeTTSModel,
        // TEE
        getTEEEndpoint,
        setTEEEndpoint: setTEEEndpointBackend,
        getTEEModels,
        addTEEModel,
        updateTEEModel,
        removeTEEModel,
    } = useProviderSettings();

    // Derived state
    const selectedProvider = providers.find(p => p.id === selectedProviderId);

    // Convert image models to ModelConfig format
    const imageModelConfigs: ModelConfig[] = imageModels.map(im => ({
        id: im.id,
        name: im.displayName,
        providerId: selectedProviderId,
        modelProviderId: im.modelId,
        capabilities: [],
        type: 'image' as const,
        imageConfig: im,
    }));

    // Convert embedding models to ModelConfig format
    const embeddingModelConfigs: ModelConfig[] = embeddingModels.map(em => ({
        id: em.id,
        name: em.displayName,
        providerId: selectedProviderId,
        modelProviderId: em.id,
        capabilities: [],
        type: 'embedding' as const,
        embeddingConfig: em,
    }));

    // Convert video models to ModelConfig format
    const videoModelConfigs: ModelConfig[] = videoModels.map(vm => ({
        id: vm.id,
        name: vm.displayName,
        providerId: selectedProviderId,
        modelProviderId: vm.modelId,
        capabilities: [],
        type: 'video' as const,
        videoConfig: vm,
    }));

    // Convert TTS models to ModelConfig format
    const ttsModelConfigs: ModelConfig[] = ttsModels.map(tm => ({
        id: tm.id,
        name: tm.displayName,
        providerId: selectedProviderId,
        modelProviderId: tm.modelId,
        capabilities: [],
        type: 'tts' as const,
        ttsConfig: tm,
    }));

    // Convert TEE models to ModelConfig format
    const teeModelConfigs: ModelConfig[] = teeModels.map(te => ({
        id: te.id,
        name: te.displayName,
        providerId: selectedProviderId,
        modelProviderId: te.id,
        capabilities: te.supportsVision ? ['vision'] : [],
        type: 'tee' as const,
        teeConfig: te,
    }));

    // Combine all model types
    const allModelConfigs = [
        ...userModels.map(userModelToModelConfig),
        ...imageModelConfigs,
        ...embeddingModelConfigs,
        ...videoModelConfigs,
        ...ttsModelConfigs,
        ...teeModelConfigs,
    ];

    const filteredModels = allModelConfigs.filter(m => {
        if (searchQuery && !m.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        if (activeGroup === 'Vision' && !m.capabilities.includes('vision')) return false;
        if (activeGroup === 'Image' && m.type !== 'image') return false;
        if (activeGroup === 'Embedding' && m.type !== 'embedding') return false;
        if (activeGroup === 'Video' && m.type !== 'video') return false;
        if (activeGroup === 'TTS' && m.type !== 'tts') return false;
        if (activeGroup === 'TEE' && m.type !== 'tee') return false;
        return true;
    });

    // ---------------------------------------------------------------------------
    // LOAD PROVIDERS ON MOUNT
    // ---------------------------------------------------------------------------

    const loadProviders = useCallback(async () => {
        const customProviders = await getAllProviders();

        // Merge built-in with custom (built-in first, then custom)
        const builtInIds = BUILT_IN_PROVIDERS.map(p => p.id);
        const allProviders = [
            ...BUILT_IN_PROVIDERS,
            ...customProviders
                .filter(p => !builtInIds.includes(p.id))
                .map(p => ({
                    id: p.id,
                    name: p.name,
                    brandColor: p.brandColor || '#6b7280',
                })),
        ];

        setProviders(allProviders);
    }, [getAllProviders]);

    useEffect(() => {
        loadProviders();
    }, [loadProviders]);

    // ---------------------------------------------------------------------------
    // LOAD DATA ON PROVIDER CHANGE
    // ---------------------------------------------------------------------------

    const loadProviderData = useCallback(async () => {
        const [
            credInfo,
            models,
            available,
            imgEndpoint,
            imgModels,
            embEndpoint,
            embModels,
            vidEndpoint,
            vidModels,
            ttsEnd,
            ttsMods,
            teeEnd,
            teeMods,
        ] = await Promise.all([
            getCredential(selectedProviderId),
            getUserModels(selectedProviderId),
            getAvailableModels(selectedProviderId),
            getImageEndpoint(selectedProviderId),
            getImageModels(selectedProviderId),
            getEmbeddingEndpoint(selectedProviderId),
            getEmbeddingModels(selectedProviderId),
            getVideoEndpoint(selectedProviderId),
            getVideoModels(selectedProviderId),
            getTTSEndpoint(selectedProviderId),
            getTTSModels(selectedProviderId),
            getTEEEndpoint(selectedProviderId),
            getTEEModels(selectedProviderId),
        ]);

        const hasCred = credInfo?.exists ?? false;
        setHasCredential(hasCred);
        setUserModels(models);
        setAvailableModels(available);
        setImageModels(imgModels);
        setEmbeddingModels(embModels);
        setVideoModels(vidModels);
        setTtsModels(ttsMods);
        setTeeModels(teeMods);

        // Load stored base URL and format
        if (credInfo?.baseUrl) {
            setBaseUrl(credInfo.baseUrl);
        } else {
            setBaseUrl('');
        }
        if (credInfo?.format) {
            setProviderFormat(credInfo.format as ProviderFormat);
        }

        // Load stored endpoints
        setImageEndpoint(imgEndpoint || '');
        setEmbeddingEndpoint(embEndpoint || '');
        setVideoEndpoint(vidEndpoint || '');
        setTtsEndpoint(ttsEnd || '');
        setTeeEndpoint(teeEnd || '');

        // Reset API key input if no credential
        if (!hasCred) {
            setApiKeys(['']);
        } else {
            setApiKeys(['••••••••']); // Masked placeholder
        }
    }, [
        selectedProviderId,
        getCredential,
        getUserModels,
        getAvailableModels,
        getImageEndpoint,
        getImageModels,
        getEmbeddingEndpoint,
        getEmbeddingModels,
        getVideoEndpoint,
        getVideoModels,
        getTTSEndpoint,
        getTTSModels,
        getTEEEndpoint,
        getTEEModels,
    ]);

    useEffect(() => {
        loadProviderData();
    }, [loadProviderData]);

    // ---------------------------------------------------------------------------
    // HANDLERS
    // ---------------------------------------------------------------------------

    const handleKeysChange = async (keys: string[]) => {
        const key = keys.find(k => k && !k.startsWith('••'));
        if (key) {
            try {
                await setCredential(selectedProviderId, key, { baseUrl: baseUrl || undefined });
                setHasCredential(true);
                setApiKeys(['••••••••']);
            } catch (err) {
                console.error('Failed to save credential:', err);
            }
        }
    };

    const handleAddProvider = async (newProvider: NewProvider) => {
        try {
            await setCredential(newProvider.id, newProvider.apiKey, {
                name: newProvider.name,
                format: newProvider.format,
                baseUrl: newProvider.baseUrl,
                brandColor: newProvider.brandColor,
            });

            // Add to providers list
            setProviders(prev => [
                ...prev,
                {
                    id: newProvider.id,
                    name: newProvider.name,
                    brandColor: newProvider.brandColor,
                },
            ]);

            // Select the new provider
            setSelectedProviderId(newProvider.id);
        } catch (err) {
            console.error('Failed to add provider:', err);
        }
    };

    const handleBaseUrlChange = async (url: string) => {
        setBaseUrl(url);
        // If we already have a credential, update the base URL
        if (hasCredential) {
            try {
                await updateBaseUrlBackend(selectedProviderId, url || null);
            } catch (err) {
                console.error('Failed to update base URL:', err);
            }
        }
    };

    const handleImageEndpointChange = async (endpoint: string) => {
        setImageEndpoint(endpoint);
        // If we already have a credential, update the image endpoint
        if (hasCredential) {
            try {
                await setImageEndpointBackend(selectedProviderId, endpoint || null);
            } catch (err) {
                console.error('Failed to update image endpoint:', err);
            }
        }
    };

    const handleAddModels = async (newModels: any[]) => {
        for (const m of newModels) {
            const modelInfo: ModelInfo = {
                id: m.id,
                provider: selectedProviderId,
                displayName: m.name,
                contextWindow: m.contextWindow || 128000,
                maxOutput: 16384,
                supportsVision: m.capabilities?.includes('vision') ?? false,
                supportsTools: m.capabilities?.includes('tools') ?? true,
            };

            try {
                const added = await addModel(selectedProviderId, modelInfo);
                setUserModels(prev => [...prev, added]);
            } catch (err) {
                console.error('Failed to add model:', err);
            }
        }
    };

    const handleCapabilityToggle = (modelId: string, cap: ModelCapability) => {
        // For now, just log - capability toggling would need backend support
        console.log('Toggle capability:', modelId, cap);
    };

    const handleModelClick = async (modelId: string) => {
        // Check if this is an image model
        const imageModel = imageModels.find(im => im.id === modelId);
        if (imageModel) {
            setEditingImageModel(imageModel);
            setIsImageBuilderOpen(true);
            return;
        }

        // Check if this is an embedding model
        const embModel = embeddingModels.find(em => em.id === modelId);
        if (embModel) {
            setEditingEmbeddingModel(embModel);
            setIsEmbeddingModalOpen(true);
            return;
        }

        // Check if this is a video model
        const vidModel = videoModels.find(vm => vm.id === modelId);
        if (vidModel) {
            setEditingVideoModel(vidModel);
            setIsVideoBuilderOpen(true);
            return;
        }

        // Check if this is a TTS model
        const ttsModel = ttsModels.find(tm => tm.id === modelId);
        if (ttsModel) {
            setEditingTTSModel(ttsModel);
            setIsTTSBuilderOpen(true);
            return;
        }

        // TEE models don't have an editor - they just use standard chat format
        const teeModel = teeModels.find(te => te.id === modelId);
        if (teeModel) {
            console.log('TEE model clicked:', teeModel.displayName);
            return;
        }

        // Set as default when clicked (text models)
        try {
            await setDefaultModel(selectedProviderId, modelId);
            // Reload to reflect change
            const models = await getUserModels(selectedProviderId);
            setUserModels(models);
        } catch (err) {
            console.error('Failed to set default:', err);
        }
    };

    const handleSaveImageModel = async (model: ImageModelConfig) => {
        try {
            if (editingImageModel) {
                await updateImageModel(selectedProviderId, editingImageModel.id, model);
                setImageModels(prev => prev.map(m => m.id === editingImageModel.id ? model : m));
            } else {
                await addImageModel(selectedProviderId, model);
                setImageModels(prev => [...prev, model]);
            }
            setIsImageBuilderOpen(false);
            setEditingImageModel(undefined);
        } catch (err) {
            console.error('Failed to save image model:', err);
        }
    };

    const handleAddImageModel = () => {
        setEditingImageModel(undefined);
        setIsImageBuilderOpen(true);
    };

    // -------------------------------------------------------------------------
    // EMBEDDING HANDLERS
    // -------------------------------------------------------------------------

    const handleEmbeddingEndpointChange = async (endpoint: string) => {
        setEmbeddingEndpoint(endpoint);
        if (hasCredential) {
            try {
                await setEmbeddingEndpointBackend(selectedProviderId, endpoint || null);
            } catch (err) {
                console.error('Failed to update embedding endpoint:', err);
            }
        }
    };

    const handleSaveEmbeddingModel = async (model: EmbeddingModelInfo) => {
        try {
            if (editingEmbeddingModel) {
                await updateEmbeddingModel(selectedProviderId, editingEmbeddingModel.id, model);
                setEmbeddingModels(prev => prev.map(m => m.id === editingEmbeddingModel.id ? model : m));
            } else {
                await addEmbeddingModel(selectedProviderId, model);
                setEmbeddingModels(prev => [...prev, model]);
            }
            setIsEmbeddingModalOpen(false);
            setEditingEmbeddingModel(undefined);
        } catch (err) {
            console.error('Failed to save embedding model:', err);
        }
    };

    const handleAddEmbeddingModel = () => {
        setEditingEmbeddingModel(undefined);
        setIsEmbeddingModalOpen(true);
    };

    // -------------------------------------------------------------------------
    // VIDEO HANDLERS
    // -------------------------------------------------------------------------

    const handleVideoEndpointChange = async (endpoint: string) => {
        setVideoEndpoint(endpoint);
        if (hasCredential) {
            try {
                await setVideoEndpointBackend(selectedProviderId, endpoint || null);
            } catch (err) {
                console.error('Failed to update video endpoint:', err);
            }
        }
    };

    const handleSaveVideoModel = async (model: VideoModelConfig) => {
        try {
            if (editingVideoModel) {
                await updateVideoModel(selectedProviderId, editingVideoModel.id, model);
                setVideoModels(prev => prev.map(m => m.id === editingVideoModel.id ? model : m));
            } else {
                await addVideoModel(selectedProviderId, model);
                setVideoModels(prev => [...prev, model]);
            }
            setIsVideoBuilderOpen(false);
            setEditingVideoModel(undefined);
        } catch (err) {
            console.error('Failed to save video model:', err);
        }
    };

    const handleAddVideoModel = () => {
        setEditingVideoModel(undefined);
        setIsVideoBuilderOpen(true);
    };

    // -------------------------------------------------------------------------
    // TTS HANDLERS
    // -------------------------------------------------------------------------

    const handleTTSEndpointChange = async (endpoint: string) => {
        setTtsEndpoint(endpoint);
        if (hasCredential) {
            try {
                await setTTSEndpointBackend(selectedProviderId, endpoint || null);
            } catch (err) {
                console.error('Failed to update TTS endpoint:', err);
            }
        }
    };

    const handleSaveTTSModel = async (model: TTSModelConfig) => {
        try {
            if (editingTTSModel) {
                await updateTTSModel(selectedProviderId, editingTTSModel.id, model);
                setTtsModels(prev => prev.map(m => m.id === editingTTSModel.id ? model : m));
            } else {
                await addTTSModel(selectedProviderId, model);
                setTtsModels(prev => [...prev, model]);
            }
            setIsTTSBuilderOpen(false);
            setEditingTTSModel(undefined);
        } catch (err) {
            console.error('Failed to save TTS model:', err);
        }
    };

    const handleAddTTSModel = () => {
        setEditingTTSModel(undefined);
        setIsTTSBuilderOpen(true);
    };

    // -------------------------------------------------------------------------
    // TEE HANDLERS
    // -------------------------------------------------------------------------

    const handleTEEEndpointChange = async (endpoint: string) => {
        setTeeEndpoint(endpoint);
        if (hasCredential) {
            try {
                await setTEEEndpointBackend(selectedProviderId, endpoint || null);
            } catch (err) {
                console.error('Failed to update TEE endpoint:', err);
            }
        }
    };

    const handleOpenFetchModal = async () => {
        // Fetch models from the actual API
        try {
            const models = await fetchModelsFromAPI(selectedProviderId);
            setAvailableModels(models);
        } catch (err) {
            console.error('Failed to fetch models from API:', err);
            // Fall back to hardcoded defaults
            const defaults = await getAvailableModels(selectedProviderId);
            setAvailableModels(defaults);
        }
        setIsFetchModalOpen(true);
    };

    return (
        <div
            className={className}
            style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                padding: '24px',
                gap: '24px',
            }}
        >
            {/* Provider Selection */}
            <ProviderIconBar
                providers={providers}
                selectedId={selectedProviderId}
                onSelect={(id) => setSelectedProviderId(id)}
                onAdd={() => setIsAddModalOpen(true)}
            />

            {/* Status message */}
            {error && (
                <div style={{
                    padding: '12px 16px',
                    backgroundColor: 'var(--color-error-bg, #fee2e2)',
                    border: '1px solid var(--color-error, #ef4444)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--color-error, #ef4444)',
                    fontSize: '13px',
                }}>
                    {error}
                </div>
            )}

            {/* API Configuration */}
            <div
                style={{
                    padding: '24px',
                    backgroundColor: 'var(--color-bg)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--color-border)',
                    opacity: loading ? 0.7 : 1,
                }}
            >
                {/* Top row: API Key and Base URL */}
                <div style={{ display: 'flex', gap: '24px', marginBottom: '20px' }}>
                    <div style={{ flex: 1 }}>
                        <APIKeySection
                            providerId={selectedProviderId}
                            keys={apiKeys}
                            onKeysChange={handleKeysChange}
                            onRevealKey={revealApiKey}
                        />
                        {hasCredential && (
                            <div style={{
                                marginTop: '8px',
                                fontSize: '12px',
                                color: 'var(--color-success, #22c55e)',
                            }}>
                                ✓ API key configured
                            </div>
                        )}
                    </div>
                    <div style={{ width: '380px' }}>
                        <APIHostSection
                            providerId={selectedProviderId}
                            baseUrl={baseUrl}
                            onBaseUrlChange={handleBaseUrlChange}
                        />
                    </div>
                </div>

                {/* Endpoints Section */}
                <div style={{
                    borderTop: '1px solid var(--color-border)',
                    paddingTop: '16px',
                }}>
                    <div style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: 'var(--color-text-tertiary)',
                        marginBottom: '12px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                    }}>
                        API Endpoints
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                        {/* Image Endpoint */}
                        <div>
                            <label style={endpointLabelStyle}>Image</label>
                            <input
                                type="text"
                                value={imageEndpoint}
                                onChange={(e) => handleImageEndpointChange(e.target.value)}
                                placeholder="/api/generate-image"
                                disabled={!hasCredential}
                                style={endpointInputStyle(hasCredential)}
                            />
                        </div>
                        {/* Embedding Endpoint */}
                        <div>
                            <label style={endpointLabelStyle}>Embedding</label>
                            <input
                                type="text"
                                value={embeddingEndpoint}
                                onChange={(e) => handleEmbeddingEndpointChange(e.target.value)}
                                placeholder="/v1/embeddings"
                                disabled={!hasCredential}
                                style={endpointInputStyle(hasCredential)}
                            />
                        </div>
                        {/* Video Endpoint */}
                        <div>
                            <label style={endpointLabelStyle}>Video</label>
                            <input
                                type="text"
                                value={videoEndpoint}
                                onChange={(e) => handleVideoEndpointChange(e.target.value)}
                                placeholder="/generate-video"
                                disabled={!hasCredential}
                                style={endpointInputStyle(hasCredential)}
                            />
                        </div>
                        {/* TTS Endpoint */}
                        <div>
                            <label style={endpointLabelStyle}>TTS</label>
                            <input
                                type="text"
                                value={ttsEndpoint}
                                onChange={(e) => handleTTSEndpointChange(e.target.value)}
                                placeholder="/api/v1/speech"
                                disabled={!hasCredential}
                                style={endpointInputStyle(hasCredential)}
                            />
                        </div>
                        {/* TEE Endpoint */}
                        <div>
                            <label style={endpointLabelStyle}>TEE</label>
                            <input
                                type="text"
                                value={teeEndpoint}
                                onChange={(e) => handleTEEEndpointChange(e.target.value)}
                                placeholder="/v1/tee/chat"
                                disabled={!hasCredential}
                                style={endpointInputStyle(hasCredential)}
                            />
                        </div>
                    </div>
                </div>

                {/* Add Model Buttons */}
                <div style={{
                    borderTop: '1px solid var(--color-border)',
                    paddingTop: '16px',
                    marginTop: '16px',
                    display: 'flex',
                    gap: '8px',
                    flexWrap: 'wrap',
                }}>
                    <button
                        onClick={handleOpenFetchModal}
                        disabled={!hasCredential}
                        style={addButtonStyle(hasCredential)}
                    >
                        + Text
                    </button>
                    <button
                        onClick={handleAddImageModel}
                        disabled={!hasCredential}
                        style={addButtonStyle(hasCredential, '#a855f7')}
                    >
                        + Image
                    </button>
                    <button
                        onClick={handleAddEmbeddingModel}
                        disabled={!hasCredential}
                        style={addButtonStyle(hasCredential, '#06b6d4')}
                    >
                        + Embedding
                    </button>
                    <button
                        onClick={handleAddVideoModel}
                        disabled={!hasCredential}
                        style={addButtonStyle(hasCredential, '#f97316')}
                    >
                        + Video
                    </button>
                    <button
                        onClick={handleAddTTSModel}
                        disabled={!hasCredential}
                        style={addButtonStyle(hasCredential, '#22c55e')}
                    >
                        + TTS
                    </button>
                </div>
            </div>

            {/* Models Section */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <GridToolbar
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                    activeGroup={activeGroup}
                    onGroupChange={setActiveGroup}
                    onNewGroup={() => console.log('New group')}
                />

                <div style={{ flex: 1, overflow: 'auto', paddingBottom: '20px' }} className="custom-scrollbar">
                    {filteredModels.length === 0 ? (
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '48px',
                                color: 'var(--color-text-tertiary)',
                                textAlign: 'center',
                                height: '100%',
                                border: '2px dashed var(--color-border)',
                                borderRadius: 'var(--radius-lg)',
                            }}
                        >
                            <div
                                style={{
                                    width: '64px',
                                    height: '64px',
                                    borderRadius: 'var(--radius-lg)',
                                    backgroundColor: 'var(--color-bg-secondary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: '16px',
                                    fontSize: '24px',
                                }}
                            >
                                📦
                            </div>
                            <p style={{ margin: 0, fontSize: '15px', fontWeight: 500, color: 'var(--color-text-secondary)' }}>
                                {hasCredential
                                    ? `No models added for ${selectedProvider?.name}`
                                    : `Add an API key for ${selectedProvider?.name} to get started`
                                }
                            </p>
                            {hasCredential && (
                                <button
                                    onClick={handleOpenFetchModal}
                                    style={{
                                        marginTop: '16px',
                                        padding: '8px 20px',
                                        backgroundColor: 'var(--color-accent)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: 'var(--radius-md)',
                                        fontWeight: 600,
                                        fontSize: '13px',
                                        cursor: 'pointer',
                                    }}
                                >
                                    Add Models
                                </button>
                            )}
                        </div>
                    ) : (
                        <ModelCardGrid
                            models={filteredModels}
                            viewMode={viewMode}
                            onModelClick={handleModelClick}
                            onCapabilityToggle={handleCapabilityToggle}
                        />
                    )}
                </div>
            </div>

            {/* Modals */}
            <FetchModelsModal
                isOpen={isFetchModalOpen}
                onClose={() => setIsFetchModalOpen(false)}
                providerName={selectedProvider?.name || 'Provider'}
                onAddModels={handleAddModels}
                availableModels={availableModels.map(modelInfoToAvailableModel)}
            />

            <AddProviderModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onAdd={handleAddProvider}
                existingIds={providers.map(p => p.id)}
            />

            <ImageModelBuilderModal
                isOpen={isImageBuilderOpen}
                onClose={() => {
                    setIsImageBuilderOpen(false);
                    setEditingImageModel(undefined);
                }}
                onSave={handleSaveImageModel}
                editingModel={editingImageModel}
                providerId={selectedProviderId}
            />

            <EmbeddingModelModal
                isOpen={isEmbeddingModalOpen}
                onClose={() => {
                    setIsEmbeddingModalOpen(false);
                    setEditingEmbeddingModel(undefined);
                }}
                onSave={handleSaveEmbeddingModel}
                providerId={selectedProviderId}
                format={providerFormat}
                existingModel={editingEmbeddingModel}
            />

            <VideoModelBuilderModal
                isOpen={isVideoBuilderOpen}
                onClose={() => {
                    setIsVideoBuilderOpen(false);
                    setEditingVideoModel(undefined);
                }}
                onSave={handleSaveVideoModel}
                editingModel={editingVideoModel}
                providerId={selectedProviderId}
            />

            <TTSModelBuilderModal
                isOpen={isTTSBuilderOpen}
                onClose={() => {
                    setIsTTSBuilderOpen(false);
                    setEditingTTSModel(undefined);
                }}
                onSave={handleSaveTTSModel}
                editingModel={editingTTSModel}
                providerId={selectedProviderId}
            />
        </div>
    );
}

// -----------------------------------------------------------------------------
// HELPER STYLES
// -----------------------------------------------------------------------------

const endpointLabelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '11px',
    fontWeight: 500,
    color: 'var(--color-text-secondary)',
    marginBottom: '4px',
};

const endpointInputStyle = (hasCredential: boolean): React.CSSProperties => ({
    width: '100%',
    padding: '6px 10px',
    backgroundColor: hasCredential ? 'var(--color-bg-secondary)' : 'var(--color-bg-tertiary)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    color: hasCredential ? 'var(--color-text)' : 'var(--color-text-tertiary)',
    fontSize: '12px',
});

const addButtonStyle = (hasCredential: boolean, accentColor?: string): React.CSSProperties => ({
    padding: '6px 14px',
    backgroundColor: hasCredential ? 'var(--color-bg-secondary)' : 'var(--color-bg-tertiary)',
    border: hasCredential && accentColor ? `1px solid ${accentColor}40` : '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    color: hasCredential ? (accentColor || 'var(--color-text)') : 'var(--color-text-tertiary)',
    fontSize: '12px',
    fontWeight: 500,
    cursor: hasCredential ? 'pointer' : 'not-allowed',
});
