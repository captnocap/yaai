// =============================================================================
// GRID TOOLBAR
// =============================================================================
// Search, filter, highlighting, and view controls for the model grid.

import React from 'react';
import { Search, LayoutGrid, List, Plus, ChevronDown } from 'lucide-react';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface GridToolbarProps {
    searchQuery: string;
    onSearchChange: (query: string) => void;
    viewMode: 'grid' | 'list';
    onViewModeChange: (mode: 'grid' | 'list') => void;
    activeGroup?: string;
    onGroupChange?: (group: string) => void;
    onNewGroup?: () => void;
}

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function GridToolbar({
    searchQuery,
    onSearchChange,
    viewMode,
    onViewModeChange,
    activeGroup = 'All',
    onGroupChange,
    onNewGroup,
}: GridToolbarProps) {
    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '16px',
                padding: '0 4px', // Slight padding for optical alignment
            }}
        >
            {/* Group Filters */}
            <div style={{ display: 'flex', gap: '8px' }}>
                <FilterButton
                    label="All"
                    isActive={activeGroup === 'All'}
                    onClick={() => onGroupChange?.('All')}
                />
                <FilterButton
                    label="Vision"
                    isActive={activeGroup === 'Vision'}
                    onClick={() => onGroupChange?.('Vision')}
                />

                {/* New Group Button */}
                <button
                    onClick={onNewGroup}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '6px 10px',
                        fontSize: '12px',
                        fontWeight: 500,
                        backgroundColor: 'transparent',
                        border: '1px dashed var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--color-text-secondary)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                    }}
                >
                    <Plus size={14} />
                    New Group
                </button>
            </div>

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* Search */}
            <div style={{ position: 'relative', width: '220px' }}>
                <Search
                    size={14}
                    style={{
                        position: 'absolute',
                        left: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--color-text-tertiary)',
                    }}
                />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Search models..."
                    style={{
                        width: '100%',
                        padding: '6px 10px 6px 30px',
                        fontSize: '13px',
                        backgroundColor: 'var(--color-bg)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--color-text)',
                        outline: 'none',
                    }}
                />
            </div>

            {/* View Toggle */}
            <div
                style={{
                    display: 'flex',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                }}
            >
                <button
                    onClick={() => onViewModeChange('grid')}
                    style={{
                        padding: '6px 8px',
                        backgroundColor: viewMode === 'grid' ? 'var(--color-bg-tertiary)' : 'var(--color-bg)',
                        border: 'none',
                        color: viewMode === 'grid' ? 'var(--color-text)' : 'var(--color-text-tertiary)',
                        cursor: 'pointer',
                    }}
                    title="Grid view"
                >
                    <LayoutGrid size={14} />
                </button>
                <button
                    onClick={() => onViewModeChange('list')}
                    style={{
                        padding: '6px 8px',
                        backgroundColor: viewMode === 'list' ? 'var(--color-bg-tertiary)' : 'var(--color-bg)',
                        border: 'none',
                        borderLeft: '1px solid var(--color-border)',
                        color: viewMode === 'list' ? 'var(--color-text)' : 'var(--color-text-tertiary)',
                        cursor: 'pointer',
                    }}
                    title="List view"
                >
                    <List size={14} />
                </button>
            </div>
        </div>
    );
}

// -----------------------------------------------------------------------------
// HELPER COMPONENTS
// -----------------------------------------------------------------------------

function FilterButton({ label, isActive, onClick }: { label: string; isActive: boolean; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 10px',
                fontSize: '12px',
                fontWeight: 500,
                backgroundColor: isActive ? 'var(--color-text)' : 'var(--color-bg)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                color: isActive ? 'var(--color-bg)' : 'var(--color-text)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
            }}
        >
            {label}
            <ChevronDown size={12} style={{ opacity: 0.5 }} />
        </button>
    );
}
