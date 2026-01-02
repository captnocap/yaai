// =============================================================================
// PROVIDER ICON
// =============================================================================
// Renders a provider's brand icon using simple-icons with fallback.

import React from 'react';
import * as SimpleIcons from 'simple-icons';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface ProviderIconProps {
    providerId: string;
    providerName: string;
    size?: number;
    color?: string;
    className?: string;
}

// -----------------------------------------------------------------------------
// HELPER
// -----------------------------------------------------------------------------

function getSimpleIcon(name: string) {
    // Normalize name for lookup (e.g. "OpenAI" -> "siOpenai")
    const key = 'si' + name.replace(/[^a-zA-Z0-9]/g, '').charAt(0).toUpperCase() + name.replace(/[^a-zA-Z0-9]/g, '').slice(1).toLowerCase();

    // Try direct match
    // @ts-ignore - access simple icons dynamically
    if (SimpleIcons[key]) return SimpleIcons[key];

    // Manual mapping for common AI providers if automatic fails
    const map: Record<string, string> = {
        'openai': 'siOpenai',
        'anthropic': 'siAnthropic',
        'google': 'siGoogle',
        'openrouter': 'siOpencollective', // Placeholder or closest match if not exists
        'deepseek': 'siDeepin', // Placeholder
        'mistral': 'siMistral', // Check if exists, else fallback
        'cohere': 'siCohere', // Check if exists
    };

    const manualKey = map[name.toLowerCase()] || map[Object.keys(map).find(k => name.toLowerCase().includes(k)) || ''];
    // @ts-ignore
    if (manualKey && SimpleIcons[manualKey]) return SimpleIcons[manualKey];

    return null;
}

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function ProviderIcon({
    providerId,
    providerName,
    size = 24,
    color,
    className,
}: ProviderIconProps) {
    const icon = getSimpleIcon(providerName) || getSimpleIcon(providerId);

    if (!icon) {
        // Fallback: Initial letter
        return (
            <div
                className={className}
                style={{
                    width: size,
                    height: size,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 600,
                    fontSize: size * 0.6,
                    color: color,
                }}
            >
                {providerName.charAt(0).toUpperCase()}
            </div>
        );
    }

    return (
        <div
            className={className}
            style={{
                width: size,
                height: size,
                color: color || `#${icon.hex}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
            dangerouslySetInnerHTML={{ __html: icon.svg.replace('<svg', `<svg width="${size}" height="${size}"`) }}
        />
    );
}
