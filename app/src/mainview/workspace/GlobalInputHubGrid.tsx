// =============================================================================
// GLOBAL INPUT HUB GRID
// =============================================================================
// Grid-based input hub using react-grid-layout for Tarkov/Diablo-style
// drag-and-drop, resizable panel system.

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { cn } from '../lib';
import { useWorkspaceInput } from './WorkspaceInputContext';
import { InputHubGrid } from '../components/input-hub/InputHubGrid';
import {
  BrainPanel,
  ActiveSessionsPanel,
  MemoryPanel,
  InputPanel,
  ModelsPanel,
  ToolsPanel,
  VariablesPanel,
  SessionsPanel,
  type ActiveSession,
  type CodeSession,
} from '../components/input-hub/panels';
import type { PanelId } from '../components/input-hub/grid-config';
import type { ViewType, ViewInput } from './types';
import type { BrainActivity } from '../components/input-hub/BrainCanvas/useBrainActivity';
import type { ModelInfo, ToolConfig, FileObject, FileUpload, Memory } from '../types';
import type { MemoryResult } from '../types/memory';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface GlobalInputHubGridProps {
  className?: string;
}

// -----------------------------------------------------------------------------
// MOCK DATA (to be replaced with real data)
// -----------------------------------------------------------------------------

const mockModels: ModelInfo[] = [
  { id: 'claude-3', name: 'Claude 3 Opus', provider: 'anthropic', contextWindow: 200000 },
  { id: 'gpt-4', name: 'GPT-4 Turbo', provider: 'openai', contextWindow: 128000 },
  { id: 'gemini', name: 'Gemini Pro', provider: 'google', contextWindow: 32000 },
];

const mockTools: ToolConfig[] = [
  { id: 'web', name: 'Web Search', description: 'Search the web', icon: 'globe', enabled: true },
  { id: 'code', name: 'Code Exec', description: 'Execute code', icon: 'terminal', enabled: false },
];

