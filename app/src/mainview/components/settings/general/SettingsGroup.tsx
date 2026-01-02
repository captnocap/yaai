// =============================================================================
// SETTINGS GROUP
// =============================================================================
// Collapsible section container for grouped settings.

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface SettingsGroupProps {
    title: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
}

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function SettingsGroup({ title, children, defaultOpen = true }: SettingsGroupProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <section
            style={{
                marginBottom: '24px',
                backgroundColor: 'var(--color-bg)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--color-border)',
                overflow: 'hidden',
            }}
        >
            {/* Header */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '16px 20px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                }}
            >
                <h3
                    style={{
                        margin: 0,
                        fontSize: '14px',
                        fontWeight: 600,
                        color: 'var(--color-text)',
                    }}
                >
                    {title}
                </h3>
                <ChevronDown
                    size={16}
                    style={{
                        color: 'var(--color-text-tertiary)',
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease',
                    }}
                />
            </button>

            {/* Content */}
            {isOpen && (
                <div
                    style={{
                        borderTop: '1px solid var(--color-border)',
                    }}
                >
                    {children}
                </div>
            )}
        </section>
    );
}
