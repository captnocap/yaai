// =============================================================================
// KEYBOARD SHORTCUTS PAGE
// =============================================================================
// Page for viewing and rebinding keyboard shortcuts.

import React from 'react';
import { ShortcutRow } from './ShortcutRow';
import { useSettings } from '../../../hooks/useSettings';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface KeyboardShortcutsPageProps {
    className?: string;
}

interface ShortcutDef {
    id: string;
    action: string;
    defaultKeys: string;
    category: string;
}

// -----------------------------------------------------------------------------
// SHORTCUT DEFINITIONS
// -----------------------------------------------------------------------------

const SHORTCUTS: ShortcutDef[] = [
    // Navigation
    { id: 'newChat', action: 'New Chat', defaultKeys: 'Ctrl+N', category: 'Navigation' },
    { id: 'search', action: 'Search', defaultKeys: 'Ctrl+K', category: 'Navigation' },
    { id: 'toggleSidebar', action: 'Toggle Sidebar', defaultKeys: 'Ctrl+B', category: 'Navigation' },
    { id: 'settings', action: 'Open Settings', defaultKeys: 'Ctrl+,', category: 'Navigation' },

    // Chat
    { id: 'send', action: 'Send Message', defaultKeys: 'Enter', category: 'Chat' },
    { id: 'sendWithShift', action: 'New Line', defaultKeys: 'Shift+Enter', category: 'Chat' },
    { id: 'regenerate', action: 'Regenerate Response', defaultKeys: 'Ctrl+Shift+R', category: 'Chat' },
    { id: 'stopGeneration', action: 'Stop Generation', defaultKeys: 'Escape', category: 'Chat' },

    // Editing
    { id: 'copy', action: 'Copy Message', defaultKeys: 'Ctrl+C', category: 'Editing' },
    { id: 'selectAll', action: 'Select All', defaultKeys: 'Ctrl+A', category: 'Editing' },

    // Window
    { id: 'zoomIn', action: 'Zoom In', defaultKeys: 'Ctrl+=', category: 'Window' },
    { id: 'zoomOut', action: 'Zoom Out', defaultKeys: 'Ctrl+-', category: 'Window' },
    { id: 'resetZoom', action: 'Reset Zoom', defaultKeys: 'Ctrl+0', category: 'Window' },
];

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function KeyboardShortcutsPage({ className }: KeyboardShortcutsPageProps) {
    const { settings, setSetting } = useSettings();

    const shortcuts = settings?.shortcuts || {};

    // Group shortcuts by category
    const categories = SHORTCUTS.reduce((acc, shortcut) => {
        if (!acc[shortcut.category]) {
            acc[shortcut.category] = [];
        }
        acc[shortcut.category].push(shortcut);
        return acc;
    }, {} as Record<string, ShortcutDef[]>);

    const handleShortcutChange = (id: string, keys: string) => {
        setSetting(`shortcuts.${id}`, keys);
    };

    const handleReset = (id: string, defaultKeys: string) => {
        setSetting(`shortcuts.${id}`, defaultKeys);
    };

    return (
        <div
            className={className}
            style={{
                padding: '24px',
                maxWidth: '720px',
            }}
        >
            <div
                style={{
                    marginBottom: '24px',
                }}
            >
                <h2
                    style={{
                        margin: 0,
                        fontSize: '16px',
                        fontWeight: 600,
                        color: 'var(--color-text)',
                        marginBottom: '8px',
                    }}
                >
                    Keyboard Shortcuts
                </h2>
                <p
                    style={{
                        margin: 0,
                        fontSize: '13px',
                        color: 'var(--color-text-tertiary)',
                    }}
                >
                    Click on a shortcut to rebind it. Press Escape to cancel.
                </p>
            </div>

            {Object.entries(categories).map(([category, items]) => (
                <section
                    key={category}
                    style={{
                        marginBottom: '24px',
                        backgroundColor: 'var(--color-bg)',
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid var(--color-border)',
                        overflow: 'hidden',
                    }}
                >
                    {/* Category Header */}
                    <div
                        style={{
                            padding: '12px 20px',
                            backgroundColor: 'var(--color-bg-tertiary)',
                            borderBottom: '1px solid var(--color-border)',
                        }}
                    >
                        <h3
                            style={{
                                margin: 0,
                                fontSize: '12px',
                                fontWeight: 600,
                                color: 'var(--color-text-secondary)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                            }}
                        >
                            {category}
                        </h3>
                    </div>

                    {/* Shortcuts */}
                    <div>
                        {items.map((shortcut, index) => (
                            <ShortcutRow
                                key={shortcut.id}
                                id={shortcut.id}
                                action={shortcut.action}
                                keys={shortcuts[shortcut.id] || shortcut.defaultKeys}
                                defaultKeys={shortcut.defaultKeys}
                                isLast={index === items.length - 1}
                                onChange={(keys) => handleShortcutChange(shortcut.id, keys)}
                                onReset={() => handleReset(shortcut.id, shortcut.defaultKeys)}
                            />
                        ))}
                    </div>
                </section>
            ))}
        </div>
    );
}
