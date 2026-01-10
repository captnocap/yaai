import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { cn } from '../../lib';
import { useCodeSession } from '../../hooks/useCodeSession';
import { useCodeSettings } from '../../hooks/useCodeSettings';
import { useClaudeCodeData, type ClaudeTranscriptEntry } from '../../hooks/useClaudeCodeData';
import { CodeHeader } from './CodeHeader';
import { CodeTranscript } from './CodeTranscript';
import { CodeInput } from './CodeInput';
import { RestoreTimeline } from './restore';
import { SidebarTabs, ProjectFiles } from './sidebar';
import { FileViewer } from './viewer';
import { SessionSwitcher } from './SessionSwitcher';
import { FolderOpen, AlertCircle } from 'lucide-react';
import type { CodeSnippet, FileNode } from '../../types/snippet';
import type { TranscriptEntry } from '../../types/code-session';
import { FONT_SIZE_VALUES, LINE_HEIGHT_VALUES } from '../../types/code-settings';
import { useWorkspaceInputContext, type ViewInput } from '../../workspace';

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

/**
 * Transform ClaudeTranscriptEntry[] to TranscriptEntry[] for CodeTranscript
 */
function transformClaudeTranscript(entries: ClaudeTranscriptEntry[]): TranscriptEntry[] {
  return entries.map((entry) => {
    // Extract text content from message.content array
    let content = '';
    if (entry.message?.content) {
      if (Array.isArray(entry.message.content)) {
        content = entry.message.content
          .map((block: any) => {
            if (typeof block === 'string') return block;
            if (block.type === 'text') return block.text || '';
            if (block.type === 'tool_use') return `[Tool: ${block.name}]`;
            if (block.type === 'tool_result') return block.content || '';
            return '';
          })
          .filter(Boolean)
          .join('\n');
      } else if (typeof entry.message.content === 'string') {
        content = entry.message.content;
      }
    }

    // Map type
    const type = entry.type === 'user' ? 'user_input' : 'assistant_output';

    return {
      id: entry.uuid,
      sessionId: entry.sessionId,
      type,
      content,
      timestamp: entry.timestamp,
    } as TranscriptEntry;
  });
}

export interface CodeTabProps {
  sessionId?: string | null;
  projectPath?: string;           // For project-based access (from sidebar click)
  defaultProjectPath?: string;
  showHistory?: boolean;
  className?: string;
}

// Demo file tree for testing
const DEMO_FILE_TREE: FileNode[] = [
  {
    name: 'src',
    path: 'src',
    type: 'directory',
    children: [
      {
        name: 'components',
        path: 'src/components',
        type: 'directory',
        children: [
          { name: 'Button.tsx', path: 'src/components/Button.tsx', type: 'file' },
          { name: 'Input.tsx', path: 'src/components/Input.tsx', type: 'file' },
          { name: 'Modal.tsx', path: 'src/components/Modal.tsx', type: 'file' },
        ],
      },
      {
        name: 'hooks',
        path: 'src/hooks',
        type: 'directory',
        children: [
          { name: 'useAuth.ts', path: 'src/hooks/useAuth.ts', type: 'file' },
          { name: 'useApi.ts', path: 'src/hooks/useApi.ts', type: 'file' },
        ],
      },
      { name: 'App.tsx', path: 'src/App.tsx', type: 'file' },
      { name: 'index.tsx', path: 'src/index.tsx', type: 'file' },
    ],
  },
  {
    name: 'package.json',
    path: 'package.json',
    type: 'file',
  },
  {
    name: 'tsconfig.json',
    path: 'tsconfig.json',
    type: 'file',
  },
];

