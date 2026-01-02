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

function getActivePage(path: string): 'providers' | 'general' | 'shortcuts' {
  if (path.includes('/general')) return 'general';
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
        {activePage === 'shortcuts' && <KeyboardShortcutsPage />}
      </main>
    </div>
  );
}
