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
import { sendMessage } from './lib/comm-bridge';

// Router
import { AppRouterProvider, useAppRouter } from './router';

// Layout
import { WorkspaceShell } from './components/layout';
import { ProjectNavigator } from './components/layout/ProjectNavigator';
import type { ProjectAction } from './components/layout/ProjectContextMenu';

// Components
import { MoodProvider } from './components/effects/MoodProvider';
import { ArtifactManager, type ArtifactWithStatus } from './components/artifact';
import { ChatView } from './components/chat';
import { CodeTab } from './components/code';
import { ImageGenPage } from './components/image-gen';
import { ResearchPage } from './components/research';
import { WorkbenchPage } from './components/workbench';
import { SettingsPage } from './components/settings/SettingsPage';

import { StartupAnimation } from './components/StartupAnimation';
import { useArtifacts, useProjects } from './hooks';
import type { ArtifactManifest, ArtifactFiles } from './types';
import type { ProjectType, ProjectSummary } from '../bun/lib/stores/chat-store.types';

// -----------------------------------------------------------------------------
// EPHEMERAL PROJECTS
// -----------------------------------------------------------------------------
// Projects that exist only in state until they have real content.
// They appear immediately in the sidebar but aren't persisted until used.

interface EphemeralProject {
  id: string;           // e.g., "new-chat-1704067200000"
  type: ProjectType;
  title: string;        // "New Chat", "New Code Session", etc.
  createdAt: string;
  isEphemeral: true;    // Marker to distinguish from persisted
}

const PROJECT_TITLES: Record<ProjectType, string> = {
  chat: 'New Chat',
  code: 'New Code Session',
  image: 'New Image Project',
  research: 'New Research',
};

function createEphemeralProject(type: ProjectType): EphemeralProject {
  return {
    id: `new-${type}-${Date.now()}`,
    type,
    title: PROJECT_TITLES[type],
    createdAt: new Date().toISOString(),
    isEphemeral: true,
  };
}

