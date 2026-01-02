// =============================================================================
// SETTINGS NAVIGATION
// =============================================================================
// Left navigation panel for settings pages.

import React from 'react';
import {
    Server,
    Settings,
    Keyboard,
    ArrowLeft,
    Terminal,
} from 'lucide-react';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface SettingsNavProps {
    activePath: string;
    onNavigate: (path: string) => void;
    onClose?: () => void;
}

interface NavItem {
    id: string;
    path: string;
    label: string;
    icon: React.ElementType;
}

// -----------------------------------------------------------------------------
// NAV ITEMS
// -----------------------------------------------------------------------------

const NAV_ITEMS: NavItem[] = [
    { id: 'providers', path: '/settings/providers', label: 'Model Providers', icon: Server },
    { id: 'general', path: '/settings/general', label: 'General', icon: Settings },
    { id: 'claude-code', path: '/settings/claude-code', label: 'Claude Code', icon: Terminal },
    { id: 'shortcuts', path: '/settings/shortcuts', label: 'Keyboard Shortcuts', icon: Keyboard },
];

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function SettingsNav({ activePath, onNavigate, onClose }: SettingsNavProps) {
    return (
        <nav
            style={{
                width: '220px',
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                padding: '16px 12px',
                borderRight: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-bg)',
            }}
        >
            {/* Header */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '24px',
                    padding: '0 8px',
                }}
            >
                {onClose && (
                    <button
                        onClick={onClose}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '28px',
                            height: '28px',
                            borderRadius: 'var(--radius-md)',
                            backgroundColor: 'transparent',
                            border: 'none',
                            color: 'var(--color-text-tertiary)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                        }}
                        title="Back"
                    >
                        <ArrowLeft size={16} />
                    </button>
                )}
                <h1
                    style={{
                        margin: 0,
                        fontSize: '18px',
                        fontWeight: 600,
                        color: 'var(--color-text)',
                    }}
                >
                    Settings
                </h1>
            </div>

            {/* Nav Items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {NAV_ITEMS.map((item) => {
                    const isActive = activePath.includes(item.id) ||
                        (item.id === 'providers' && activePath === '/settings');
                    const Icon = item.icon;

                    return (
                        <button
                            key={item.id}
                            onClick={() => onNavigate(item.path)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '10px 12px',
                                border: 'none',
                                borderRadius: 'var(--radius-md)',
                                backgroundColor: isActive ? 'var(--color-accent-subtle)' : 'transparent',
                                color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                fontSize: '14px',
                                textAlign: 'left',
                            }}
                        >
                            <Icon size={18} style={{ flexShrink: 0 }} />
                            <span style={{ flex: 1 }}>{item.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* Version info */}
            <div
                style={{
                    padding: '12px',
                    fontSize: '11px',
                    color: 'var(--color-text-tertiary)',
                    textAlign: 'center',
                }}
            >
                YAAI v0.1.0
            </div>
        </nav>
    );
}
