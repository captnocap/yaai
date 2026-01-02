// =============================================================================
// API HOST SECTION
// =============================================================================
// Single URL input for custom API base URL.

import React, { useState, useEffect } from 'react';
import { Check } from 'lucide-react';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface APIHostSectionProps {
    providerId: string;
    baseUrl: string;
    onBaseUrlChange: (url: string) => void;
}

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function APIHostSection({ providerId, baseUrl, onBaseUrlChange }: APIHostSectionProps) {
    const [localUrl, setLocalUrl] = useState(baseUrl);
    const [saved, setSaved] = useState(false);

    // Sync with prop
    useEffect(() => {
        setLocalUrl(baseUrl);
    }, [baseUrl, providerId]);

    const handleBlur = () => {
        if (localUrl !== baseUrl) {
            onBaseUrlChange(localUrl);
            setSaved(true);
            setTimeout(() => setSaved(false), 1500);
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
                API Base URL
            </label>

            <div style={{ position: 'relative' }}>
                <input
                    type="url"
                    value={localUrl}
                    onChange={(e) => setLocalUrl(e.target.value)}
                    onBlur={handleBlur}
                    placeholder="https://api.example.com/v1"
                    style={{
                        width: '100%',
                        padding: '10px 36px 10px 12px',
                        fontSize: '14px',
                        backgroundColor: 'var(--color-bg-tertiary)',
                        border: saved
                            ? '1px solid var(--color-success)'
                            : '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--color-text)',
                        outline: 'none',
                        transition: 'border-color 0.15s ease',
                    }}
                />
                {saved && (
                    <Check
                        size={14}
                        color="var(--color-success)"
                        style={{
                            position: 'absolute',
                            right: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                        }}
                    />
                )}
            </div>

            <p
                style={{
                    margin: '6px 0 0 0',
                    fontSize: '11px',
                    color: 'var(--color-text-tertiary)',
                }}
            >
                Leave empty to use the default endpoint
            </p>
        </div>
    );
}
