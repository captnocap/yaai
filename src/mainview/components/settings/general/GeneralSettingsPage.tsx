// =============================================================================
// GENERAL SETTINGS PAGE
// =============================================================================
// Settings page with grouped sections for app-wide settings.

import React from 'react';
import { SettingsGroup } from './SettingsGroup';
import { SettingRow } from './SettingRow';
import { useSettings } from '../../../hooks/useSettings';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface GeneralSettingsPageProps {
    className?: string;
}

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function GeneralSettingsPage({ className }: GeneralSettingsPageProps) {
    const { settings, setSetting, loading } = useSettings();

    if (loading || !settings) {
        return (
            <div style={{ padding: '24px', color: 'var(--color-text-tertiary)' }}>
                Loading settings...
            </div>
        );
    }

    return (
        <div
            className={className}
            style={{
                padding: '24px',
                maxWidth: '640px',
            }}
        >
            {/* General */}
            <SettingsGroup title="General">
                <SettingRow
                    label="Language"
                    description="Application display language"
                    control="select"
                    value="en"
                    options={[
                        { value: 'en', label: 'English' },
                        { value: 'es', label: 'Español' },
                        { value: 'fr', label: 'Français' },
                        { value: 'de', label: 'Deutsch' },
                        { value: 'ja', label: '日本語' },
                        { value: 'zh', label: '中文' },
                    ]}
                    onChange={(value) => console.log('Language:', value)}
                />
            </SettingsGroup>

            {/* Appearance */}
            <SettingsGroup title="Appearance">
                <SettingRow
                    label="Theme"
                    description="Choose your preferred color scheme"
                    control="select"
                    value={settings.theme}
                    options={[
                        { value: 'dark', label: 'Dark' },
                        { value: 'light', label: 'Light' },
                        { value: 'system', label: 'System' },
                    ]}
                    onChange={(value) => setSetting('theme', value)}
                />
                <SettingRow
                    label="Font Size"
                    description="Base font size for the interface"
                    control="select"
                    value={String(settings.fontSize)}
                    options={[
                        { value: '12', label: 'Small (12px)' },
                        { value: '14', label: 'Medium (14px)' },
                        { value: '16', label: 'Large (16px)' },
                    ]}
                    onChange={(value) => setSetting('fontSize', parseInt(value))}
                />
                <SettingRow
                    label="Mood Effects"
                    description="Enable ambient UI effects that react to conversation mood"
                    control="toggle"
                    value={settings.effects.enabled}
                    onChange={(value) => setSetting('effects.enabled', value)}
                />
            </SettingsGroup>

            {/* Proxy */}
            <SettingsGroup title="Network">
                <SettingRow
                    label="Enable Proxy"
                    description="Route API requests through a proxy server"
                    control="toggle"
                    value={settings.proxy.enabled}
                    onChange={(value) => setSetting('proxy.enabled', value)}
                />
                {settings.proxy.enabled && (
                    <>
                        <SettingRow
                            label="Proxy Host"
                            description="Proxy server hostname or IP"
                            control="input"
                            value={settings.proxy.host}
                            placeholder="127.0.0.1"
                            onChange={(value) => setSetting('proxy.host', value)}
                        />
                        <SettingRow
                            label="Proxy Port"
                            description="Proxy server port"
                            control="input"
                            value={String(settings.proxy.port)}
                            placeholder="8080"
                            onChange={(value) => setSetting('proxy.port', parseInt(value) || 8080)}
                        />
                    </>
                )}
            </SettingsGroup>

            {/* Chat Behavior */}
            <SettingsGroup title="Chat Behavior">
                <SettingRow
                    label="Stream Responses"
                    description="Show responses as they're generated"
                    control="toggle"
                    value={settings.chat.streamResponses}
                    onChange={(value) => setSetting('chat.streamResponses', value)}
                />
                <SettingRow
                    label="Auto-save Chats"
                    description="Automatically save conversations"
                    control="toggle"
                    value={settings.chat.autoSaveChats}
                    onChange={(value) => setSetting('chat.autoSaveChats', value)}
                />
                <SettingRow
                    label="Auto-generate Titles"
                    description="Automatically generate chat titles from first message"
                    control="toggle"
                    value={settings.chat.autoGenerateTitle}
                    onChange={(value) => setSetting('chat.autoGenerateTitle', value)}
                />
            </SettingsGroup>

            {/* Privacy */}
            <SettingsGroup title="Privacy">
                <SettingRow
                    label="Send Analytics"
                    description="Help improve the app by sending anonymous usage data"
                    control="toggle"
                    value={false}
                    onChange={(value) => console.log('Analytics:', value)}
                />
            </SettingsGroup>
        </div>
    );
}
