// =============================================================================
// WORKBENCH EDITOR
// =============================================================================
// Main editor view for prompt sessions - split pane with input and output.

import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Save,
  Play,
  Square,
  Code,
  Settings2,
  ChevronDown,
} from 'lucide-react';
import type { UseWorkbenchReturn } from '../../../hooks';
import { MessageList } from './text/MessageList';
import { VariablePanel } from './shared/VariablePanel';
import { OutputPanel } from '../output/OutputPanel';
import { GetCodeModal } from '../output/GetCodeModal';
import { Select } from '../../atoms/Select';
import type { CodeExportFormat } from '../../../types/workbench';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface WorkbenchEditorProps {
  workbench: UseWorkbenchReturn;
  onClose: () => void;
  onNavigate: (path: string) => void;
}

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function WorkbenchEditor({
  workbench,
  onClose,
  onNavigate,
}: WorkbenchEditorProps) {
  const { session, isDirty, isGenerating, streamContent } = workbench;
  const [showGetCode, setShowGetCode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + Enter to run
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!isGenerating && session?.type === 'text') {
          workbench.runGeneration();
        }
      }
      // Cmd/Ctrl + S to save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (isDirty) {
          workbench.saveSession();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isGenerating, isDirty, session?.type, workbench]);

  if (!session) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--color-border)] border-t-[var(--color-accent)] rounded-full animate-spin" />
      </div>
    );
  }

  const handleRun = () => {
    if (session.type === 'text' && !isGenerating) {
      workbench.runGeneration();
    }
  };

  const handleStop = () => {
    workbench.cancelGeneration();
  };

  return (
    <div className="h-full flex flex-col bg-[var(--color-bg)]">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-bg)]">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors"
          >
            <ArrowLeft size={18} className="text-[var(--color-text-secondary)]" />
          </button>

          <input
            type="text"
            value={session.name}
            onChange={(e) => workbench.updateName(e.target.value)}
            className="text-lg font-medium bg-transparent border-none outline-none text-[var(--color-text)] focus:ring-0"
            placeholder="Untitled"
          />

          {isDirty && (
            <span className="text-xs text-[var(--color-text-secondary)]">
              (unsaved)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Model config - only for text prompts */}
          {session.type === 'text' && session.modelConfig && (
            <div className="relative">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] transition-colors"
              >
                <span className="font-mono text-xs">
                  {session.modelConfig.modelId.split('-').slice(0, 2).join('-')}
                </span>
                <ChevronDown size={14} />
              </button>

              {showSettings && (
                <ModelConfigPopover
                  config={session.modelConfig}
                  onChange={workbench.setModelConfig}
                  onClose={() => setShowSettings(false)}
                />
              )}
            </div>
          )}

          {/* Get Code button */}
          <button
            onClick={() => setShowGetCode(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-[var(--color-text)] hover:bg-[var(--color-bg-secondary)] border border-[var(--color-border)] transition-colors"
          >
            <Code size={14} />
            <span>Get Code</span>
          </button>

          {/* Save button */}
          <button
            onClick={() => workbench.saveSession()}
            disabled={!isDirty}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-[var(--color-text)] hover:bg-[var(--color-bg-secondary)] border border-[var(--color-border)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={14} />
            <span>Save</span>
          </button>

          {/* Run button */}
          {session.type === 'text' && (
            isGenerating ? (
              <button
                onClick={handleStop}
                className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm text-white bg-red-500 hover:bg-red-600 transition-colors"
              >
                <Square size={14} />
                <span>Stop</span>
              </button>
            ) : (
              <button
                onClick={handleRun}
                className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm text-white bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] transition-colors"
              >
                <Play size={14} />
                <span>Run</span>
                <kbd className="ml-1 px-1.5 py-0.5 text-[10px] bg-white/20 rounded">
                  {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}↵
                </kbd>
              </button>
            )
          )}
        </div>
      </div>

      {/* Main content - split view */}
      <div className="flex-1 flex min-h-0">
        {/* Left: Editor */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-[var(--color-border)]">
          {session.type === 'text' && session.messages && (
            <MessageList
              messages={session.messages}
              onAddMessage={workbench.addMessage}
              onUpdateMessage={workbench.updateMessage}
              onRemoveMessage={workbench.removeMessage}
              onSetPrefill={workbench.setMessagePrefill}
            />
          )}

          {session.type === 'image' && (
            <div className="flex-1 flex items-center justify-center text-[var(--color-text-secondary)]">
              Image prompt editor coming soon...
            </div>
          )}

          {session.type === 'tool' && (
            <div className="flex-1 flex items-center justify-center text-[var(--color-text-secondary)]">
              Tool config editor coming soon...
            </div>
          )}
        </div>

        {/* Right: Output + Variables */}
        <div className="w-[480px] flex flex-col min-h-0 bg-[var(--color-bg-secondary)]">
          {/* Output panel */}
          <div className="flex-1 min-h-0">
            <OutputPanel
              content={streamContent}
              isGenerating={isGenerating}
            />
          </div>

          {/* Variables panel - only for text prompts */}
          {session.type === 'text' && workbench.detectedVariables.length > 0 && (
            <div className="flex-shrink-0 border-t border-[var(--color-border)]">
              <VariablePanel
                variables={workbench.detectedVariables}
                values={workbench.getVariableValues()}
                onChange={workbench.setVariableValue}
              />
            </div>
          )}
        </div>
      </div>

      {/* Get Code Modal */}
      {showGetCode && (
        <GetCodeModal
          onClose={() => setShowGetCode(false)}
          onGetCode={workbench.getCode}
        />
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// MODEL CONFIG POPOVER
// -----------------------------------------------------------------------------

interface ModelConfigPopoverProps {
  config: {
    modelId: string;
    temperature: number;
    maxTokens: number;
    topP?: number;
  };
  onChange: (config: Partial<typeof config>) => void;
  onClose: () => void;
}

function ModelConfigPopover({ config, onChange, onClose }: ModelConfigPopoverProps) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-0 top-full mt-2 w-72 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg shadow-lg z-50 p-4">
        <h4 className="text-sm font-medium text-[var(--color-text)] mb-4">Model Settings</h4>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-[var(--color-text-secondary)] mb-1">
              Model
            </label>
            <Select
              value={config.modelId}
              onChange={(val) => onChange({ modelId: val })}
              options={[
                { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
                { value: "claude-opus-4-20250514", label: "Claude Opus 4" },
                { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet" },
                { value: "claude-3-opus-20240229", label: "Claude 3 Opus" },
                { value: "claude-3-haiku-20240307", label: "Claude 3 Haiku" },
              ]}
              triggerClassName="w-full"
            />
          </div>

          <div>
            <label className="flex items-center justify-between text-xs text-[var(--color-text-secondary)] mb-1">
              <span>Temperature</span>
              <span className="font-mono">{config.temperature}</span>
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={config.temperature}
              onChange={(e) => onChange({ temperature: parseFloat(e.target.value) })}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-xs text-[var(--color-text-secondary)] mb-1">
              Max Tokens
            </label>
            <input
              type="number"
              value={config.maxTokens}
              onChange={(e) => onChange({ maxTokens: parseInt(e.target.value) || 4096 })}
              className="w-full px-3 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text)]"
            />
          </div>
        </div>
      </div>
    </>
  );
}
