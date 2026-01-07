
import React, { useMemo, useCallback } from 'react';
import { useSettings, ModelReference, RunnerConfig } from '../../../hooks/useSettings';
import { useProviderSettings, UserModel } from '../../../hooks/useProviderSettings';
import { ModelSelectorDropdown } from '../../model-selector/ModelSelectorDropdown';
import { AIModel } from '../../model-selector/types';
import { SettingsGroup } from '../general/SettingsGroup';
import { Plus, Minus, Info } from 'lucide-react';
import { cn } from '../../../lib/cn';

// -----------------------------------------------------------------------------
// HELPER COMPONENTS
// -----------------------------------------------------------------------------

interface ModelSettingRowProps {
    label: string;
    description?: string;
    children: React.ReactNode;
    enabled?: boolean;
    onToggle?: (enabled: boolean) => void;
}

function ModelSettingRow({ label, description, children, enabled, onToggle }: ModelSettingRowProps) {
    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderBottom: '1px solid var(--color-border)',
                opacity: (enabled === false) ? 0.6 : 1,
                pointerEvents: (enabled === false) ? 'none' : 'auto',
            }}
        >
            {/* Label & Description */}
            <div style={{ flex: 1, marginRight: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                        style={{
                            fontSize: '14px',
                            fontWeight: 500,
                            color: 'var(--color-text)',
                            marginBottom: description ? '4px' : 0,
                        }}
                    >
                        {label}
                    </div>
                    {onToggle && (
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '11px',
                                color: enabled ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
                                backgroundColor: enabled ? 'rgba(var(--color-accent-rgb), 0.1)' : 'var(--color-bg-tertiary)',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                pointerEvents: 'auto', // Always clickable
                            }}
                            onClick={() => onToggle(!enabled)}
                        >
                            {enabled ? 'Enabled' : 'Disabled'}
                        </div>
                    )}
                </div>
                {description && (
                    <div
                        style={{
                            fontSize: '12px',
                            color: 'var(--color-text-tertiary)',
                        }}
                    >
                        {description}
                    </div>
                )}
            </div>

            {/* Control */}
            <div style={{ minWidth: '240px' }}>
                {children}
            </div>
        </div>
    );
}

// -----------------------------------------------------------------------------
// MAIN PAGE
// -----------------------------------------------------------------------------

