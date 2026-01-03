// =============================================================================
// WORKBENCH PAGE
// =============================================================================
// Main page for the Prompt Workbench feature.
// Shows library view or editor view based on state.

import React, { useEffect } from 'react';
import { useWorkbench } from '../../hooks';
import { useLocation } from 'wouter';
import { PromptLibrary } from './library/PromptLibrary';
import { WorkbenchEditor } from './editor/WorkbenchEditor';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface WorkbenchPageProps {
  sessionId?: string;
}

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function WorkbenchPage({ sessionId }: WorkbenchPageProps) {
  const [, navigate] = useLocation();
  const workbench = useWorkbench();

  // Load prompts on mount
  useEffect(() => {
    workbench.loadPrompts();
  }, []);

  // Open session when sessionId changes
  useEffect(() => {
    if (sessionId && (!workbench.session || workbench.session.id !== sessionId)) {
      workbench.openSession(sessionId);
    }
  }, [sessionId]);

  // Handle create new prompt
  const handleCreate = async (type: 'text' | 'image' | 'tool') => {
    const session = await workbench.createPrompt(type);
    navigate(`/prompts/${session.id}`);
  };

  // Handle open prompt
  const handleOpen = (id: string) => {
    navigate(`/prompts/${id}`);
  };

  // Handle close editor (go back to library)
  const handleClose = () => {
    workbench.closeSession();
    navigate('/prompts');
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    await workbench.deletePrompt(id);
    if (workbench.session?.id === id) {
      navigate('/prompts');
    }
  };

  // Handle duplicate
  const handleDuplicate = async (id: string) => {
    const session = await workbench.duplicatePrompt(id);
    if (session) {
      navigate(`/prompts/${session.id}`);
    }
  };

  // Show editor if we have a session open
  if (sessionId && workbench.session) {
    return (
      <WorkbenchEditor
        workbench={workbench}
        onClose={handleClose}
        onNavigate={navigate}
      />
    );
  }

  // Show library
  return (
    <PromptLibrary
      prompts={workbench.prompts}
      loading={workbench.loading}
      error={workbench.error}
      onCreate={handleCreate}
      onOpen={handleOpen}
      onDelete={handleDelete}
      onDuplicate={handleDuplicate}
    />
  );
}
