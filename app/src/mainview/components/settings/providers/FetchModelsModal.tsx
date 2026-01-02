// =============================================================================
// FETCH MODELS MODAL
// =============================================================================
// Modal to search and select models to add from the provider.

import React, { useState } from 'react';
import { X, Search, Filter, Eye, Brain, Wrench } from 'lucide-react';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface FetchModelsModalProps {
    isOpen: boolean;
    onClose: () => void;
    providerName: string;
    onAddModels: (models: any[]) => void;
}

interface AvailableModel {
    id: string;
    name: string;
    contextWindow: number;
    capabilities: ('vision' | 'reasoning' | 'tools')[];
    description?: string;
}

// -----------------------------------------------------------------------------
// MOCK DATA
// -----------------------------------------------------------------------------

const AVAILABLE_MODELS: AvailableModel[] = [
    { id: 'anthropic/claude-3-opus', name: 'claude-3-opus', contextWindow: 200000, capabilities: ['vision', 'reasoning', 'tools'] },
    { id: 'anthropic/claude-3-sonnet', name: 'claude-3-sonnet', contextWindow: 200000, capabilities: ['vision', 'tools'] },
    { id: 'anthropic/claude-3-haiku', name: 'claude-3-haiku', contextWindow: 200000, capabilities: ['vision', 'tools'] },
    { id: 'google/gemini-pro-1.5', name: 'gemini-pro-1.5', contextWindow: 1000000, capabilities: ['vision', 'reasoning'] },
    { id: 'mistral/mistral-large', name: 'mistral-large', contextWindow: 32000, capabilities: ['tools'] },
    { id: 'meta/llama-3-70b', name: 'llama-3-70b', contextWindow: 8192, capabilities: [] },
    { id: 'deepseek/deepseek-coder', name: 'deepseek-coder', contextWindow: 16000, capabilities: ['tools'] },
];

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function FetchModelsModal({ isOpen, onClose, providerName, onAddModels }: FetchModelsModalProps) {
    const [search, setSearch] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    if (!isOpen) return null;

    const filteredModels = AVAILABLE_MODELS.filter(m =>
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.id.toLowerCase().includes(search.toLowerCase())
    );

    const toggleSelection = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const handleAdd = () => {
        const models = AVAILABLE_MODELS.filter(m => selectedIds.has(m.id));
        onAddModels(models);
        onClose();
    };

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                backdropFilter: 'blur(4px)',
            }}
            onClick={onClose}
        >
            <div
                style={{
                    width: '600px',
                    maxHeight: '80vh',
                    backgroundColor: 'var(--color-bg-elevated)',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    border: '1px solid var(--color-border)',
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div
                    style={{
                        padding: '16px 20px',
                        borderBottom: '1px solid var(--color-border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}
                >
                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
                        Fetch Models
                    </h2>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--color-text-tertiary)',
                            cursor: 'pointer',
                            padding: '4px',
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Search Toolbar */}
                <div style={{ padding: '16px', display: 'flex', gap: '8px' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <Search
                            size={16}
                            style={{
                                position: 'absolute',
                                left: '12px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: 'var(--color-text-tertiary)',
                            }}
                        />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search models..."
                            style={{
                                width: '100%',
                                padding: '10px 12px 10px 36px',
                                fontSize: '14px',
                                backgroundColor: 'var(--color-bg)',
                                border: '1px solid var(--color-border)',
                                borderRadius: 'var(--radius-md)',
                                color: 'var(--color-text)',
                                outline: 'none',
                            }}
                        />
                    </div>
                    <button
                        style={{
                            padding: '0 12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            backgroundColor: 'var(--color-bg)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-md)',
                            color: 'var(--color-text)',
                            cursor: 'pointer',
                        }}
                    >
                        <Filter size={16} />
                        Filter
                    </button>
                </div>

                {/* Header Row */}
                <div
                    style={{
                        padding: '8px 20px',
                        display: 'grid',
                        gridTemplateColumns: '32px 1fr 100px 80px',
                        gap: '12px',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: 'var(--color-text-tertiary)',
                        borderBottom: '1px solid var(--color-border)',
                        backgroundColor: 'var(--color-bg-tertiary)',
                    }}
                >
                    <div></div>
                    <div>MODEL NAME</div>
                    <div>CAPABILITIES</div>
                    <div style={{ textAlign: 'right' }}>CONTEXT</div>
                </div>

                {/* List */}
                <div
                    style={{
                        flex: 1,
                        overflowY: 'auto',
                        maxHeight: '400px',
                    }}
                    className="custom-scrollbar"
                >
                    {filteredModels.map((model, index) => {
                        const isSelected = selectedIds.has(model.id);
                        return (
                            <div
                                key={model.id}
                                onClick={() => toggleSelection(model.id)}
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '32px 1fr 100px 80px',
                                    gap: '12px',
                                    padding: '12px 20px',
                                    borderBottom: '1px solid var(--color-border-subtle)',
                                    backgroundColor: isSelected ? 'var(--color-accent-subtle)' : index % 2 === 0 ? 'var(--color-bg)' : 'var(--color-bg-secondary)',
                                    cursor: 'pointer',
                                    alignItems: 'center',
                                    fontSize: '13px',
                                }}
                            >
                                {/* Checkbox */}
                                <div
                                    style={{
                                        width: '18px',
                                        height: '18px',
                                        border: isSelected ? 'none' : '2px solid var(--color-text-tertiary)',
                                        borderRadius: '4px',
                                        backgroundColor: isSelected ? 'var(--color-accent)' : 'transparent',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    {isSelected && <span style={{ color: 'white', fontSize: '12px' }}>✓</span>}
                                </div>

                                {/* Name */}
                                <div style={{ fontWeight: 500 }}>
                                    <div style={{ color: 'var(--color-text)' }}>{model.id}</div>
                                    <div style={{ color: 'var(--color-text-tertiary)', fontSize: '11px', marginTop: '2px' }}>
                                        {model.name}
                                    </div>
                                </div>

                                {/* Capabilities */}
                                <div style={{ display: 'flex', gap: '4px' }}>
                                    {model.capabilities.includes('vision') && <Eye size={14} color="var(--color-text-secondary)" />}
                                    {model.capabilities.includes('reasoning') && <Brain size={14} color="var(--color-text-secondary)" />}
                                    {model.capabilities.includes('tools') && <Wrench size={14} color="var(--color-text-secondary)" />}
                                </div>

                                {/* Context */}
                                <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)' }}>
                                    {Math.round(model.contextWindow / 1000)}k
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div
                    style={{
                        padding: '16px 20px',
                        borderTop: '1px solid var(--color-border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: 'var(--color-bg)',
                    }}
                >
                    <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                        {selectedIds.size} selected
                    </div>
                    <button
                        onClick={handleAdd}
                        disabled={selectedIds.size === 0}
                        style={{
                            padding: '8px 24px',
                            backgroundColor: selectedIds.size > 0 ? 'var(--color-text)' : 'var(--color-bg-tertiary)',
                            color: selectedIds.size > 0 ? 'var(--color-bg)' : 'var(--color-text-tertiary)',
                            border: 'none',
                            borderRadius: 'var(--radius-md)',
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: selectedIds.size > 0 ? 'pointer' : 'not-allowed',
                        }}
                    >
                        Add Models
                    </button>
                </div>
            </div>
        </div>
    );
}
