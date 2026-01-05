// =============================================================================
// FETCH MODELS MODAL
// =============================================================================
// Modal to search and select models to add from the provider.

import React, { useState, useRef, useCallback, useMemo } from 'react';
import { X, Search, Filter, Eye, Brain, Wrench } from 'lucide-react';

// -----------------------------------------------------------------------------
// VIRTUAL LIST HOOK
// -----------------------------------------------------------------------------

const ROW_HEIGHT = 52; // Fixed row height for virtual scrolling
const BUFFER_ROWS = 5; // Extra rows to render above/below viewport

function useVirtualList<T>(items: T[], containerHeight: number) {
    const [scrollTop, setScrollTop] = useState(0);

    const visibleCount = Math.ceil(containerHeight / ROW_HEIGHT) + BUFFER_ROWS * 2;
    const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - BUFFER_ROWS);
    const endIndex = Math.min(items.length, startIndex + visibleCount);

    const visibleItems = useMemo(() =>
        items.slice(startIndex, endIndex).map((item, i) => ({
            item,
            index: startIndex + i,
        })),
        [items, startIndex, endIndex]
    );

    const totalHeight = items.length * ROW_HEIGHT;
    const offsetY = startIndex * ROW_HEIGHT;

    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        setScrollTop(e.currentTarget.scrollTop);
    }, []);

    return { visibleItems, totalHeight, offsetY, handleScroll };
}

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface AvailableModel {
    id: string;
    name: string;
    contextWindow?: number;
    capabilities?: string[];
    description?: string;
}

export interface FetchModelsModalProps {
    isOpen: boolean;
    onClose: () => void;
    providerName: string;
    onAddModels: (models: AvailableModel[]) => void;
    availableModels?: AvailableModel[];
}

// -----------------------------------------------------------------------------
// DEFAULT DATA (fallback if no models provided)
// -----------------------------------------------------------------------------

const DEFAULT_MODELS: AvailableModel[] = [
    { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', contextWindow: 200000, capabilities: ['vision', 'tools'] },
    { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', contextWindow: 200000, capabilities: ['vision', 'tools'] },
    { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', contextWindow: 200000, capabilities: ['vision', 'tools'] },
];

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

const LIST_HEIGHT = 400; // Container height for virtual list

export function FetchModelsModal({ isOpen, onClose, providerName, onAddModels, availableModels }: FetchModelsModalProps) {
    const [search, setSearch] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const models = availableModels && availableModels.length > 0 ? availableModels : DEFAULT_MODELS;

    const filteredModels = useMemo(() =>
        models.filter(m =>
            m.name.toLowerCase().includes(search.toLowerCase()) ||
            m.id.toLowerCase().includes(search.toLowerCase())
        ),
        [models, search]
    );

    const { visibleItems, totalHeight, offsetY, handleScroll } = useVirtualList(filteredModels, LIST_HEIGHT);

    if (!isOpen) return null;

    const toggleSelection = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const handleAdd = () => {
        const selected = models.filter(m => selectedIds.has(m.id));
        onAddModels(selected);
        setSelectedIds(new Set());
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

                {/* Virtual List */}
                <div
                    onScroll={handleScroll}
                    style={{
                        flex: 1,
                        overflowY: 'auto',
                        height: `${LIST_HEIGHT}px`,
                    }}
                    className="custom-scrollbar"
                >
                    {/* Spacer for total scroll height */}
                    <div style={{ height: `${totalHeight}px`, position: 'relative' }}>
                        {/* Visible items container */}
                        <div style={{ position: 'absolute', top: `${offsetY}px`, left: 0, right: 0 }}>
                            {visibleItems.map(({ item: model, index }) => {
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
                                            height: `${ROW_HEIGHT}px`,
                                            boxSizing: 'border-box',
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
                                        <div style={{ fontWeight: 500, overflow: 'hidden' }}>
                                            <div style={{ color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{model.id}</div>
                                            <div style={{ color: 'var(--color-text-tertiary)', fontSize: '11px', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {model.name}
                                            </div>
                                        </div>

                                        {/* Capabilities */}
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                            {model.capabilities?.includes('vision') && <Eye size={14} color="var(--color-text-secondary)" />}
                                            {model.capabilities?.includes('reasoning') && <Brain size={14} color="var(--color-text-secondary)" />}
                                            {model.capabilities?.includes('tools') && <Wrench size={14} color="var(--color-text-secondary)" />}
                                        </div>

                                        {/* Context */}
                                        <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)' }}>
                                            {model.contextWindow ? `${Math.round(model.contextWindow / 1000)}k` : '-'}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
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