// Helper to convert MemoryResult to Memory
const memoryResultToMemory = (result: MemoryResult): Memory => ({
  id: result.id,
  content: result.content,
  summary: result.content.slice(0, 100),
  source: 'auto',
  relevance: result.score,
  timestamp: new Date(),
});

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function GlobalInputHubGrid({ className }: GlobalInputHubGridProps) {
  const { activeViewType, activeResourceId, sendToActiveView } = useWorkspaceInput();
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 300 });

  // Input state
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [keystrokeCount, setKeystrokeCount] = useState(0);
  const [brainActivity, setBrainActivity] = useState<BrainActivity>('idle');

  // Model/tool state
  const [selectedModels, setSelectedModels] = useState<ModelInfo[]>([mockModels[0]]);
  const [tools, setTools] = useState<ToolConfig[]>(mockTools);

  // Attachment state
  const [attachments, setAttachments] = useState<FileObject[]>([]);
  const [uploads, setUploads] = useState<FileUpload[]>([]);

  // Memory state
  const [attachedMemories, setAttachedMemories] = useState<Memory[]>([]);

  // Variable state
  const [resolvedVariables, setResolvedVariables] = useState<Record<string, string>>({});

  // Active sessions (mock for now)
  const [activeSessions] = useState<ActiveSession[]>([
    // Will be populated from workspace context
  ]);

  // Code sessions (mock for now)
  const [codeSessions] = useState<CodeSession[]>([
    // Will be populated from code session store
  ]);

  // Measure container with ResizeObserver for accurate sizing
  useEffect(() => {
    if (!containerRef.current) return;

    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height });
      }
    };

    // Initial measurement after a frame to ensure layout is complete
    requestAnimationFrame(updateDimensions);

    // Use ResizeObserver for continuous monitoring
    const observer = new ResizeObserver(() => {
      updateDimensions();
    });
    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, []);

  // Update brain activity based on input state
  useEffect(() => {
    if (inputValue.length > 0 && !isLoading) {
      setBrainActivity('typing');
    } else if (isLoading) {
      setBrainActivity('memory_retrieve');
    } else {
      setBrainActivity('idle');
    }
  }, [inputValue, isLoading]);

  // Handle input change
  const handleInputChange = useCallback((value: string) => {
    setInputValue(value);
    if (value.length > inputValue.length) {
      setKeystrokeCount((c) => c + 1);
    }
  }, [inputValue.length]);

  // Handle send
  const handleSend = useCallback(() => {
    if (!inputValue.trim() || selectedModels.length === 0) return;

    sendToActiveView({
      type: 'chat',
      content: inputValue.trim(),
      models: selectedModels.map((m) => m.id),
      tools: tools.filter((t) => t.enabled).map((t) => t.id),
      memoryIds: attachedMemories.map((m) => m.id),
    } as ViewInput);

    setInputValue('');
    setAttachedMemories([]);
  }, [inputValue, selectedModels, tools, attachedMemories, sendToActiveView]);

  const canSend = inputValue.trim().length > 0 && selectedModels.length > 0 && !isLoading;

  // Handle model toggle
  const handleToggleModel = useCallback((model: ModelInfo) => {
    setSelectedModels((prev) => {
      const exists = prev.some((m) => m.id === model.id);
      if (exists) {
        return prev.filter((m) => m.id !== model.id);
      }
      return [...prev, model];
    });
  }, []);

  // Handle tool toggle
  const handleToolToggle = useCallback((toolId: string, enabled: boolean) => {
    setTools((prev) =>
      prev.map((t) => (t.id === toolId ? { ...t, enabled } : t))
    );
  }, []);

  // Handle memory selection
  const handleMemorySelect = useCallback((result: MemoryResult) => {
    const memory = memoryResultToMemory(result);
    setAttachedMemories((prev) => {
      if (prev.some((m) => m.id === memory.id)) return prev;
      return [...prev, memory];
    });
    setBrainActivity('memory_retrieve');
    setTimeout(() => setBrainActivity('idle'), 500);
  }, []);

  // Handle attachment
  const handleAttach = useCallback((files: File[]) => {
    console.log('Attaching files:', files);
    // TODO: Upload files
  }, []);

  // Render panel by ID
  const renderPanel = useCallback(
    (panelId: PanelId): React.ReactNode => {
      switch (panelId) {
        case 'brain':
          return (
            <BrainPanel
              activity={brainActivity}
              keystrokeCount={keystrokeCount}
            />
          );

        case 'active-sessions':
          return (
            <ActiveSessionsPanel
              sessions={activeSessions}
              currentSessionId={activeResourceId}
            />
          );

        case 'memory':
          return (
            <MemoryPanel
              chatId={activeResourceId}
              query={inputValue}
              attachedMemoryIds={attachedMemories.map((m) => m.id)}
              onSelect={handleMemorySelect}
            />
          );

        case 'sessions':
          return (
            <SessionsPanel
              sessions={codeSessions}
              currentSessionId={activeResourceId}
            />
          );

        case 'models':
          return (
            <ModelsPanel
              models={mockModels}
              selectedModels={selectedModels}
              onToggleModel={handleToggleModel}
            />
          );

        case 'variables':
          return (
            <VariablesPanel
              inputText={inputValue}
              onVariablesResolved={setResolvedVariables}
            />
          );

        case 'tools':
          return (
            <ToolsPanel
              tools={tools}
              onToggle={handleToolToggle}
            />
          );

        case 'input':
          return (
            <InputPanel
              value={inputValue}
              onChange={handleInputChange}
              onSend={handleSend}
              canSend={canSend}
              isLoading={isLoading}
              attachments={attachments}
              uploads={uploads}
              onAttach={handleAttach}
              onRemoveAttachment={(id) =>
                setAttachments((prev) => prev.filter((f) => f.id !== id))
              }
              onCancelUpload={(index) =>
                setUploads((prev) => prev.filter((_, i) => i !== index))
              }
              selectedModels={selectedModels}
              onRemoveModel={(id) =>
                setSelectedModels((prev) => prev.filter((m) => m.id !== id))
              }
              memories={attachedMemories}
              onRemoveMemory={(id) =>
                setAttachedMemories((prev) => prev.filter((m) => m.id !== id))
              }
            />
          );

        default:
          return (
            <div className="h-full flex items-center justify-center text-[var(--color-text-tertiary)] text-xs">
              Unknown panel: {panelId}
            </div>
          );
      }
    },
    [
      brainActivity,
      keystrokeCount,
      activeSessions,
      activeResourceId,
      inputValue,
      attachedMemories,
      handleMemorySelect,
      codeSessions,
      selectedModels,
      handleToggleModel,
      tools,
      handleToolToggle,
      handleInputChange,
      handleSend,
      canSend,
      isLoading,
      attachments,
      uploads,
      handleAttach,
    ]
  );

  // Get current mode
  const mode: ViewType = activeViewType || 'chat';

  // Fixed height for the input hub area
  const CONTAINER_HEIGHT = 300;

  return (
    <div
      ref={containerRef}
      className={cn(
        'global-input-hub-grid',
        'bg-[var(--color-bg-elevated)]',
        'border-t border-[var(--color-border)]',
        'overflow-hidden',
        'w-full', // Ensure full width
        className
      )}
      style={{ height: CONTAINER_HEIGHT }}
    >
      <InputHubGrid
        mode={mode}
        width={dimensions.width || 800} // Fallback width
        height={CONTAINER_HEIGHT}
        renderPanel={renderPanel}
      />
    </div>
  );
}
