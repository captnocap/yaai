// =============================================================================
// SETTINGS PAGE
// =============================================================================
// Router-ready settings page with 2-panel layout (nav | content).
// Designed to plug directly into URL-based routing.

import React from 'react';
import { SettingsNav } from './SettingsNav';
import { ModelProviderPage } from './providers';
import { GeneralSettingsPage } from './general';
import { KeyboardShortcutsPage } from './shortcuts';
import { ClaudeCodeSettingsPage } from './claude-code';
import { VariablesSettingsPage } from './variables';
import { DefaultModelsPage } from './defaults';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface SettingsPageProps {
  /** Current path, e.g. '/settings/providers' */
  path: string;
  /** Called when user navigates to a different settings page */
  onNavigate: (path: string) => void;
  /** Called when user wants to exit settings */
  onClose?: () => void;
  className?: string;
}

// -----------------------------------------------------------------------------
// PATH MATCHING
// -----------------------------------------------------------------------------

function getActivePage(path: string): 'providers' | 'general' | 'variables' | 'claude-code' | 'shortcuts' | 'defaults' {
  if (path.includes('/general')) return 'general';
  if (path.includes('/defaults')) return 'defaults';
  if (path.includes('/variables')) return 'variables';
  if (path.includes('/claude-code')) return 'claude-code';
  if (path.includes('/shortcuts')) return 'shortcuts';
  return 'providers'; // default
}

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function SettingsPage({
  path,
  onNavigate,
  onClose,
  className,
}: SettingsPageProps) {
  const activePage = getActivePage(path);

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        height: '100%',
        backgroundColor: 'var(--color-bg)',
      }}
    >
      {/* Left Navigation */}
      <SettingsNav
        activePath={path}
        onNavigate={onNavigate}
        onClose={onClose}
      />

      {/* Content Area */}
      <main
        style={{
          flex: 1,
          overflow: 'auto',
          backgroundColor: 'var(--color-bg-secondary)',
        }}
        className="custom-scrollbar"
      >
        {activePage === 'providers' && <ModelProviderPage />}
        {activePage === 'general' && <GeneralSettingsPage />}
        {activePage === 'defaults' && <DefaultModelsPage />}
        {activePage === 'variables' && <VariablesSettingsPage />}
        {activePage === 'claude-code' && <ClaudeCodeSettingsPage />}
        {activePage === 'shortcuts' && <KeyboardShortcutsPage />}
      </main>
    </div>
  );
}
