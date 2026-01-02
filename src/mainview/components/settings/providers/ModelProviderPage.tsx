// =============================================================================
// MODEL PROVIDER PAGE
// =============================================================================
// Main settings page for configuring model providers, API keys, and models.

import React, { useState } from 'react';
import { ProviderIconBar, type Provider } from './ProviderIconBar';
import { APIKeySection } from './APIKeySection';
import { APIHostSection } from './APIHostSection';
import { ModelCardGrid } from './ModelCardGrid';
import { GridToolbar } from './GridToolbar';
import { FetchModelsModal } from './FetchModelsModal';
import { type ModelConfig, type ModelCapability } from './ModelCard';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface ModelProviderPageProps {
    className?: string;
}

// -----------------------------------------------------------------------------
// MOCK DATA (temporary)
// -----------------------------------------------------------------------------

const MOCK_PROVIDERS: Provider[] = [
    { id: 'openrouter', name: 'OpenRouter', brandColor: '#6366f1' },
    { id: 'openai', name: 'OpenAI', brandColor: '#10a37f' },
    { id: 'anthropic', name: 'Anthropic', brandColor: '#d4a27f' },
    { id: 'google', name: 'Google', brandColor: '#4285F4' },
    { id: 'deepseek', name: 'DeepSeek', brandColor: '#4d6eff' },
];

const MOCK_EXISTING_MODELS: ModelConfig[] = []; // Start empty to show empty state

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function ModelProviderPage({ className }: ModelProviderPageProps) {
    const [selectedProviderId, setSelectedProviderId] = useState('openrouter');
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [activeGroup, setActiveGroup] = useState('All');

    // Model Data State
    const [models, setModels] = useState<ModelConfig[]>(MOCK_EXISTING_MODELS);
    const [isFetchModalOpen, setIsFetchModalOpen] = useState(false);

    // Derived state
    const selectedProvider = MOCK_PROVIDERS.find(p => p.id === selectedProviderId);
    const filteredModels = models.filter(m => {
        // Search
        if (searchQuery && !m.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        // Group/Capability Filter
        if (activeGroup === 'Vision' && !m.capabilities.includes('vision')) return false;
        // Provider filter (in real app, we might mix providers or filter by selected)
        // For now, let's assume models belong to the selected provider or we show all?
        // User probably wants to see models FOR the selected provider configuration.
        // But typically a "Model Manager" shows all my active models.
        // Let's filter by provider for "context" but maybe the Grid shows all?
        // The design suggests the Grid is per-provider configuration because "Fetch Models" is in the config panel.
        // Actually, usually "Model Provider" settings configures the *credentials*. 
        // The *Models* section might be global or local. 
        // Given the wireframe, it looks like "ModelCardGrid" is below the provider config.
        // Let's filter by provider to keep it focused.
        return m.providerId === selectedProviderId;
    });

    const handleAddModels = (newModels: any[]) => {
        const configs: ModelConfig[] = newModels.map(m => ({
            id: m.id,
            name: m.name,
            // Map the "AvailableModel" to "ModelConfig"
            providerId: selectedProviderId, // Owned by the current provider config
            modelProviderId: m.id.split('/')[0] || selectedProviderId,
            capabilities: m.capabilities as ModelCapability[],
            contextWindow: m.contextWindow,
        }));

        // Dedup and add
        setModels(prev => {
            const existingIds = new Set(prev.map(p => p.id));
            const toAdd = configs.filter(c => !existingIds.has(c.id));
            return [...prev, ...toAdd];
        });
    };

    const handleCapabilityToggle = (modelId: string, cap: ModelCapability) => {
        setModels(prev => prev.map(m => {
            if (m.id !== modelId) return m;
            const caps = new Set(m.capabilities);
            if (caps.has(cap)) caps.delete(cap);
            else caps.add(cap);
            return { ...m, capabilities: Array.from(caps) };
        }));
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
                providers={MOCK_PROVIDERS}
                selectedId={selectedProviderId}
                onSelect={setSelectedProviderId}
                onAdd={() => console.log('Add provider')}
            />

            {/* API Configuration */}
            <div
                style={{
                    display: 'flex',
                    gap: '24px', // Wider gap
                    padding: '24px',
                    backgroundColor: 'var(--color-bg)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--color-border)',
                }}
            >
                <div style={{ flex: 1 }}>
                    <APIKeySection
                        providerId={selectedProviderId}
                        keys={[]}
                        onKeysChange={(keys) => console.log('Keys changed:', keys)}
                    />
                </div>
                <div style={{ width: '320px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <APIHostSection
                        providerId={selectedProviderId}
                        baseUrl=""
                        onBaseUrlChange={(url) => console.log('Base URL changed:', url)}
                    />
                    {/* Move Fetch Button here relative to the wireframe/flow? 
              Wireframe has "Fetch Models" on the right side under API Host.
          */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                        {/* We put a secondary fetch button here or rely on the toolbar? 
                 Wireframe has it in the config panel. Let's add it here too.
             */}
                        <button
                            onClick={() => setIsFetchModalOpen(true)}
                            style={{
                                padding: '8px 16px',
                                backgroundColor: 'var(--color-bg-secondary)',
                                border: '1px solid var(--color-border)',
                                borderRadius: 'var(--radius-md)',
                                color: 'var(--color-text)',
                                fontSize: '13px',
                                fontWeight: 500,
                                cursor: 'pointer',
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
                // @ts-ignore - The toolbar prop doesn't technically have "onFetchModels" anymore 
                // but we might want the primary action there too.
                // Let's remove onFetchModels from GridToolbar props in usage if I removed it from def?
                // Wait, I didn't remove it from GridToolbar def, checking...
                // I removed it from the render but checking the props... I should update the toolbar usage.
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
                                No models enabled for {selectedProvider?.name}
                            </p>
                            <button
                                onClick={() => setIsFetchModalOpen(true)}
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
                                Fetch Available Models
                            </button>
                        </div>
                    ) : (
                        <ModelCardGrid
                            models={filteredModels}
                            viewMode={viewMode}
                            onModelClick={(id) => console.log('Model clicked:', id)}
                            onCapabilityToggle={handleCapabilityToggle}
                        />
                    )}
                </div>
            </div>

            {/* Modal */}
            <FetchModelsModal
                isOpen={isFetchModalOpen}
                onClose={() => setIsFetchModalOpen(false)}
                providerName={selectedProvider?.name || 'Provider'}
                onAddModels={handleAddModels}
            />
        </div>
    );
}
