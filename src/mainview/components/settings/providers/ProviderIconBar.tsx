// =============================================================================
// PROVIDER ICON BAR
// =============================================================================
// Horizontal bar of provider icons with selection state.

import React from 'react';
import { Plus } from 'lucide-react';
import { ProviderIcon } from './ProviderIcon';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface Provider {
    id: string;
    name: string;
    brandColor?: string;
    iconPath?: string;
}

export interface ProviderIconBarProps {
    providers: Provider[];
    selectedId: string;
    onSelect: (id: string) => void;
    onAdd: () => void;
}

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function ProviderIconBar({
    providers,
    selectedId,
    onSelect,
    onAdd,
}: ProviderIconBarProps) {
    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '24px 24px 0 24px', // Aligned with page padding
            }}
        >
            {/* Add Provider Button */}
            <button
                onClick={onAdd}
                style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%', // Circular per wireframe
                    border: '1px dashed var(--color-border)',
                    backgroundColor: 'transparent',
                    color: 'var(--color-text-tertiary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-accent)';
                    e.currentTarget.style.color = 'var(--color-accent)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-border)';
                    e.currentTarget.style.color = 'var(--color-text-tertiary)';
                }}
                title="Add provider"
            >
                <Plus size={18} />
            </button>

            {/* Vertical Divider */}
            <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--color-border)', margin: '0 8px' }} />

            {/* Provider Icons */}
            {providers.map((provider) => {
                const isSelected = provider.id === selectedId;

                return (
                    <div key={provider.id} style={{ position: 'relative' }}>
                        <button
                            onClick={() => onSelect(provider.id)}
                            style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%', // Circular
                                border: isSelected
                                    ? `2px solid ${provider.brandColor || 'var(--color-accent)'}`
                                    : '1px solid var(--color-border)',
                                backgroundColor: isSelected
                                    ? 'var(--color-bg)'
                                    : 'var(--color-bg-tertiary)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.15s ease',
                                transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                                boxShadow: isSelected ? `0 0 0 4px ${provider.brandColor}20` : 'none',
                            }}
                            title={provider.name}
                        >
                            <ProviderIcon
                                providerId={provider.id}
                                providerName={provider.name}
                                size={20}
                                color={isSelected ? provider.brandColor : 'var(--color-text-tertiary)'}
                            />
                        </button>

                        {/* Tooltip-style name on hover (simplified as absolute text for now) */}
                        {isSelected && (
                            <div
                                style={{
                                    position: 'absolute',
                                    top: '-32px',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    backgroundColor: 'var(--color-bg-inverse)',
                                    color: 'var(--color-text-inverse)',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    fontSize: '11px',
                                    whiteSpace: 'nowrap',
                                    pointerEvents: 'none',
                                    zIndex: 10,
                                }}
                            >
                                {provider.name}
                                {/* Tiny arrow */}
                                <div
                                    style={{
                                        position: 'absolute',
                                        bottom: '-4px',
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        borderLeft: '4px solid transparent',
                                        borderRight: '4px solid transparent',
                                        borderTop: '4px solid var(--color-bg-inverse)',
                                    }}
                                />
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
