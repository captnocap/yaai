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
import { type ModelConfig, type ModelCapability } from './ModelCard';
import { useProviderSettings, type ModelInfo, type UserModel } from '../../../hooks/useProviderSettings';

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
    } = useProviderSettings();

    // Derived state
    const selectedProvider = providers.find(p => p.id === selectedProviderId);
    const modelConfigs = userModels.map(userModelToModelConfig);
    const filteredModels = modelConfigs.filter(m => {
        if (searchQuery && !m.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        if (activeGroup === 'Vision' && !m.capabilities.includes('vision')) return false;
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
        const [credInfo, models, available] = await Promise.all([
            getCredential(selectedProviderId),
            getUserModels(selectedProviderId),
            getAvailableModels(selectedProviderId),
        ]);

        const hasCred = credInfo?.exists ?? false;
        setHasCredential(hasCred);
        setUserModels(models);
        setAvailableModels(available);

        // Load stored base URL
        if (credInfo?.baseUrl) {
            setBaseUrl(credInfo.baseUrl);
        } else {
            setBaseUrl('');
        }

        // Reset API key input if no credential
        if (!hasCred) {
            setApiKeys(['']);
        } else {
            setApiKeys(['••••••••']); // Masked placeholder
        }
    }, [selectedProviderId, getCredential, getUserModels, getAvailableModels]);

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
        // Set as default when clicked
        try {
            await setDefaultModel(selectedProviderId, modelId);
            // Reload to reflect change
            const models = await getUserModels(selectedProviderId);
            setUserModels(models);
        } catch (err) {
            console.error('Failed to set default:', err);
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
                    display: 'flex',
                    gap: '24px',
                    padding: '24px',
                    backgroundColor: 'var(--color-bg)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--color-border)',
                    opacity: loading ? 0.7 : 1,
                }}
            >
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
                <div style={{ width: '320px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <APIHostSection
                        providerId={selectedProviderId}
                        baseUrl={baseUrl}
                        onBaseUrlChange={handleBaseUrlChange}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                        <button
                            onClick={handleOpenFetchModal}
                            disabled={!hasCredential}
                            style={{
                                padding: '8px 16px',
                                backgroundColor: hasCredential ? 'var(--color-bg-secondary)' : 'var(--color-bg-tertiary)',
                                border: '1px solid var(--color-border)',
                                borderRadius: 'var(--radius-md)',
                                color: hasCredential ? 'var(--color-text)' : 'var(--color-text-tertiary)',
                                fontSize: '13px',
                                fontWeight: 500,
                                cursor: hasCredential ? 'pointer' : 'not-allowed',
                            }}
                        >
                            Configure Models...
                        </button>
                    </div>
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
        </div>
    );
}