export function CodeTab({
  sessionId: initialSessionId = null,
  projectPath: externalProjectPath,
  defaultProjectPath = '',
  showHistory = true,
  className,
}: CodeTabProps) {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(initialSessionId);
  const [projectPath, setProjectPath] = useState(externalProjectPath || defaultProjectPath);

  // Update projectPath when externalProjectPath changes
  useEffect(() => {
    if (externalProjectPath) {
      setProjectPath(externalProjectPath);
    }
  }, [externalProjectPath]);

  // Load sessions for the project using useClaudeCodeData
  const {
    sessions,
    transcript: projectTranscript,
    selectedSessionId,
    loading: projectLoading,
    loadingTranscript,
    selectSession,
    refresh: refreshSessions,
  } = useClaudeCodeData({
    projectPath: projectPath || undefined,
    autoLoad: !!projectPath,
  });

  // Auto-select first session when project loads and no session is active
  useEffect(() => {
    if (projectPath && sessions.length > 0 && !activeSessionId && !selectedSessionId) {
      selectSession(sessions[0].id);
    }
  }, [projectPath, sessions, activeSessionId, selectedSessionId, selectSession]);

  // Determine which transcript to show - from live session or from project data
  const isLiveSession = !!activeSessionId;
  const hasProjectSessions = sessions.length > 0;

  // Transform project transcript to CodeTranscript format
  const transformedProjectTranscript = useMemo(() => {
    return transformClaudeTranscript(projectTranscript);
  }, [projectTranscript]);

  // Sidebar state
  const [sidebarTab, setSidebarTab] = useState<'history' | 'files'>('files');

  // File viewer state
  const [selectedFile, setSelectedFile] = useState<{
    path: string;
    content: string;
    language: string;
  } | null>(null);

  // Snippets state
  const [snippets, setSnippets] = useState<CodeSnippet[]>([]);

  // Settings
  const {
    settings,
    updateSetting,
    toggleSetting,
    resetSettings,
  } = useCodeSettings();

  const {
    session,
    transcript,
    currentPrompt,
    restorePoints,
    loading,
    error,
    isStreaming,
    startSession,
    stopSession,
    pauseSession,
    resumeSession,
    sendInput,
    sendYesNo,
    sendSelection,
    createRestorePoint,
    restoreToPoint,
    clearError,
  } = useCodeSession(activeSessionId);

  const { registerViewHandler } = useWorkspaceInputContext();

  // Handle start session
  const handleStart = async () => {
    try {
      const newSession = await startSession(projectPath);
      setActiveSessionId(newSession.id);
    } catch (err) {
      console.error('Failed to start session:', err);
    }
  };

  // Handle create manual checkpoint
  const handleCreateCheckpoint = async () => {
    const description = `Manual checkpoint - ${new Date().toLocaleTimeString()}`;
    try {
      await createRestorePoint(description);
    } catch (err) {
      console.error('Failed to create checkpoint:', err);
    }
  };

  // Handle file selection from tree
  const handleFileSelect = useCallback((node: FileNode) => {
    if (node.type === 'file') {
      // In a real implementation, this would fetch the file content via WebSocket
      // For now, we'll use demo content
      setSelectedFile({
        path: node.path,
        content: '', // FileViewer has demo content fallback
        language: '',
      });
    }
  }, []);

  // Handle adding snippet from file viewer
  const handleAddSnippet = useCallback((snippet: CodeSnippet) => {
    setSnippets(prev => {
      // Avoid duplicates based on same file + line range
      const exists = prev.some(
        s => s.filePath === snippet.filePath &&
          s.startLine === snippet.startLine &&
          s.endLine === snippet.endLine
      );
      if (exists) return prev;
      return [...prev, snippet];
    });
  }, []);

  // Handle removing a snippet
  const handleRemoveSnippet = useCallback((snippetId: string) => {
    setSnippets(prev => prev.filter(s => s.id !== snippetId));
  }, []);

  // Handle clearing all snippets
  const handleClearSnippets = useCallback(() => {
    setSnippets([]);
  }, []);

  // Handle snippet click (navigate back to that file/line)
  const handleSnippetClick = useCallback((snippet: CodeSnippet) => {
    setSelectedFile({
      path: snippet.filePath,
      content: '', // Will use demo content
      language: snippet.language,
    });
    setSidebarTab('files');
  }, []);

  // Close file viewer
  const handleCloseViewer = useCallback(() => {
    setSelectedFile(null);
  }, []);

  // Send input with snippets context
  const handleSendInput = useCallback((input: string) => {
    // Build the full message with snippets
    let fullMessage = input;

    if (snippets.length > 0) {
      const snippetContext = snippets.map(s => {
        const lineRange = s.startLine === s.endLine
          ? `L${s.startLine}`
          : `L${s.startLine}-${s.endLine}`;
        return `\`\`\`${s.language}\n// ${s.fileName}:${lineRange}\n${s.content}\n\`\`\``;
      }).join('\n\n');

      fullMessage = `${snippetContext}\n\n${input}`;
    }

    sendInput(fullMessage);
    setSnippets([]); // Clear snippets after sending
  }, [snippets, sendInput]);

  // Handle global input
  useEffect(() => {
    const handler = (input: ViewInput) => {
      if (input.type === 'code') {
        handleSendInput(input.content);
      }
    };
    return registerViewHandler('main', handler);
  }, [registerViewHandler, handleSendInput]);

  // CSS custom properties for settings
  const settingsStyle = {
    '--code-font-size': FONT_SIZE_VALUES[settings.fontSize],
    '--code-line-height': LINE_HEIGHT_VALUES[settings.lineHeight],
  } as React.CSSProperties;

  return (
    <div className={cn('flex flex-col h-full', className)} style={settingsStyle}>
      {/* Header */}
      <CodeHeader
        session={session}
        settings={settings}
        onStart={handleStart}
        onStop={stopSession}
        onPause={pauseSession}
        onResume={resumeSession}
        onUpdateSetting={updateSetting}
        onToggleSetting={toggleSetting}
        onResetSettings={resetSettings}
      />

      {/* Error banner */}
      {error && (
        <div className={cn(
          'flex items-center gap-2 px-4 py-2',
          'bg-red-500/10 text-red-500',
          'border-b border-red-500/20'
        )}>
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm flex-1">{error}</span>
          <button
            onClick={clearError}
            className="text-xs hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar: Files/History tabs */}
        {showHistory && (session || (hasProjectSessions && selectedSessionId)) && (
          <div className="w-64 border-r border-[var(--color-border)] flex-shrink-0">
            <SidebarTabs
              activeTab={sidebarTab}
              onTabChange={setSidebarTab}
              historyContent={
                <RestoreTimeline
                  restorePoints={restorePoints}
                  onRestore={restoreToPoint}
                  onCreateManual={handleCreateCheckpoint}
                  loading={loading}
                />
              }
              filesContent={
                <ProjectFiles
                  projectPath={projectPath || '/demo/project'}
                  onFileSelect={(filePath) => {
                    setSelectedFile({
                      path: filePath,
                      content: '',
                      language: '',
                    });
                  }}
                  selectedFile={selectedFile?.path}
                />
              }
            />
          </div>
        )}

        {/* Center: Transcript or File Viewer */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Show transcript: either live session or selected project session */}
          {(session || (hasProjectSessions && selectedSessionId)) ? (
            selectedFile ? (
              // File Viewer Mode
              <FileViewer
                filePath={selectedFile.path}
                content={selectedFile.content}
                language={selectedFile.language}
                onClose={handleCloseViewer}
                onAddSnippet={handleAddSnippet}
              />
            ) : (
              // Transcript Mode - use live transcript or project transcript
              <>
                <CodeTranscript
                  entries={isLiveSession ? transcript : transformedProjectTranscript}
                  isStreaming={isLiveSession && isStreaming}
                  onRestorePointClick={(rpId) => {
                    console.log('Restore point clicked:', rpId);
                  }}
                />
                {/* Session Switcher Widget at bottom */}
                {projectPath && hasProjectSessions && (
                  <SessionSwitcher
                    sessions={sessions}
                    selectedSessionId={isLiveSession ? activeSessionId : selectedSessionId}
                    onSelectSession={(sessionId) => {
                      // If switching to a historical session, clear active live session view
                      setActiveSessionId(null);
                      selectSession(sessionId);
                    }}
                    onNewSession={handleStart}
                    loading={projectLoading || loadingTranscript}
                  />
                )}
              </>
            )
          ) : (
            <NoSessionView
              projectPath={projectPath}
              onProjectPathChange={setProjectPath}
              onStart={handleStart}
              loading={loading}
              hasProjectPath={!!externalProjectPath}
              sessionsCount={sessions.length}
            />
          )}
        </div>

        {/* Right: Snippets panel when viewing file */}
        {selectedFile && snippets.length > 0 && (
          <div className="w-64 border-l border-[var(--color-border)] flex-shrink-0 p-4 bg-[var(--color-bg-secondary)]">
            <h3 className="text-sm font-medium text-[var(--color-text)] mb-3">
              Selected Snippets ({snippets.length})
            </h3>
            <div className="space-y-2">
              {snippets.map(snippet => (
                <div
                  key={snippet.id}
                  className={cn(
                    'p-2 rounded-md',
                    'bg-[var(--color-bg)]',
                    'border border-[var(--color-border)]'
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-[var(--color-text)]">
                      {snippet.fileName}
                    </span>
                    <button
                      onClick={() => handleRemoveSnippet(snippet.id)}
                      className="text-xs text-[var(--color-text-tertiary)] hover:text-red-500"
                    >
                      Remove
                    </button>
                  </div>
                  <span className="text-xs text-[var(--color-text-tertiary)]">
                    Lines {snippet.startLine}-{snippet.endLine}
                  </span>
                </div>
              ))}
            </div>
            <button
              onClick={handleCloseViewer}
              className={cn(
                'w-full mt-4 py-2 px-3 rounded-lg',
                'text-sm font-medium',
                'bg-[var(--color-accent)] text-white',
                'hover:opacity-90 transition-opacity'
              )}
            >
              Back to Chat
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// No session placeholder
function NoSessionView({
  projectPath,
  onProjectPathChange,
  onStart,
  loading,
  hasProjectPath = false,
  sessionsCount = 0,
}: {
  projectPath: string;
  onProjectPathChange: (path: string) => void;
  onStart: () => void;
  loading: boolean;
  hasProjectPath?: boolean;
  sessionsCount?: number;
}) {
  // If we have a project path but no sessions, show a different message
  const isEmptyProject = hasProjectPath && sessionsCount === 0;

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center">
        <div className={cn(
          'w-16 h-16 mx-auto mb-6 rounded-2xl',
          'bg-[var(--color-bg-secondary)]',
          'flex items-center justify-center'
        )}>
          <FolderOpen className="w-8 h-8 text-[var(--color-text-secondary)]" />
        </div>

        <h2 className="text-lg font-medium text-[var(--color-text)] mb-2">
          {isEmptyProject ? 'Start Your First Session' : 'Start a Claude Code Session'}
        </h2>
        <p className="text-sm text-[var(--color-text-secondary)] mb-6">
          {isEmptyProject
            ? 'No sessions yet for this project. Start coding with Claude!'
            : 'Select a project directory and start coding with Claude'
          }
        </p>

        {/* Project path input - only show if no external projectPath */}
        {!hasProjectPath && (
          <div className="mb-4">
            <label className="block text-xs text-[var(--color-text-tertiary)] text-left mb-1">
              Project Path
            </label>
            <input
              type="text"
              value={projectPath}
              onChange={(e) => onProjectPathChange(e.target.value)}
              placeholder="/path/to/project"
              className={cn(
                'w-full px-3 py-2 rounded-lg',
                'bg-[var(--color-bg-secondary)]',
                'border border-[var(--color-border)]',
                'text-sm text-[var(--color-text)]',
                'placeholder:text-[var(--color-text-tertiary)]',
                'focus:outline-none focus:border-[var(--color-accent)]'
              )}
            />
          </div>
        )}

        {/* Show project path if it's from external source */}
        {hasProjectPath && (
          <div className="mb-4 text-left">
            <label className="block text-xs text-[var(--color-text-tertiary)] mb-1">
              Project
            </label>
            <div className={cn(
              'px-3 py-2 rounded-lg',
              'bg-[var(--color-bg-secondary)]',
              'border border-[var(--color-border)]',
              'text-sm text-[var(--color-text)] font-mono'
            )}>
              {projectPath}
            </div>
          </div>
        )}

        <button
          onClick={onStart}
          disabled={loading || !projectPath.trim()}
          className={cn(
            'w-full py-2.5 px-4 rounded-lg',
            'text-sm font-medium',
            'bg-[var(--color-accent)] text-white',
            'hover:opacity-90 transition-opacity',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {loading ? 'Starting...' : 'Start Session'}
        </button>

        <p className="text-xs text-[var(--color-text-tertiary)] mt-4">
          Make sure Claude Code CLI is installed and configured
        </p>
      </div>
    </div>
  );
}
