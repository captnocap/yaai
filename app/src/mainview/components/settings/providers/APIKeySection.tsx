// =============================================================================
// API KEY SECTION
// =============================================================================
// Multiple API key inputs with add/remove and auto-save.

import React, { useState, useEffect } from 'react';
import { Plus, Eye, EyeOff, X, Check } from 'lucide-react';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface APIKeySectionProps {
    providerId: string;
    keys: string[];
    onKeysChange: (keys: string[]) => void;
    onRevealKey?: (providerId: string) => Promise<string | null>;
}

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function APIKeySection({ providerId, keys, onKeysChange, onRevealKey }: APIKeySectionProps) {
    const [localKeys, setLocalKeys] = useState<string[]>(keys.length > 0 ? keys : ['']);
    const [visibleIndexes, setVisibleIndexes] = useState<Set<number>>(new Set());
    const [savedIndexes, setSavedIndexes] = useState<Set<number>>(new Set());
    const [revealedKeys, setRevealedKeys] = useState<Record<number, string>>({});

    // Sync localKeys when keys prop changes (e.g., switching providers)
    useEffect(() => {
        setLocalKeys(keys.length > 0 ? keys : ['']);
        setVisibleIndexes(new Set());
        setSavedIndexes(new Set());
        setRevealedKeys({});
    }, [keys.join(','), providerId]);

    const handleKeyChange = (index: number, value: string) => {
        const newKeys = [...localKeys];
        newKeys[index] = value;
        setLocalKeys(newKeys);
    };

    const handleBlur = (index: number) => {
        const key = localKeys[index];

        // Remove empty keys (except the last one)
        if (!key && localKeys.length > 1) {
            const newKeys = localKeys.filter((_, i) => i !== index);
            setLocalKeys(newKeys);
            onKeysChange(newKeys.filter(Boolean));
            return;
        }

        // Save non-empty keys
        if (key) {
            onKeysChange(localKeys.filter(Boolean));
            setSavedIndexes(prev => new Set([...prev, index]));
            setTimeout(() => {
                setSavedIndexes(prev => {
                    const next = new Set(prev);
                    next.delete(index);
                    return next;
                });
            }, 1500);
        }
    };

    const addKey = () => {
        setLocalKeys([...localKeys, '']);
    };

    const removeKey = (index: number) => {
        if (localKeys.length <= 1) return;
        const newKeys = localKeys.filter((_, i) => i !== index);
        setLocalKeys(newKeys);
        onKeysChange(newKeys.filter(Boolean));
    };

    const toggleVisibility = async (index: number) => {
        const isCurrentlyVisible = visibleIndexes.has(index);

        if (isCurrentlyVisible) {
            // Hide - just toggle visibility
            setVisibleIndexes(prev => {
                const next = new Set(prev);
                next.delete(index);
                return next;
            });
        } else {
            // Show - fetch real key if it's a masked placeholder
            const key = localKeys[index];
            if (key.startsWith('••') && onRevealKey) {
                const realKey = await onRevealKey(providerId);
                if (realKey) {
                    setRevealedKeys(prev => ({ ...prev, [index]: realKey }));
                }
            }
            setVisibleIndexes(prev => {
                const next = new Set(prev);
                next.add(index);
                return next;
            });
        }
    };

    return (
        <div>
            <label
                style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--color-text-secondary)',
                    marginBottom: '8px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                }}
            >
                API Keys
            </label>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                {localKeys.map((key, index) => (
                    <div
                        key={index}
                        style={{
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center',
                        }}
                    >
                        <input
                            type={visibleIndexes.has(index) ? 'text' : 'password'}
                            value={visibleIndexes.has(index) && revealedKeys[index] ? revealedKeys[index] : key}
                            onChange={(e) => handleKeyChange(index, e.target.value)}
                            onBlur={() => handleBlur(index)}
                            placeholder="sk-..."
                            readOnly={key.startsWith('••') && !visibleIndexes.has(index)}
                            onFocus={(e) => {
                                // Clear masked placeholder on focus so user can enter new key
                                if (key.startsWith('••') && !visibleIndexes.has(index)) {
                                    handleKeyChange(index, '');
                                    setRevealedKeys(prev => {
                                        const next = { ...prev };
                                        delete next[index];
                                        return next;
                                    });
                                }
                            }}
                            style={{
                                width: '280px',
                                padding: '10px 72px 10px 12px',
                                fontSize: '14px',
                                fontFamily: 'var(--font-mono)',
                                backgroundColor: key.startsWith('••')
                                    ? 'var(--color-success-dim, rgba(34, 197, 94, 0.1))'
                                    : 'var(--color-bg-tertiary)',
                                border: savedIndexes.has(index)
                                    ? '1px solid var(--color-success)'
                                    : key.startsWith('••')
                                    ? '1px solid var(--color-success, #22c55e)'
                                    : '1px solid var(--color-border)',
                                borderRadius: 'var(--radius-md)',
                                color: key.startsWith('••') && !visibleIndexes.has(index)
                                    ? 'var(--color-success, #22c55e)'
                                    : 'var(--color-text)',
                                outline: 'none',
                                transition: 'all 0.15s ease',
                                cursor: key.startsWith('••') && !visibleIndexes.has(index) ? 'pointer' : 'text',
                            }}
                            title={key.startsWith('••') && !visibleIndexes.has(index) ? 'Click to replace API key' : undefined}
                        />

                        {/* Action buttons */}
                        <div
                            style={{
                                position: 'absolute',
                                right: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                            }}
                        >
                            {savedIndexes.has(index) && (
                                <Check size={14} color="var(--color-success)" />
                            )}
                            <button
                                onClick={() => toggleVisibility(index)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    padding: '4px',
                                    cursor: 'pointer',
                                    color: 'var(--color-text-tertiary)',
                                }}
                            >
                                {visibleIndexes.has(index) ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                            {localKeys.length > 1 && (
                                <button
                                    onClick={() => removeKey(index)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        padding: '4px',
                                        cursor: 'pointer',
                                        color: 'var(--color-text-tertiary)',
                                    }}
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    </div>
                ))}

                {/* Add key button */}
                <button
                    onClick={addKey}
                    style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px dashed var(--color-border)',
                        backgroundColor: 'transparent',
                        color: 'var(--color-text-tertiary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                    title="Add another API key"
                >
                    <Plus size={16} />
                </button>
            </div>
        </div>
    );
}
