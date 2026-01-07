// =============================================================================
// CHAT INPUT ADAPTER
// =============================================================================
// Chat-specific input adapter for GlobalInputHub.
// Wraps the existing InputHub functionality.

import React, { useState, useCallback, useEffect } from 'react';
import { InputHub } from '../../components/input-hub';
import { useDraft, useMemory } from '../../hooks';
import type { ModelInfo, ToolConfig, FileObject, FileUpload, Memory } from '../../types';
import type { MemoryResult } from '../../types/memory';
import type { ViewInput } from '../types';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface ChatInputAdapterProps {
  chatId: string | null;
  onSend: (input: ViewInput) => void;
  isLoading?: boolean;
  lastAssistantMessageId?: string;
}

// -----------------------------------------------------------------------------
// MOCK DATA
// -----------------------------------------------------------------------------

const mockModels: ModelInfo[] = [
  { id: 'claude-3', name: 'Claude 3 Opus', provider: 'anthropic', contextWindow: 200000 },
  { id: 'gpt-4', name: 'GPT-4 Turbo', provider: 'openai', contextWindow: 128000 },
  { id: 'gemini', name: 'Gemini Pro', provider: 'google', contextWindow: 32000 },
];

const mockTools: ToolConfig[] = [
  { id: 'web', name: 'Web Search', icon: 'globe', enabled: true },
  { id: 'code', name: 'Code Exec', icon: 'terminal', enabled: false },
];

// Helper to convert MemoryResult to Memory
const memoryResultToMemory = (result: MemoryResult): Memory => ({
  id: result.id,
  content: result.content,
  source: result.source || 'memory',
  relevance: result.score,
  timestamp: result.timestamp,
});

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function ChatInputAdapter({
  chatId,
  onSend,
  isLoading,
  lastAssistantMessageId,
}: ChatInputAdapterProps) {
  const isEphemeral = chatId?.startsWith('new-') ?? false;

  const {
    draft,
    updateContent: updateDraftContent,
    clearDraft,
  } = useDraft(isEphemeral ? null : chatId, 'chat');

  const [selectedModels, setSelectedModels] = useState<ModelInfo[]>([mockModels[0]]);
  const [attachments, setAttachments] = useState<FileObject[]>([]);
  const [uploads, setUploads] = useState<FileUpload[]>([]);
  const [tools, setTools] = useState<ToolConfig[]>(mockTools);
  const [inputContent, setInputContent] = useState('');
  const [attachedMemories, setAttachedMemories] = useState<Memory[]>([]);

  // Restore draft content
  useEffect(() => {
    if (draft?.content) {
      setInputContent(draft.content);
    }
  }, [draft?.content]);

  const handleContentChange = useCallback((content: string) => {
    setInputContent(content);
    if (chatId && !isEphemeral) {
      updateDraftContent(content);
    }
  }, [chatId, isEphemeral, updateDraftContent]);

  const handleSend = useCallback(async (input: {
    content: string;
    models: string[];
    tools: string[];
    memoryIds: string[];
  }) => {
    // Send as ViewInput
    onSend({
      type: 'chat',
      content: input.content,
      models: input.models,
      tools: input.tools,
      memoryIds: input.memoryIds,
    });

    // Clear draft and input
    setInputContent('');
    await clearDraft();
  }, [onSend, clearDraft]);

  const handleToolToggle = useCallback((toolId: string, enabled: boolean) => {
    setTools(prev => prev.map(t => t.id === toolId ? { ...t, enabled } : t));
  }, []);

  const handleAddMemory = useCallback((memoryResult: MemoryResult) => {
    const memory = memoryResultToMemory(memoryResult);
    setAttachedMemories(prev => {
      if (prev.some(m => m.id === memory.id)) return prev;
      return [...prev, memory];
    });
  }, []);

  const handleRemoveMemory = useCallback((memoryId: string) => {
    setAttachedMemories(prev => prev.filter(m => m.id !== memoryId));
  }, []);

  return (
    <InputHub
      chatId={chatId}
      onSend={handleSend}
      models={mockModels}
      selectedModels={selectedModels}
      onModelsChange={setSelectedModels}
      attachments={attachments}
      uploads={uploads}
      onAttach={(files) => console.log('Attach:', files)}
      onRemoveAttachment={(id) => setAttachments(prev => prev.filter(f => f.id !== id))}
      onCancelUpload={(index) => setUploads(prev => prev.filter((_, i) => i !== index))}
      memories={attachedMemories}
      onAddMemory={handleAddMemory}
      onRemoveMemory={handleRemoveMemory}
      tools={tools}
      onToolToggle={handleToolToggle}
      tokenEstimate={42}
      tokenTotal={1847}
      tokenLimit={200000}
      isLoading={isLoading}
      moodEnabled={false}
      initialContent={inputContent}
      onContentChange={handleContentChange}
      lastAssistantMessageId={lastAssistantMessageId}
    />
  );
}
