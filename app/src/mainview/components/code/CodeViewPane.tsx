// =============================================================================
// CODE VIEW PANE
// =============================================================================
// Pane-ready code session view for the workspace system.
// Displays transcript and file viewer - input comes from GlobalInputHub.

import React, { useState, useCallback, useEffect } from 'react';
import { cn } from '../../lib';
import { useCodeSession } from '../../hooks/useCodeSession';
import { useCodeSettings } from '../../hooks/useCodeSettings';
import { CodeHeader } from './CodeHeader';
import { CodeTranscript } from './CodeTranscript';
import { RestoreTimeline } from './restore';
import { SidebarTabs, ProjectFiles } from './sidebar';
import { FileViewer } from './viewer';
import { FolderOpen, AlertCircle } from 'lucide-react';
import type { CodeSnippet, FileNode } from '../../types/snippet';
import type { ViewInput } from '../../workspace/types';
import { FONT_SIZE_VALUES, LINE_HEIGHT_VALUES } from '../../types/code-settings';

// Demo file tree
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
        ],
      },
      { name: 'App.tsx', path: 'src/App.tsx', type: 'file' },
    ],
  },
  { name: 'package.json', path: 'package.json', type: 'file' },
];

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface CodeViewPaneProps {
  sessionId?: string | null;
  defaultProjectPath?: string;
  showHistory?: boolean;
  className?: string;
  /** Register callback to receive input from GlobalInputHub */
  onRegisterInputHandler?: (handler: (input: ViewInput) => void) => () => void;
  /** Expose current prompt state for input adapter */
  onPromptStateChange?: (state: {
    type: 'text' | 'yesno' | 'selection' | 'awaiting';
    prompt?: string;
    options?: string[];
  }) => void;
  /** Expose snippets for input adapter */
  onSnippetsChange?: (snippets: CodeSnippet[]) => void;
}

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function CodeViewPane({
  sessionId: initialSessionId = null,
  defaultProjectPath = '',
  showHistory = true,
  className,
  onRegisterInputHandler,
  onPromptStateChange,
  onSnippetsChange,
}: CodeViewPaneProps) {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(initialSessionId);
  const [projectPath, setProjectPath] = useState(defaultProjectPath);

  const [sidebarTab, setSidebarTab] = useState<'history' | 'files'>('files');
  const [selectedFile, setSelectedFile] = useState<{
    path: string;
    content: string;
    language: string;
  } | null>(null);
  const [snippets, setSnippets] = useState<CodeSnippet[]>([]);

  const { settings, updateSetting, toggleSetting, resetSettings } = useCodeSettings();

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

  // Notify parent of prompt state changes
  useEffect(() => {
    if (currentPrompt && onPromptStateChange) {
      if (currentPrompt.type === 'yesno') {
        onPromptStateChange({ type: 'yesno', prompt: currentPrompt.message });
      } else if (currentPrompt.type === 'selection') {
        onPromptStateChange({
          type: 'selection',
          prompt: currentPrompt.message,
          options: currentPrompt.options,
        });
      } else if (currentPrompt.type === 'text') {
        onPromptStateChange({ type: 'text', prompt: currentPrompt.message });
      }
    } else if (!currentPrompt && onPromptStateChange) {
      onPromptStateChange({ type: 'awaiting' });
    }
  }, [currentPrompt, onPromptStateChange]);

  // Notify parent of snippets changes
  useEffect(() => {
    onSnippetsChange?.(snippets);
  }, [snippets, onSnippetsChange]);

  // Handle input from GlobalInputHub
  const handleInput = useCallback((input: ViewInput) => {
    if (input.type !== 'code') return;

    // Build message with snippets context
    let fullMessage = input.content;

    if (snippets.length > 0) {
      const snippetContext = snippets.map(s => {
        const lineRange = s.startLine === s.endLine
          ? `L${s.startLine}`
          : `L${s.startLine}-${s.endLine}`;
        return `\`\`\`${s.language}\n// ${s.fileName}:${lineRange}\n${s.content}\n\`\`\``;
      }).join('\n\n');

      fullMessage = `${snippetContext}\n\n${input.content}`;
    }

    sendInput(fullMessage);
    setSnippets([]);
  }, [snippets, sendInput]);

  // Register input handler
  useEffect(() => {
    if (onRegisterInputHandler) {
      return onRegisterInputHandler(handleInput);
    }
  }, [onRegisterInputHandler, handleInput]);

  // Session handlers
  const handleStart = async () => {
    try {
      const newSession = await startSession(projectPath);
      setActiveSessionId(newSession.id);
    } catch (err) {
      console.error('Failed to start session:', err);
    }
  };

  const handleCreateCheckpoint = async () => {
    const description = `Manual checkpoint - ${new Date().toLocaleTimeString()}`;
    try {
      await createRestorePoint(description);
    } catch (err) {
      console.error('Failed to create checkpoint:', err);
    }
  };

  const handleFileSelect = useCallback((node: FileNode) => {
    if (node.type === 'file') {
      setSelectedFile({
        path: node.path,
        content: '',
        language: '',
      });
    }
  }, []);

  const handleAddSnippet = useCallback((snippet: CodeSnippet) => {
    setSnippets(prev => {
      const exists = prev.some(
        s => s.filePath === snippet.filePath &&
             s.startLine === snippet.startLine &&
             s.endLine === snippet.endLine
      );
      if (exists) return prev;
      return [...prev, snippet];
    });
  }, []);

  const handleRemoveSnippet = useCallback((snippetId: string) => {
    setSnippets(prev => prev.filter(s => s.id !== snippetId));
  }, []);

  const handleCloseViewer = useCallback(() => {
    setSelectedFile(null);
  }, []);

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
          <button onClick={clearError} className="text-xs hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar */}
        {showHistory && session && (
          <div className="w-64 border-r border-[var(--color-border)] flex-shrink-0 flex flex-col">
            <SidebarTabs activeTab={sidebarTab} onTabChange={setSidebarTab} />
            <div className="flex-1 overflow-hidden">
              {sidebarTab === 'history' ? (
                <RestoreTimeline
                  restorePoints={restorePoints}
                  onRestore={restoreToPoint}
                  onCreateManual={handleCreateCheckpoint}
                  loading={loading}
                />
              ) : (
                <ProjectFiles
                  files={DEMO_FILE_TREE}
                  onFileSelect={handleFileSelect}
                  selectedPath={selectedFile?.path}
                />
              )}
            </div>
          </div>
        )}

        {/* Center content */}
        <div className="flex-1 flex flex-col min-w-0">
          {session ? (
            selectedFile ? (
              <FileViewer
                filePath={selectedFile.path}
                content={selectedFile.content}
                language={selectedFile.language}
                onClose={handleCloseViewer}
                onAddSnippet={handleAddSnippet}
              />
            ) : (
              <CodeTranscript
                entries={transcript}
                isStreaming={isStreaming}
                onRestorePointClick={(rpId) => {
                  console.log('Restore point clicked:', rpId);
                }}
              />
            )
          ) : (
            <NoSessionView
              projectPath={projectPath}
              onProjectPathChange={setProjectPath}
              onStart={handleStart}
              loading={loading}
            />
          )}
        </div>

        {/* Right: Snippets panel */}
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
              Back to Transcript
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
}: {
  projectPath: string;
  onProjectPathChange: (path: string) => void;
  onStart: () => void;
  loading: boolean;
}) {
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
          Start a Claude Code Session
        </h2>
        <p className="text-sm text-[var(--color-text-secondary)] mb-6">
          Select a project directory and start coding with Claude
        </p>
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
      </div>
    </div>
  );
}
