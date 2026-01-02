// =============================================================================
// SHORTCUT ROW
// =============================================================================
// Single shortcut row with inline rebind on click.

import React, { useState, useEffect, useCallback } from 'react';
import { RotateCcw } from 'lucide-react';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface ShortcutRowProps {
    id: string;
    action: string;
    keys: string;
    defaultKeys: string;
    isLast?: boolean;
    onChange: (keys: string) => void;
    onReset: () => void;
}

// -----------------------------------------------------------------------------
// KEY FORMATTING
// -----------------------------------------------------------------------------

function formatKey(e: KeyboardEvent): string {
    const parts: string[] = [];

    if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
    if (e.altKey) parts.push('Alt');
    if (e.shiftKey) parts.push('Shift');

    // Get the key
    let key = e.key;

    // Normalize special keys
    const keyMap: Record<string, string> = {
        ' ': 'Space',
        'ArrowUp': '↑',
        'ArrowDown': '↓',
        'ArrowLeft': '←',
        'ArrowRight': '→',
        'Control': '',
        'Alt': '',
        'Shift': '',
        'Meta': '',
    };

    if (keyMap[key] !== undefined) {
        key = keyMap[key];
    } else if (key.length === 1) {
        key = key.toUpperCase();
    }

    if (key) {
        parts.push(key);
    }

    return parts.join('+');
}

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function ShortcutRow({
    id,
    action,
    keys,
    defaultKeys,
    isLast,
    onChange,
    onReset,
}: ShortcutRowProps) {
    const [isCapturing, setIsCapturing] = useState(false);
    const [capturedKeys, setCapturedKeys] = useState('');

    const isModified = keys !== defaultKeys;

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (e.key === 'Escape') {
            setIsCapturing(false);
            setCapturedKeys('');
            return;
        }

        const formatted = formatKey(e);
        if (formatted) {
            setCapturedKeys(formatted);
        }
    }, []);

    const handleKeyUp = useCallback((e: KeyboardEvent) => {
        if (capturedKeys && !['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
            onChange(capturedKeys);
            setIsCapturing(false);
            setCapturedKeys('');
        }
    }, [capturedKeys, onChange]);

    useEffect(() => {
        if (isCapturing) {
            window.addEventListener('keydown', handleKeyDown);
            window.addEventListener('keyup', handleKeyUp);
            return () => {
                window.removeEventListener('keydown', handleKeyDown);
                window.removeEventListener('keyup', handleKeyUp);
            };
        }
    }, [isCapturing, handleKeyDown, handleKeyUp]);

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px 20px',
                borderBottom: isLast ? 'none' : '1px solid var(--color-border)',
            }}
        >
            {/* Action Name */}
            <span
                style={{
                    flex: 1,
                    fontSize: '14px',
                    color: 'var(--color-text)',
                }}
            >
                {action}
            </span>

            {/* Shortcut Badge */}
            <button
                onClick={() => {
                    setIsCapturing(true);
                    setCapturedKeys('');
                }}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontFamily: 'var(--font-mono)',
                    backgroundColor: isCapturing
                        ? 'var(--color-accent-subtle)'
                        : 'var(--color-bg-tertiary)',
                    border: isCapturing
                        ? '2px solid var(--color-accent)'
                        : '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    color: isCapturing
                        ? 'var(--color-accent)'
                        : 'var(--color-text)',
                    cursor: 'pointer',
                    minWidth: '100px',
                    justifyContent: 'center',
                    transition: 'all 0.15s ease',
                }}
            >
                {isCapturing ? (
                    capturedKeys || 'Press keys...'
                ) : (
                    keys.split('+').map((key, i) => (
                        <span key={i}>
                            <kbd
                                style={{
                                    padding: '2px 6px',
                                    backgroundColor: 'var(--color-bg)',
                                    borderRadius: '4px',
                                    border: '1px solid var(--color-border)',
                                    fontSize: '11px',
                                }}
                            >
                                {key}
                            </kbd>
                            {i < keys.split('+').length - 1 && (
                                <span style={{ margin: '0 2px', color: 'var(--color-text-tertiary)' }}>+</span>
                            )}
                        </span>
                    ))
                )}
            </button>

            {/* Reset Button */}
            <button
                onClick={onReset}
                disabled={!isModified}
                title="Reset to default"
                style={{
                    marginLeft: '8px',
                    padding: '6px',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'transparent',
                    color: isModified ? 'var(--color-text-tertiary)' : 'var(--color-bg-tertiary)',
                    cursor: isModified ? 'pointer' : 'default',
                    opacity: isModified ? 1 : 0.3,
                }}
            >
                <RotateCcw size={14} />
            </button>
        </div>
    );
}
