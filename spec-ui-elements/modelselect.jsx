import React, { useState, useRef, useEffect } from 'react';

// ============================================
// MODEL PROVIDER DATA
// ============================================

const modelProviders = {
    claude: {
        color: '#D97757',
        name: 'Claude',
        logo: 'A',
        models: [
            { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', context: '200K', speed: 'fast' },
            { id: 'claude-3-opus', name: 'Claude 3 Opus', context: '200K', speed: 'slow' },
            { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', context: '200K', speed: 'fast' },
            { id: 'claude-3-haiku', name: 'Claude 3 Haiku', context: '200K', speed: 'fastest' },
            { id: 'claude-3-5-haiku', name: 'Claude 3.5 Haiku', context: '200K', speed: 'fastest' },
        ]
    },
    openai: {
        color: '#10a37f',
        name: 'OpenAI',
        logo: 'G',
        models: [
            { id: 'gpt-4o', name: 'GPT-4o', context: '128K', speed: 'fast' },
            { id: 'gpt-4o-mini', name: 'GPT-4o Mini', context: '128K', speed: 'fastest' },
            { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', context: '128K', speed: 'medium' },
            { id: 'gpt-4', name: 'GPT-4', context: '8K', speed: 'slow' },
            { id: 'o1-preview', name: 'o1 Preview', context: '128K', speed: 'slow', tag: 'reasoning' },
            { id: 'o1-mini', name: 'o1 Mini', context: '128K', speed: 'medium', tag: 'reasoning' },
        ]
    },
    gemini: {
        color: '#4285f4',
        name: 'Gemini',
        logo: '◆',
        models: [
            { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', context: '1M', speed: 'medium' },
            { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', context: '1M', speed: 'fast' },
            { id: 'gemini-1.5-flash-8b', name: 'Gemini 1.5 Flash 8B', context: '1M', speed: 'fastest' },
            { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', context: '1M', speed: 'fast', tag: 'new' },
        ]
    },
    mistral: {
        color: '#FA528F',
        name: 'Mistral',
        logo: 'M',
        models: [
            { id: 'mistral-large', name: 'Mistral Large', context: '128K', speed: 'medium' },
            { id: 'mistral-medium', name: 'Mistral Medium', context: '32K', speed: 'fast' },
            { id: 'mistral-small', name: 'Mistral Small', context: '32K', speed: 'fast' },
            { id: 'codestral', name: 'Codestral', context: '32K', speed: 'fast', tag: 'code' },
            { id: 'mixtral-8x7b', name: 'Mixtral 8x7B', context: '32K', speed: 'fast' },
            { id: 'mixtral-8x22b', name: 'Mixtral 8x22B', context: '64K', speed: 'medium' },
        ]
    },
    groq: {
        color: '#F55036',
        name: 'Groq',
        logo: '⚡',
        models: [
            { id: 'llama-3.1-70b', name: 'Llama 3.1 70B', context: '128K', speed: 'fastest' },
            { id: 'llama-3.1-8b', name: 'Llama 3.1 8B', context: '128K', speed: 'fastest' },
            { id: 'llama-3.2-90b-vision', name: 'Llama 3.2 90B Vision', context: '128K', speed: 'fast', tag: 'vision' },
            { id: 'mixtral-8x7b-groq', name: 'Mixtral 8x7B', context: '32K', speed: 'fastest' },
            { id: 'gemma-2-9b', name: 'Gemma 2 9B', context: '8K', speed: 'fastest' },
        ]
    },
    perplexity: {
        color: '#22B8CD',
        name: 'Perplexity',
        logo: 'P',
        models: [
            { id: 'pplx-70b-online', name: 'Sonar Large 32K', context: '32K', speed: 'medium', tag: 'online' },
            { id: 'pplx-7b-online', name: 'Sonar Small 32K', context: '32K', speed: 'fast', tag: 'online' },
            { id: 'pplx-70b-chat', name: 'Sonar Large Chat', context: '4K', speed: 'medium' },
            { id: 'pplx-7b-chat', name: 'Sonar Small Chat', context: '4K', speed: 'fast' },
        ]
    },
    cohere: {
        color: '#39594D',
        name: 'Cohere',
        logo: 'C',
        models: [
            { id: 'command-r-plus', name: 'Command R+', context: '128K', speed: 'medium' },
            { id: 'command-r', name: 'Command R', context: '128K', speed: 'fast' },
            { id: 'command-light', name: 'Command Light', context: '4K', speed: 'fastest' },
        ]
    },
    qwen: {
        color: '#615CED',
        name: 'Qwen',
        logo: 'Q',
        models: [
            { id: 'qwen-2.5-72b', name: 'Qwen 2.5 72B', context: '128K', speed: 'medium' },
            { id: 'qwen-2.5-32b', name: 'Qwen 2.5 32B', context: '128K', speed: 'fast' },
            { id: 'qwen-2.5-14b', name: 'Qwen 2.5 14B', context: '128K', speed: 'fast' },
            { id: 'qwen-2.5-7b', name: 'Qwen 2.5 7B', context: '128K', speed: 'fastest' },
            { id: 'qwen-2.5-coder-32b', name: 'Qwen 2.5 Coder 32B', context: '128K', speed: 'fast', tag: 'code' },
        ]
    },
    deepseek: {
        color: '#0066FF',
        name: 'DeepSeek',
        logo: 'D',
        models: [
            { id: 'deepseek-v3', name: 'DeepSeek V3', context: '64K', speed: 'fast', tag: 'new' },
            { id: 'deepseek-chat', name: 'DeepSeek Chat', context: '32K', speed: 'fast' },
            { id: 'deepseek-coder', name: 'DeepSeek Coder', context: '16K', speed: 'fast', tag: 'code' },
        ]
    }
};

// ============================================
// CRT OVERLAY
// ============================================

const Scanlines = ({ opacity = 0.2 }) => (
    <div
        className="absolute inset-0 pointer-events-none z-30"
        style={{
            background: `repeating-linear-gradient(0deg, transparent 0px, transparent 1px, rgba(0,0,0,${opacity}) 1px, rgba(0,0,0,${opacity}) 2px)`
        }}
    />
);

// ============================================
// MODEL BADGE WITH DROPDOWN
// ============================================

const ModelBadgeSelect = ({
    provider,
    selectedModels = [],
    onSelectionChange,
    status = 'idle', // idle, pending, streaming, complete
    compact = false,
    disabled = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef();
    const data = modelProviders[provider];

    if (!data) return null;

    const activeCount = selectedModels.filter(m => data.models.find(dm => dm.id === m)).length;
    const isActive = activeCount > 0;

    // Close on outside click
    useEffect(() => {
        const handleClick = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const toggleModel = (modelId) => {
        if (selectedModels.includes(modelId)) {
            onSelectionChange(selectedModels.filter(m => m !== modelId));
        } else {
            onSelectionChange([...selectedModels, modelId]);
        }
    };

    const selectAll = () => {
        const allIds = data.models.map(m => m.id);
        const otherSelected = selectedModels.filter(m => !allIds.includes(m));
        onSelectionChange([...otherSelected, ...allIds]);
    };

    const selectNone = () => {
        const allIds = data.models.map(m => m.id);
        onSelectionChange(selectedModels.filter(m => !allIds.includes(m)));
    };

    return (
        <div ref={containerRef} className="relative">
            {/* Badge Button */}
            <button
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className="relative overflow-hidden"
                style={{
                    width: compact ? 100 : 130,
                    height: compact ? 32 : 40,
                    background: '#0a0a0a',
                    borderRadius: 6,
                    border: `1px solid ${isActive ? data.color : '#333'}`,
                    boxShadow: isActive ? `0 0 15px ${data.color}30` : 'none',
                    opacity: disabled ? 0.5 : isActive ? 1 : 0.6,
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s'
                }}
            >
                {/* Streaming animation */}
                {status === 'streaming' && (
                    <div
                        className="absolute inset-0"
                        style={{
                            background: `linear-gradient(90deg, transparent, ${data.color}20, transparent)`,
                            animation: 'sweep 1.5s ease-in-out infinite'
                        }}
                    />
                )}

                {/* Pending pulse */}
                {status === 'pending' && (
                    <div
                        className="absolute inset-0"
                        style={{
                            background: data.color,
                            opacity: 0.1,
                            animation: 'pulse 1.5s ease-in-out infinite'
                        }}
                    />
                )}

                {/* Content */}
                <div className="relative z-10 h-full flex items-center px-2 gap-2">
                    {/* Logo */}
                    <div
                        className="flex items-center justify-center rounded"
                        style={{
                            width: compact ? 20 : 24,
                            height: compact ? 20 : 24,
                            background: isActive ? data.color : `${data.color}30`,
                            color: isActive ? '#000' : data.color,
                            fontSize: compact ? 10 : 12,
                            fontWeight: 'bold',
                            fontFamily: 'monospace',
                            transition: 'all 0.2s'
                        }}
                    >
                        {data.logo}
                    </div>

                    {/* Name + count */}
                    <div className="flex flex-col items-start min-w-0 flex-1">
                        <span
                            className="font-mono truncate"
                            style={{
                                fontSize: compact ? 10 : 11,
                                color: isActive ? data.color : '#888',
                                textShadow: isActive ? `0 0 8px ${data.color}` : 'none'
                            }}
                        >
                            {data.name}
                        </span>
                        {activeCount > 0 && (
                            <span className="font-mono" style={{ fontSize: 9, color: '#666' }}>
                                {activeCount} model{activeCount > 1 ? 's' : ''}
                            </span>
                        )}
                    </div>

                    {/* Dropdown indicator */}
                    <span
                        style={{
                            color: data.color,
                            fontSize: 8,
                            transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
                            transition: 'transform 0.2s'
                        }}
                    >
                        ▼
                    </span>
                </div>

                <Scanlines opacity={0.15} />
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div
                    className="absolute z-50 mt-2 overflow-hidden"
                    style={{
                        top: '100%',
                        left: 0,
                        minWidth: 260,
                        background: '#0a0a0c',
                        borderRadius: 6,
                        border: `1px solid ${data.color}50`,
                        boxShadow: `0 0 30px ${data.color}20, 0 4px 20px rgba(0,0,0,0.5)`
                    }}
                >
                    {/* Header */}
                    <div
                        className="flex items-center justify-between px-3 py-2"
                        style={{ borderBottom: `1px solid ${data.color}20` }}
                    >
                        <span className="font-mono text-xs" style={{ color: data.color }}>
                            {data.name} Models
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={selectAll}
                                className="font-mono text-xs px-2 py-0.5 rounded hover:bg-white/10"
                                style={{ color: '#888' }}
                            >
                                All
                            </button>
                            <button
                                onClick={selectNone}
                                className="font-mono text-xs px-2 py-0.5 rounded hover:bg-white/10"
                                style={{ color: '#888' }}
                            >
                                None
                            </button>
                        </div>
                    </div>

                    {/* Model list */}
                    <div className="max-h-64 overflow-y-auto">
                        {data.models.map((model) => {
                            const isSelected = selectedModels.includes(model.id);

                            return (
                                <div
                                    key={model.id}
                                    onClick={() => toggleModel(model.id)}
                                    className="flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors"
                                    style={{
                                        background: isSelected ? `${data.color}15` : 'transparent',
                                        borderBottom: '1px solid #1a1a1a'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = `${data.color}20`}
                                    onMouseLeave={(e) => e.currentTarget.style.background = isSelected ? `${data.color}15` : 'transparent'}
                                >
                                    {/* Checkbox */}
                                    <div
                                        className="flex items-center justify-center rounded"
                                        style={{
                                            width: 16,
                                            height: 16,
                                            border: `2px solid ${isSelected ? data.color : '#444'}`,
                                            background: isSelected ? data.color : 'transparent',
                                            transition: 'all 0.15s'
                                        }}
                                    >
                                        {isSelected && (
                                            <span style={{ color: '#000', fontSize: 10, fontWeight: 'bold' }}>✓</span>
                                        )}
                                    </div>

                                    {/* Model info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className="font-mono text-xs truncate"
                                                style={{ color: isSelected ? data.color : '#ccc' }}
                                            >
                                                {model.name}
                                            </span>
                                            {model.tag && (
                                                <span
                                                    className="font-mono px-1.5 py-0.5 rounded text-xs"
                                                    style={{
                                                        fontSize: 8,
                                                        background: `${data.color}20`,
                                                        color: data.color
                                                    }}
                                                >
                                                    {model.tag}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex gap-2 mt-0.5">
                                            <span className="font-mono" style={{ fontSize: 9, color: '#666' }}>
                                                {model.context}
                                            </span>
                                            <span className="font-mono" style={{ fontSize: 9, color: '#555' }}>
                                                •
                                            </span>
                                            <span className="font-mono" style={{ fontSize: 9, color: '#666' }}>
                                                {model.speed}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <Scanlines opacity={0.1} />
                </div>
            )}

            <style>{`
        @keyframes sweep { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        @keyframes pulse { 0%, 100% { opacity: 0.1; } 50% { opacity: 0.2; } }
      `}</style>
        </div>
    );
};

// ============================================
// PROVIDER ROW - All providers in a row
// ============================================

const ModelProviderRow = ({
    selectedModels = [],
    onSelectionChange,
    activeStatuses = {}, // { 'claude': 'streaming', 'openai': 'pending' }
    compact = false,
    providers = Object.keys(modelProviders)
}) => {
    return (
        <div className="flex flex-wrap gap-2">
            {providers.map(provider => (
                <ModelBadgeSelect
                    key={provider}
                    provider={provider}
                    selectedModels={selectedModels}
                    onSelectionChange={onSelectionChange}
                    status={activeStatuses[provider] || 'idle'}
                    compact={compact}
                />
            ))}
        </div>
    );
};

// ============================================
// SELECTED MODELS SUMMARY
// ============================================

const SelectedModelsSummary = ({
    selectedModels = [],
    onRemove
}) => {
    // Group by provider
    const grouped = {};
    selectedModels.forEach(modelId => {
        for (const [provider, data] of Object.entries(modelProviders)) {
            const model = data.models.find(m => m.id === modelId);
            if (model) {
                if (!grouped[provider]) grouped[provider] = [];
                grouped[provider].push(model);
                break;
            }
        }
    });

    if (selectedModels.length === 0) {
        return (
            <div className="font-mono text-xs text-gray-600 py-2">
                No models selected
            </div>
        );
    }

    return (
        <div className="flex flex-wrap gap-2">
            {Object.entries(grouped).map(([provider, models]) => {
                const data = modelProviders[provider];
                return models.map(model => (
                    <div
                        key={model.id}
                        className="flex items-center gap-2 px-2 py-1 rounded"
                        style={{
                            background: `${data.color}15`,
                            border: `1px solid ${data.color}30`
                        }}
                    >
                        <span
                            className="font-mono text-xs"
                            style={{ color: data.color }}
                        >
                            {model.name}
                        </span>
                        <button
                            onClick={() => onRemove(model.id)}
                            className="opacity-50 hover:opacity-100"
                            style={{ color: data.color, fontSize: 10 }}
                        >
                            ✕
                        </button>
                    </div>
                ));
            })}
        </div>
    );
};

// ============================================
// QUICK PRESETS
// ============================================

const ModelPresets = ({
    onApply
}) => {
    const presets = [
        {
            name: 'Fast Compare',
            models: ['claude-3-5-sonnet', 'gpt-4o', 'gemini-1.5-flash'],
            description: 'Quick responses from top models'
        },
        {
            name: 'Deep Reasoning',
            models: ['claude-3-opus', 'gpt-4', 'o1-preview'],
            description: 'Maximum capability'
        },
        {
            name: 'Speed Demons',
            models: ['claude-3-haiku', 'gpt-4o-mini', 'gemini-1.5-flash-8b', 'llama-3.1-8b'],
            description: 'Fastest available'
        },
        {
            name: 'Code Review',
            models: ['claude-3-5-sonnet', 'codestral', 'deepseek-coder', 'qwen-2.5-coder-32b'],
            description: 'Code-specialized models'
        },
    ];

    return (
        <div className="flex flex-wrap gap-2">
            {presets.map(preset => (
                <button
                    key={preset.name}
                    onClick={() => onApply(preset.models)}
                    className="group px-3 py-2 rounded transition-all"
                    style={{
                        background: '#0a0a0a',
                        border: '1px solid #333'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#666';
                        e.currentTarget.style.background = '#111';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#333';
                        e.currentTarget.style.background = '#0a0a0a';
                    }}
                >
                    <div className="font-mono text-xs text-white">{preset.name}</div>
                    <div className="font-mono text-xs text-gray-600 mt-0.5">{preset.description}</div>
                </button>
            ))}
        </div>
    );
};

// ============================================
// DEMO
// ============================================

const ModelSelectDemo = () => {
    const [selectedModels, setSelectedModels] = useState([
        'claude-3-5-sonnet',
        'gpt-4o'
    ]);

    const [activeStatuses, setActiveStatuses] = useState({});

    // Simulate streaming
    const simulateRequest = () => {
        setActiveStatuses({ claude: 'pending', openai: 'pending', gemini: 'pending' });

        setTimeout(() => setActiveStatuses(s => ({ ...s, claude: 'streaming' })), 500);
        setTimeout(() => setActiveStatuses(s => ({ ...s, openai: 'streaming' })), 800);
        setTimeout(() => setActiveStatuses(s => ({ ...s, gemini: 'streaming' })), 1200);

        setTimeout(() => setActiveStatuses(s => ({ ...s, openai: 'complete' })), 2500);
        setTimeout(() => setActiveStatuses(s => ({ ...s, claude: 'complete' })), 3000);
        setTimeout(() => setActiveStatuses(s => ({ ...s, gemini: 'complete' })), 3500);

        setTimeout(() => setActiveStatuses({}), 5000);
    };

    return (
        <div className="min-h-screen bg-gray-950 p-8">
            <h1 className="text-2xl font-light text-cyan-400 mb-2 tracking-wider font-mono">MODEL SELECTOR</h1>
            <p className="text-gray-500 mb-8 text-sm font-mono">Click badges to select models from each provider</p>

            {/* Main selector */}
            <section className="mb-8">
                <h2 className="text-xs text-gray-500 mb-3 tracking-wider font-mono">PROVIDERS</h2>
                <ModelProviderRow
                    selectedModels={selectedModels}
                    onSelectionChange={setSelectedModels}
                    activeStatuses={activeStatuses}
                />
            </section>

            {/* Compact version */}
            <section className="mb-8">
                <h2 className="text-xs text-gray-500 mb-3 tracking-wider font-mono">COMPACT</h2>
                <ModelProviderRow
                    selectedModels={selectedModels}
                    onSelectionChange={setSelectedModels}
                    activeStatuses={activeStatuses}
                    compact
                />
            </section>

            {/* Selected summary */}
            <section className="mb-8">
                <h2 className="text-xs text-gray-500 mb-3 tracking-wider font-mono">SELECTED ({selectedModels.length})</h2>
                <SelectedModelsSummary
                    selectedModels={selectedModels}
                    onRemove={(id) => setSelectedModels(s => s.filter(m => m !== id))}
                />
            </section>

            {/* Presets */}
            <section className="mb-8">
                <h2 className="text-xs text-gray-500 mb-3 tracking-wider font-mono">QUICK PRESETS</h2>
                <ModelPresets onApply={setSelectedModels} />
            </section>

            {/* Simulate */}
            <section className="mb-8">
                <h2 className="text-xs text-gray-500 mb-3 tracking-wider font-mono">SIMULATION</h2>
                <button
                    onClick={simulateRequest}
                    className="px-4 py-2 font-mono text-sm rounded"
                    style={{ background: '#00ffff20', color: '#00ffff', border: '1px solid #00ffff40' }}
                >
                    Simulate Parallel Request
                </button>
                <p className="text-xs text-gray-600 font-mono mt-2">
                    Watch badges light up: pending → streaming → complete
                </p>
            </section>

            {/* Debug output */}
            <section className="mb-8">
                <h2 className="text-xs text-gray-500 mb-3 tracking-wider font-mono">RAW SELECTION</h2>
                <pre
                    className="font-mono text-xs p-3 rounded overflow-auto"
                    style={{ background: '#111', color: '#888', maxHeight: 200 }}
                >
                    {JSON.stringify(selectedModels, null, 2)}
                </pre>
            </section>
        </div>
    );
};

// ============================================
// EXPORTS
// ============================================

export {
    ModelBadgeSelect,
    ModelProviderRow,
    SelectedModelsSummary,
    ModelPresets,
    modelProviders
};

export default ModelSelectDemo;