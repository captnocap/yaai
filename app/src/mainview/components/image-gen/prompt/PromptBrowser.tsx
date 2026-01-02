// =============================================================================
// PROMPT BROWSER
// =============================================================================
// Displays and manages saved prompt library files.

import React, { useState, useCallback } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  Pencil,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Save,
} from 'lucide-react';
import { IconButton } from '../../atoms/IconButton';
import type { PromptFile } from '../../../types/image-gen';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface PromptBrowserProps {
  prompts: PromptFile[];
  loading: boolean;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  onLoadPrompt: (name: string) => Promise<string>;
  onSavePrompt: (name: string, content: string) => Promise<void>;
  onDeletePrompt: (name: string) => Promise<void>;
  onRenamePrompt: (oldName: string, newName: string) => Promise<void>;
  onRefresh: () => Promise<void>;
}

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function PromptBrowser({
  prompts,
  loading,
  collapsed,
  onCollapsedChange,
  onLoadPrompt,
  onSavePrompt,
  onDeletePrompt,
  onRenamePrompt,
  onRefresh,
}: PromptBrowserProps) {
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

  const handleSelectPrompt = useCallback(async (name: string) => {
    if (selectedPrompt === name) {
      setSelectedPrompt(null);
      setEditingContent(null);
    } else {
      setSelectedPrompt(name);
      const content = await onLoadPrompt(name);
      setEditingContent(content);
    }
  }, [selectedPrompt, onLoadPrompt]);

  const handleCreatePrompt = useCallback(() => {
    setIsCreating(true);
    setNewName('');
  }, []);

  const handleSaveNew = useCallback(async () => {
    if (!newName.trim()) return;
    setSaving(true);
    await onSavePrompt(newName.trim(), '');
    setIsCreating(false);
    setNewName('');
    setSaving(false);
    setSelectedPrompt(newName.trim());
    setEditingContent('');
  }, [newName, onSavePrompt]);

  const handleSaveChanges = useCallback(async () => {
    if (!selectedPrompt || editingContent === null) return;
    setSaving(true);
    await onSavePrompt(selectedPrompt, editingContent);
    setSaving(false);
  }, [selectedPrompt, editingContent, onSavePrompt]);

  const handleDelete = useCallback(async (name: string) => {
    if (confirm(`Delete prompt "${name}"?`)) {
      await onDeletePrompt(name);
      if (selectedPrompt === name) {
        setSelectedPrompt(null);
        setEditingContent(null);
      }
    }
  }, [selectedPrompt, onDeletePrompt]);

  const handleRename = useCallback(async (name: string) => {
    const newPromptName = prompt(`Rename "${name}" to:`, name);
    if (newPromptName && newPromptName !== name) {
      await onRenamePrompt(name, newPromptName);
      if (selectedPrompt === name) {
        setSelectedPrompt(newPromptName);
      }
    }
  }, [selectedPrompt, onRenamePrompt]);

  // ---------------------------------------------------------------------------
  // RENDER - COLLAPSED
  // ---------------------------------------------------------------------------

  if (collapsed) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '8px',
        }}
      >
        <IconButton
          icon={<ChevronRight size={16} />}
          tooltip="Expand prompts"
          onClick={() => onCollapsedChange(false)}
        />
        <div style={{ marginTop: '12px' }}>
          <IconButton
            icon={<FileText size={18} />}
            tooltip="Prompts"
            onClick={() => onCollapsedChange(false)}
          />
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER - EXPANDED
  // ---------------------------------------------------------------------------

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <span
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--color-text)',
          }}
        >
          Prompts
        </span>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <IconButton
            icon={<Plus size={14} />}
            tooltip="New prompt"
            size="sm"
            onClick={handleCreatePrompt}
          />
          <IconButton
            icon={<RefreshCw size={14} />}
            tooltip="Refresh"
            size="sm"
            loading={loading}
            onClick={onRefresh}
          />
          <IconButton
            icon={<ChevronLeft size={14} />}
            tooltip="Collapse"
            size="sm"
            onClick={() => onCollapsedChange(true)}
          />
        </div>
      </div>

      {/* New prompt input */}
      {isCreating && (
        <div
          style={{
            padding: '12px',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Prompt name..."
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveNew();
              if (e.key === 'Escape') setIsCreating(false);
            }}
            style={{
              width: '100%',
              padding: '8px',
              backgroundColor: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--color-text)',
              fontSize: '12px',
            }}
          />
          <div
            style={{
              display: 'flex',
              gap: '8px',
              marginTop: '8px',
            }}
          >
            <button
              onClick={handleSaveNew}
              disabled={!newName.trim() || saving}
              style={{
                flex: 1,
                padding: '6px',
                backgroundColor: 'var(--color-accent)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                fontSize: '11px',
                cursor: 'pointer',
                opacity: !newName.trim() ? 0.5 : 1,
              }}
            >
              Create
            </button>
            <button
              onClick={() => setIsCreating(false)}
              style={{
                flex: 1,
                padding: '6px',
                backgroundColor: 'var(--color-bg-tertiary)',
                color: 'var(--color-text-secondary)',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Prompt list */}
      <div
        className="custom-scrollbar"
        style={{
          flex: 1,
          overflowY: 'auto',
        }}
      >
        {prompts.length === 0 ? (
          <div
            style={{
              padding: '24px',
              textAlign: 'center',
              color: 'var(--color-text-tertiary)',
              fontSize: '12px',
            }}
          >
            No saved prompts
          </div>
        ) : (
          prompts.map((prompt) => (
            <PromptCard
              key={prompt.name}
              prompt={prompt}
              selected={selectedPrompt === prompt.name}
              onClick={() => handleSelectPrompt(prompt.name)}
              onRename={() => handleRename(prompt.name)}
              onDelete={() => handleDelete(prompt.name)}
            />
          ))
        )}
      </div>

      {/* Editor panel */}
      {selectedPrompt && editingContent !== null && (
        <div
          style={{
            borderTop: '1px solid var(--color-border)',
            padding: '12px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '8px',
            }}
          >
            <span
              style={{
                fontSize: '11px',
                color: 'var(--color-text-secondary)',
              }}
            >
              Editing: {selectedPrompt}
            </span>
            <IconButton
              icon={<Save size={14} />}
              tooltip="Save changes"
              size="sm"
              loading={saving}
              onClick={handleSaveChanges}
            />
          </div>
          <textarea
            value={editingContent}
            onChange={(e) => setEditingContent(e.target.value)}
            style={{
              width: '100%',
              height: '120px',
              padding: '8px',
              backgroundColor: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--color-text)',
              fontSize: '12px',
              resize: 'vertical',
              fontFamily: 'inherit',
            }}
          />
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// PROMPT CARD
// -----------------------------------------------------------------------------

interface PromptCardProps {
  prompt: PromptFile;
  selected: boolean;
  onClick: () => void;
  onRename: () => void;
  onDelete: () => void;
}

function PromptCard({
  prompt,
  selected,
  onClick,
  onRename,
  onDelete,
}: PromptCardProps) {
  const [showActions, setShowActions] = React.useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '10px 12px',
        backgroundColor: selected
          ? 'var(--color-accent-subtle)'
          : 'transparent',
        cursor: 'pointer',
        borderBottom: '1px solid var(--color-border)',
        transition: 'background-color 0.15s ease',
      }}
    >
      <FileText
        size={14}
        style={{
          marginRight: '8px',
          color: selected ? 'var(--color-accent)' : 'var(--color-text-secondary)',
        }}
      />

      <span
        style={{
          flex: 1,
          fontSize: '12px',
          color: 'var(--color-text)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {prompt.name}
      </span>

      {showActions && (
        <div
          style={{
            display: 'flex',
            gap: '4px',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <IconButton
            icon={<Pencil size={12} />}
            tooltip="Rename"
            size="sm"
            onClick={onRename}
          />
          <IconButton
            icon={<Trash2 size={12} />}
            tooltip="Delete"
            size="sm"
            onClick={onDelete}
          />
        </div>
      )}
    </div>
  );
}
