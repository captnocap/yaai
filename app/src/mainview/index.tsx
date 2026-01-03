// =============================================================================
// YAAI MAIN VIEW
// =============================================================================
// App entry point with URL-based routing.

import React from 'react';
import { createRoot } from 'react-dom/client';
import { Switch, Route } from 'wouter';
import './styles/output.css';

// WebSocket connection (must be initialized before React)
import { initWSClient } from './lib/ws-client';

// Router
import { AppRouterProvider, useAppRouter } from './router';

// Layout
import { WorkspaceShell, NavigationLayer } from './components/layout';

// Components
import { MoodProvider } from './components/effects/MoodProvider';
import { ArtifactManager, type ArtifactWithStatus } from './components/artifact';
import { ChatView } from './components/chat';
import { CodeTab } from './components/code';
import { ImageGenPage } from './components/image-gen';
import { WorkbenchPage } from './components/workbench';
import { SettingsPage } from './components/settings/SettingsPage';

import { StartupAnimation } from './components/StartupAnimation';
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
  const isCodeRoute = router.path.startsWith('/code');
  const isImageRoute = router.path.startsWith('/image');
  const isPromptsRoute = router.path.startsWith('/prompts');
  const activeNavId = router.isSettings
    ? 'settings'
    : isCodeRoute
      ? 'code'
      : isImageRoute
        ? 'image'
        : isPromptsRoute
          ? 'prompts'
          : 'chats';

  // Handle navigation item clicks
  const handleNavClick = (id: string) => {
    if (id === 'settings') {
      router.goToSettings();
    } else if (id === 'code') {
      router.navigate('/code');
    } else if (id === 'image') {
      router.navigate('/image');
    } else if (id === 'prompts') {
      router.navigate('/prompts');
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
        // Hide artifact panel on settings page, code tab, image gen, and prompts
        artifact={router.isSettings || isCodeRoute || isImageRoute || isPromptsRoute ? undefined : <ArtifactPanel />}
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

          {/* Code session with specific ID */}
          <Route path="/code/:id">
            {(params) => (
              <CodeTab sessionId={params.id} />
            )}
          </Route>

          {/* Code tab - new session */}
          <Route path="/code">
            <CodeTab />
          </Route>

          {/* Image generation */}
          <Route path="/image">
            <ImageGenPage />
          </Route>

          {/* Prompt workbench with specific session */}
          <Route path="/prompts/:id">
            {(params) => (
              <WorkbenchPage sessionId={params.id} />
            )}
          </Route>

          {/* Prompt workbench - library */}
          <Route path="/prompts">
            <WorkbenchPage />
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

// -----------------------------------------------------------------------------
// BOOTSTRAP
// -----------------------------------------------------------------------------

function Bootstrap() {
  const [wsInitDone, setWsInitDone] = React.useState(false);
  const [animationDone, setAnimationDone] = React.useState(false);

  React.useEffect(() => {
    // Initialize WebSocket connection
    // This ensures port discovery completes before any hooks try to use it
    initWSClient()
      .then(() => console.log('[YAAI] WebSocket initialized'))
      .catch((err) => console.warn('[YAAI] WebSocket init failed, continuing in demo mode:', err))
      .finally(() => setWsInitDone(true));
  }, []);

  return (
    <>
      {!animationDone && (
        <StartupAnimation
          isReady={wsInitDone}
          onComplete={() => setAnimationDone(true)}
        />
      )}

      {/* 
        Only render the App once WS init is done to prevent race conditions 
        with hooks/providers that expect the WS client to be ready.
        It renders behind the overlay first, then the overlay fades out.
      */}
      {wsInitDone && (
        <AppRouterProvider>
          <App />
        </AppRouterProvider>
      )}
    </>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(<Bootstrap />);
