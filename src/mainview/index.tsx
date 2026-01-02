// =============================================================================
// YAAI MAIN VIEW
// =============================================================================
// App entry point with URL-based routing.

import React from 'react';
import { createRoot } from 'react-dom/client';
import { Switch, Route } from 'wouter';
import './styles/output.css';

// Router
import { AppRouterProvider, useAppRouter } from './router';

// Layout
import { WorkspaceShell, NavigationLayer } from './components/layout';

// Components
import { MoodProvider } from './components/effects/MoodProvider';
import { ArtifactManager, type ArtifactWithStatus } from './components/artifact';
import { ChatView } from './components/chat';
import { SettingsPage } from './components/settings/SettingsPage';
import { useArtifacts } from './hooks';
import type { ArtifactManifest, ArtifactFiles } from './types';

// -----------------------------------------------------------------------------
// MOCK ARTIFACTS (temporary)
// -----------------------------------------------------------------------------

const mockArtifacts: ArtifactWithStatus[] = [
  {
    manifest: {
      id: 'github-issues',
      name: 'GitHub Issues',
      description: 'Fetch and manage GitHub issues from any repository.',
      type: 'tool',
      version: '1.2.0',
      entry: 'handler.ts',
      apis: ['github'],
      tags: ['github', 'issues'],
      createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
      updatedAt: new Date(Date.now() - 3600000).toISOString(),
      createdBy: { type: 'chat', ref: 'chat-123' },
      icon: '🐙',
    },
    status: 'installed',
  },
  {
    manifest: {
      id: 'code-preview',
      name: 'Code Preview',
      description: 'Renders React/HTML code in a sandboxed iframe.',
      type: 'view',
      version: '2.0.0',
      entry: 'handler.ts',
      ui: 'index.tsx',
      tags: ['preview', 'react'],
      createdAt: new Date(Date.now() - 86400000 * 14).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      createdBy: { type: 'builtin' },
      icon: '👁',
    },
    status: 'installed',
  },
];

// -----------------------------------------------------------------------------
// ARTIFACT PANEL
// -----------------------------------------------------------------------------

function ArtifactPanel() {
  const {
    artifacts,
    executing,
    results,
    invoke,
    install,
    enable,
    disable,
    uninstall,
  } = useArtifacts();

  const displayArtifacts = artifacts.length > 0 ? artifacts : mockArtifacts;

  const handleToggleEnabled = async (id: string, enabled: boolean) => {
    if (enabled) {
      await enable(id);
    } else {
      await disable(id);
    }
  };

  const handleInvoke = async (id: string, input?: unknown) => {
    console.log('Invoking artifact:', id, input);
    await invoke(id, input);
  };

  const handleInstall = async (manifest: ArtifactManifest, files: ArtifactFiles) => {
    console.log('Installing artifact:', manifest.id);
    await install(manifest, files);
  };

  return (
    <ArtifactManager
      artifacts={displayArtifacts}
      executionResults={results}
      loadingUI={new Set(Array.from(executing))}
      onInvoke={handleInvoke}
      onEdit={(id) => console.log('Edit:', id)}
      onDelete={async (id) => {
        if (confirm(`Delete artifact "${id}"?`)) {
          await uninstall(id);
        }
      }}
      onToggleEnabled={handleToggleEnabled}
      onInstall={handleInstall}
      showHeader={false}
    />
  );
}

// -----------------------------------------------------------------------------
// MAIN APP
// -----------------------------------------------------------------------------

function App() {
  const router = useAppRouter();

  // Determine active nav item based on route
  const activeNavId = router.isSettings ? 'settings' : 'chats';

  // Handle navigation item clicks
  const handleNavClick = (id: string) => {
    if (id === 'settings') {
      router.goToSettings();
    } else {
      router.goToNewChat();
    }
  };

  // Handle new chat creation
  const handleNewChat = () => {
    router.goToNewChat();
  };

  // Handle chat creation from ChatView (when first message is sent)
  const handleChatCreated = (chatId: string) => {
    router.goToChat(chatId);
  };

  return (
    <MoodProvider initialSettings={{ enabled: false }}>
      <WorkspaceShell
        initialNavExpanded={false}
        initialArtifactDock="right"
        navigation={
          <NavigationLayer
            activeId={activeNavId}
            onItemClick={handleNavClick}
            onNewChat={handleNewChat}
          />
        }
        // Hide artifact panel on settings page
        artifact={router.isSettings ? undefined : <ArtifactPanel />}
      >
        <Switch>
          {/* Settings routes */}
          <Route path="/settings/:rest*">
            <SettingsPage
              path={router.path}
              onNavigate={router.navigate}
              onClose={() => router.goToNewChat()}
            />
          </Route>

          {/* Chat with specific ID */}
          <Route path="/chat/:id">
            {(params) => (
              <ChatView
                chatId={params.id}
                onChatCreated={handleChatCreated}
              />
            )}
          </Route>

          {/* Home / New chat */}
          <Route path="/">
            <ChatView
              chatId={null}
              onChatCreated={handleChatCreated}
            />
          </Route>
        </Switch>
      </WorkspaceShell>
    </MoodProvider>
  );
}

// -----------------------------------------------------------------------------
// RENDER
// -----------------------------------------------------------------------------

const root = createRoot(document.getElementById('root')!);
root.render(
  <AppRouterProvider>
    <App />
  </AppRouterProvider>
);