export function DefaultModelsPage() {
    const { settings, updateSettings, loading: settingsLoading } = useSettings();
    const { getUserModels } = useProviderSettings();
    const [userModels, setUserModels] = React.useState<UserModel[]>([]);
    const [modelsLoading, setModelsLoading] = React.useState(true);

    // Load available models
    React.useEffect(() => {
        let mounted = true;
        const load = async () => {
            try {
                // Fetch all models - we assume backend supports fetching all if no provider specified, 
                // or we try known providers if needed.
                const models = await getUserModels();
                if (mounted) setUserModels(models);
            } catch (err) {
                console.error("Failed to load models", err);
            } finally {
                if (mounted) setModelsLoading(false);
            }
        };
        load();
        return () => { mounted = false; };
    }, [getUserModels]);

    // -------------------------------------------------------------------------
    // DATA TRANSFORMATION
    // -------------------------------------------------------------------------

    // Convert keys like "provider:modelId" <-> specific objects
    const encodeId = (provider: string, modelId: string) => `${provider}:${modelId}`;
    const decodeId = (id: string): { provider: string; modelId: string } | null => {
        const parts = id.split(':');
        if (parts.length < 2) return null;
        return { provider: parts[0], modelId: parts.slice(1).join(':') };
    };

    const aiModels: AIModel[] = useMemo(() => {
        return userModels.map((m: UserModel) => ({
            id: encodeId(m.provider, m.id),
            name: m.displayName,
            provider: {
                id: m.provider,
                name: m.provider.charAt(0).toUpperCase() + m.provider.slice(1),
                iconUrl: undefined // TODO: Add icon support
            },
            group: m.provider === 'anthropic' || m.provider === 'openai' ? 'Cloud' : 'Local',
            capabilities: {
                vision: m.supportsVision,
                research: m.supportsReasoning, // Mapping reasoning/search to research for now
                imageGen: false, // UserModels currently doesn't track image gen explicitly?
                coding: m.supportsCode,
            },
            contextWindow: m.contextWindow,
            formattedContext: `${Math.round(m.contextWindow / 1000)}k`,
            description: m.id
        }));
    }, [userModels]);

    // Filter helpers
    const visionModels = useMemo(() => aiModels.filter(m => m.capabilities.vision), [aiModels]);
    const textModels = aiModels; // All can do text usually

    // -------------------------------------------------------------------------
    // HANDLERS
    // -------------------------------------------------------------------------

    const handleUpdate = async (path: string, modelReference: string) => {
        const decoded = decodeId(modelReference);
        if (!decoded) return;

        // Construct partial update object dynamically
        // path e.g. "defaultModels.textModel"
        // This is tricky with deep nested updates in one go via useSettings if it doesn't support deep paths nicely
        // But useSettings.setSetting supports path string!

        // Wait, updateSettings takes a partial AppSettings. 
        // We really want to update nested state. 
        // Let's use deep merge approach manually or if setSetting is exposed.
        // setSetting IS exposed in useSettings!

        // However, we need to pass the object { provider, modelId }
        await updateSettings({
            defaultModels: {
                ...settings!.defaultModels,
                [path]: decoded
            } as any // Helping TS here as we are constructing a partial
        });
    };

    // Safer way with specific updates
    const updateTextModel = (id: string) => {
        const decoded = decodeId(id);
        if (!decoded || !settings) return;
        updateSettings({
            defaultModels: {
                ...settings.defaultModels,
                textModel: decoded
            }
        });
    };

    const updateVisionProxy = (id: string) => {
        const decoded = decodeId(id);
        if (!decoded || !settings) return;
        updateSettings({
            defaultModels: {
                ...settings.defaultModels,
                visionProxy: {
                    ...settings.defaultModels.visionProxy,
                    ...decoded
                }
            }
        });
    };

    const toggleVisionProxy = (enabled: boolean) => {
        if (!settings) return;
        updateSettings({
            defaultModels: {
                ...settings.defaultModels,
                visionProxy: {
                    ...settings.defaultModels.visionProxy,
                    enabled
                }
            }
        });
    };

    const updateShadowModel = (id: string) => {
        const decoded = decodeId(id);
        if (!decoded || !settings) return;
        updateSettings({
            defaultModels: {
                ...settings.defaultModels,
                shadowModel: decoded
            }
        });
    };

    const updateResearchOrchestrator = (id: string) => {
        const decoded = decodeId(id);
        if (!decoded || !settings) return;
        updateSettings({
            defaultModels: {
                ...settings.defaultModels,
                research: {
                    ...settings.defaultModels.research,
                    orchestrator: decoded
                }
            }
        });
    };

    const updateResearchReader = (id: string) => {
        const decoded = decodeId(id);
        if (!decoded || !settings) return;
        updateSettings({
            defaultModels: {
                ...settings.defaultModels,
                research: {
                    ...settings.defaultModels.research,
                    reader: decoded
                }
            }
        });
    };

    const updateRunnerConfig = (updates: Partial<RunnerConfig>) => {
        if (!settings) return;
        const currentRunners = settings.defaultModels.research.runners;

        // Logic to handle array resizing happens here or in helper
        let individualModels = currentRunners.individualModels || [];

        if (updates.count !== undefined && updates.count !== currentRunners.count) {
            // Resize array
            if (updates.count > individualModels.length) {
                // Fill with uniform model or last model
                const template = individualModels[individualModels.length - 1] || currentRunners.uniformModel || settings.defaultModels.textModel;
                const toAdd = updates.count - individualModels.length;
                for (let i = 0; i < toAdd; i++) individualModels.push({ ...template });
            } else {
                individualModels = individualModels.slice(0, updates.count);
            }
            updates.individualModels = individualModels;
        }

        if (updates.mode === 'individual' && (!currentRunners.individualModels || currentRunners.individualModels.length === 0)) {
            // Initialize from uniform
            const template = currentRunners.uniformModel || settings.defaultModels.textModel;
            updates.individualModels = Array(currentRunners.count).fill({ ...template });
        }

        updateSettings({
            defaultModels: {
                ...settings.defaultModels,
                research: {
                    ...settings.defaultModels.research,
                    runners: {
                        ...currentRunners,
                        ...updates
                    }
                }
            }
        });
    };

    const updateRunnerModel = (index: number, id: string) => {
        if (!settings) return;
        const decoded = decodeId(id);
        if (!decoded) return;

        const currentRunners = settings.defaultModels.research.runners;
        const newModels = [...(currentRunners.individualModels || [])];
        newModels[index] = decoded;

        updateSettings({
            defaultModels: {
                ...settings.defaultModels,
                research: {
                    ...settings.defaultModels.research,
                    runners: {
                        ...currentRunners,
                        individualModels: newModels
                    }
                }
            }
        });
    };

    const updateUniformRunnerModel = (id: string) => {
        if (!settings) return;
        const decoded = decodeId(id);
        if (!decoded) return;

        updateSettings({
            defaultModels: {
                ...settings.defaultModels,
                research: {
                    ...settings.defaultModels.research,
                    runners: {
                        ...settings.defaultModels.research.runners,
                        uniformModel: decoded
                    }
                }
            }
        });
    };

    if (settingsLoading || !settings) {
        return <div className="p-8 text-slate-500">Loading settings...</div>;
    }

    const { defaultModels } = settings;

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6 pb-20">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-semibold text-slate-100 mb-2">Default Models</h1>
                <p className="text-slate-400">Configure which AI models are used across different parts of the application.</p>
            </div>

            {/* Chat Settings */}
            <SettingsGroup title="Chat">
                <ModelSettingRow
                    label="Default Text Model"
                    description="Primary model for new conversations when no preference is set."
                >
                    <ModelSelectorDropdown
                        models={textModels}
                        selectedModelIds={[encodeId(defaultModels.textModel.provider, defaultModels.textModel.modelId)]}
                        onSelect={(ids) => updateTextModel(ids[0])}
                    />
                </ModelSettingRow>

                <ModelSettingRow
                    label="Vision Proxy Model"
                    description="Describes images when the active model lacks vision capability."
                    enabled={defaultModels.visionProxy.enabled}
                    onToggle={toggleVisionProxy}
                >
                    <ModelSelectorDropdown
                        models={visionModels}
                        selectedModelIds={[encodeId(defaultModels.visionProxy.provider, defaultModels.visionProxy.modelId)]}
                        onSelect={(ids) => updateVisionProxy(ids[0])}
                        placeholder="Select Vision Model"
                    />
                </ModelSettingRow>
            </SettingsGroup>

            {/* Background Tasks */}
            <SettingsGroup title="Background Tasks">
                <ModelSettingRow
                    label="Shadow/Summary Model"
                    description="Used for auto-generated titles, conversation summaries, and TTS scripts. Faster models recommended."
                >
                    <ModelSelectorDropdown
                        models={textModels}
                        selectedModelIds={[encodeId(defaultModels.shadowModel.provider, defaultModels.shadowModel.modelId)]}
                        onSelect={(ids) => updateShadowModel(ids[0])}
                    />
                </ModelSettingRow>
            </SettingsGroup>

            {/* Deep Research */}
            <SettingsGroup title="Deep Research">
                <ModelSettingRow
                    label="Research Orchestrator"
                    description="Coordinates research sessions, breaks down queries, and synthesizes findings."
                >
                    <ModelSelectorDropdown
                        models={textModels}
                        selectedModelIds={[encodeId(defaultModels.research.orchestrator.provider, defaultModels.research.orchestrator.modelId)]}
                        onSelect={(ids) => updateResearchOrchestrator(ids[0])}
                    />
                </ModelSettingRow>

                <ModelSettingRow
                    label="Research Reader"
                    description="Extracts and analyzes content from discovered sources and webpages."
                >
                    <ModelSelectorDropdown
                        models={textModels}
                        selectedModelIds={[encodeId(defaultModels.research.reader.provider, defaultModels.research.reader.modelId)]}
                        onSelect={(ids) => updateResearchReader(ids[0])}
                    />
                </ModelSettingRow>

                {/* Runners Sections */}
                <div className="bg-[#1e293b]/50 border-t border-slate-700 p-4">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <div className="text-sm font-medium text-slate-200">Research Runners (Scouts)</div>
                            <div className="text-xs text-slate-500 mt-1">Parallel agents that search for relevant sources.</div>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400 mr-2">Count:</span>
                            <button
                                className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                                onClick={() => updateRunnerConfig({ count: Math.max(1, defaultModels.research.runners.count - 1) })}
                            >
                                <Minus size={14} />
                            </button>
                            <span className="w-8 text-center text-sm font-mono">{defaultModels.research.runners.count}</span>
                            <button
                                className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                                onClick={() => updateRunnerConfig({ count: Math.min(10, defaultModels.research.runners.count + 1) })}
                            >
                                <Plus size={14} />
                            </button>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {/* Mode Toggle */}
                        <div className="flex gap-4 mb-4">
                            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                                <input
                                    type="radio"
                                    name="runnerMode"
                                    checked={defaultModels.research.runners.mode === 'uniform'}
                                    onChange={() => updateRunnerConfig({ mode: 'uniform' })}
                                    className="accent-blue-500"
                                />
                                Same model for all
                            </label>
                            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                                <input
                                    type="radio"
                                    name="runnerMode"
                                    checked={defaultModels.research.runners.mode === 'individual'}
                                    onChange={() => updateRunnerConfig({ mode: 'individual' })}
                                    className="accent-blue-500"
                                />
                                Individual per runner
                            </label>
                        </div>

                        {/* Uniform Model Selector */}
                        {defaultModels.research.runners.mode === 'uniform' && (
                            <ModelSelectorDropdown
                                models={textModels}
                                selectedModelIds={defaultModels.research.runners.uniformModel ?
                                    [encodeId(defaultModels.research.runners.uniformModel.provider, defaultModels.research.runners.uniformModel.modelId)] : []
                                }
                                onSelect={(ids) => updateUniformRunnerModel(ids[0])}
                                className="w-full"
                            />
                        )}

                        {/* Individual Model Selectors */}
                        {defaultModels.research.runners.mode === 'individual' && (
                            <div className="space-y-2 pl-4 border-l-2 border-slate-700">
                                {Array.from({ length: defaultModels.research.runners.count }).map((_, idx) => {
                                    const modelRef = defaultModels.research.runners.individualModels?.[idx];
                                    const modelIdEncoded = modelRef ? encodeId(modelRef.provider, modelRef.modelId) : undefined;

                                    return (
                                        <div key={idx} className="flex items-center gap-3">
                                            <span className="text-xs font-mono text-slate-500 w-16">Runner {idx + 1}</span>
                                            <ModelSelectorDropdown
                                                models={textModels}
                                                selectedModelIds={modelIdEncoded ? [modelIdEncoded] : []}
                                                onSelect={(ids) => updateRunnerModel(idx, ids[0])}
                                                className="flex-1"
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </SettingsGroup>
        </div>
    );
}