function ephemeralToSummary(ep: EphemeralProject): ProjectSummary {
  return {
    id: ep.id,
    type: ep.type,
    title: ep.title,
    lastInteractedAt: ep.createdAt,
    isPinned: false,
    isArchived: false,
  };
}

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

  // Ephemeral projects - exist only in state until they have real content
  const [ephemeralProjects, setEphemeralProjects] = React.useState<EphemeralProject[]>([]);

  // Projects state for sidebar navigator
  const {
    projects,
    loading: projectsLoading,
    searchQuery,
    setSearchQuery,
    showArchived,
    setShowArchived,
    pinProject,
    unpinProject,
    archiveProject,
    unarchiveProject,
    deleteProject,
    renameProject,
    recordInteraction,
    refresh: refreshProjects,
  } = useProjects();

  // Merge ephemeral projects with persisted projects
  // Ephemeral projects appear at the top since they're "most recent"
  const allProjects: ProjectSummary[] = React.useMemo(() => {
    const ephemeralSummaries = ephemeralProjects.map(ephemeralToSummary);
    return [...ephemeralSummaries, ...projects];
  }, [ephemeralProjects, projects]);

  // Determine active nav item based on route
  const isCodeRoute = router.path.startsWith('/code');
  const isImageRoute = router.path.startsWith('/image');
  const isResearchRoute = router.path.startsWith('/research');
  const isPromptsRoute = router.path.startsWith('/prompts');

  // Handle new project creation - creates an ephemeral project
  const handleNewProject = (type: string) => {
    const projectType = type as ProjectType;
    const ephemeral = createEphemeralProject(projectType);
    setEphemeralProjects(prev => [ephemeral, ...prev]);

    // Navigate to the ephemeral project
    if (projectType === 'chat') {
      router.navigate(`/chat/${ephemeral.id}`);
    } else if (projectType === 'code') {
      router.navigate(`/code/${ephemeral.id}`);
    } else if (projectType === 'image') {
      router.navigate(`/image/${ephemeral.id}`);
    } else if (projectType === 'research') {
      router.navigate(`/research/${ephemeral.id}`);
    }
  };

  // Check if a project ID is ephemeral
  const isEphemeralId = (id: string) => id.startsWith('new-');

  // Promote an ephemeral project to a real one (called when content is created)
  const promoteEphemeralProject = React.useCallback((ephemeralId: string, realId: string) => {
    // Remove the ephemeral project from state
    setEphemeralProjects(prev => prev.filter(p => p.id !== ephemeralId));
    // Refresh projects to pick up the new persisted one
    refreshProjects();
    // Navigate to the real project
    router.navigate(router.path.replace(ephemeralId, realId));
  }, [refreshProjects, router]);

  // Handle project click - navigate and record interaction
  const handleProjectClick = async (project: { id: string; type: string }) => {
    // Don't record interaction for ephemeral projects
    if (!isEphemeralId(project.id)) {
      await recordInteraction(project.id, project.type as ProjectType);
    }

    // Navigate to the project
    if (project.type === 'chat') {
      router.navigate(`/chat/${project.id}`);
    } else if (project.type === 'code') {
      router.navigate(`/code/${project.id}`);
    } else if (project.type === 'image') {
      router.navigate(`/image/${project.id}`);
    } else if (project.type === 'research') {
      router.navigate(`/research/${project.id}`);
    }
  };

  // Handle project actions from context menu
  const handleProjectAction = async (action: ProjectAction, project: { id: string; type: string; isPinned: boolean; isArchived: boolean }) => {
    const projectType = project.type as ProjectType;

    // Handle ephemeral projects differently - can only delete them
    if (isEphemeralId(project.id)) {
      if (action === 'delete') {
        setEphemeralProjects(prev => prev.filter(p => p.id !== project.id));
        // Navigate away if we're on this project
        if (router.currentProjectId === project.id) {
          router.navigate('/');
        }
      }
      // Other actions don't apply to ephemeral projects
      return;
    }

    switch (action) {
      case 'pin':
        await pinProject(project.id, projectType);
        break;
      case 'unpin':
        await unpinProject(project.id, projectType);
        break;
      case 'rename':
        const newName = prompt('Enter new name:');
        if (newName) {
          await renameProject(project.id, projectType, newName);
        }
        break;
      case 'archive':
        await archiveProject(project.id, projectType);
        break;
      case 'unarchive':
        await unarchiveProject(project.id, projectType);
        break;
      case 'delete':
        if (confirm(`Delete this ${project.type}? This cannot be undone.`)) {
          await deleteProject(project.id, projectType);
        }
        break;
    }
  };

  // Handle chat creation from ChatView (when first message is sent)
  // This promotes an ephemeral project to a real one
  const handleChatCreated = (realChatId: string, ephemeralId?: string) => {
    if (ephemeralId && isEphemeralId(ephemeralId)) {
      promoteEphemeralProject(ephemeralId, realChatId);
    } else {
      router.goToChat(realChatId);
    }
  };

  return (
    <MoodProvider initialSettings={{ enabled: false }}>
      <WorkspaceShell
        initialNavExpanded={true}
        initialArtifactDock="right"
        navigation={
          <ProjectNavigator
            projects={allProjects}
            activeProjectId={router.currentProjectId}
            onProjectClick={handleProjectClick}
            onNewProject={handleNewProject}
            onProjectAction={handleProjectAction}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            showArchived={showArchived}
            onShowArchivedChange={setShowArchived}
            loading={projectsLoading}
          />
        }
        // Hide artifact panel on settings page, code tab, image gen, research, and prompts
        artifact={router.isSettings || isCodeRoute || isImageRoute || isResearchRoute || isPromptsRoute ? undefined : <ArtifactPanel />}
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

          {/* Deep Research with specific session */}
          <Route path="/research/:id">
            {(params) => (
              <ResearchPage sessionId={params.id} />
            )}
          </Route>

          {/* Deep Research - new session */}
          <Route path="/research">
            <ResearchPage />
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
      .then(async () => {
        console.log('[YAAI] WebSocket initialized');
        // Pre-cache API keys for reveal functionality
        try {
          const keys = await sendMessage<Array<{ provider: string; apiKey: string }>>('credentials:get-all-keys');
          const cache: Record<string, string> = {};
          for (const { provider, apiKey } of keys) {
            cache[provider] = apiKey;
          }
          sessionStorage.setItem('yaai:api-key-cache', JSON.stringify(cache));
        } catch {
          // Ignore caching errors
        }
      })
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
