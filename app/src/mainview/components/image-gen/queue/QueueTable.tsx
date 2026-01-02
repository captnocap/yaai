// =============================================================================
// QUEUE TABLE
// =============================================================================
// Displays queue groups and entries in a collapsible table format.

import React, { useState, useCallback } from 'react';
import { Plus, FolderPlus } from 'lucide-react';
import { QueueGroupRow } from './QueueGroupRow';
import { QueueEntryRow } from './QueueEntryRow';
import { QueueEntryEditor } from './QueueEntryEditor';
import type { QueueGroup, QueueEntry } from '../../../types/image-gen';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface QueueTableProps {
  groups: QueueGroup[];
  entries: Map<string, QueueEntry>;
  selectedEntry: QueueEntry | null;
  onSelectEntry: (entry: QueueEntry | null) => void;
  onCreateGroup: (name: string) => Promise<QueueGroup>;
  onUpdateGroup: (id: string, updates: Partial<QueueGroup>) => Promise<QueueGroup | null>;
  onDeleteGroup: (id: string) => Promise<void>;
  onReorderGroups: (orderedIds: string[]) => Promise<void>;
  onCreateEntry: (groupId: string, entry: Partial<QueueEntry>) => Promise<QueueEntry | null>;
  onUpdateEntry: (id: string, updates: Partial<QueueEntry>) => Promise<QueueEntry | null>;
  onDeleteEntry: (id: string) => Promise<void>;
  onDuplicateEntry: (id: string) => Promise<QueueEntry | null>;
  onMoveEntry: (id: string, targetGroupId: string, index: number) => Promise<void>;
  onReorderEntries: (groupId: string, orderedIds: string[]) => Promise<void>;
  onEnableEntries: (ids: string[]) => Promise<void>;
  onDisableEntries: (ids: string[]) => Promise<void>;
  onDeleteEntries: (ids: string[]) => Promise<void>;
}

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function QueueTable({
  groups,
  entries,
  selectedEntry,
  onSelectEntry,
  onCreateGroup,
  onUpdateGroup,
  onDeleteGroup,
  onReorderGroups,
  onCreateEntry,
  onUpdateEntry,
  onDeleteEntry,
  onDuplicateEntry,
  onMoveEntry,
  onReorderEntries,
  onEnableEntries,
  onDisableEntries,
  onDeleteEntries,
}: QueueTableProps) {
  const [editingEntry, setEditingEntry] = useState<QueueEntry | null>(null);
  const [creatingInGroup, setCreatingInGroup] = useState<string | null>(null);
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

  const handleCreateGroup = useCallback(async () => {
    const name = prompt('Enter group name:');
    if (name) {
      await onCreateGroup(name);
    }
  }, [onCreateGroup]);

  const handleToggleGroup = useCallback(async (id: string, collapsed: boolean) => {
    await onUpdateGroup(id, { collapsed });
  }, [onUpdateGroup]);

  const handleRenameGroup = useCallback(async (id: string) => {
    const group = groups.find(g => g.id === id);
    if (!group) return;

    const name = prompt('Enter new name:', group.name);
    if (name && name !== group.name) {
      await onUpdateGroup(id, { name });
    }
  }, [groups, onUpdateGroup]);

  const handleAddEntry = useCallback((groupId: string) => {
    setCreatingInGroup(groupId);
  }, []);

  const handleEntryClick = useCallback((entry: QueueEntry) => {
    if (selectedEntry?.id === entry.id) {
      onSelectEntry(null);
    } else {
      onSelectEntry(entry);
    }
  }, [selectedEntry, onSelectEntry]);

  const handleEntryDoubleClick = useCallback((entry: QueueEntry) => {
    setEditingEntry(entry);
  }, []);

  const handleEntryToggle = useCallback((entryId: string, selected: boolean) => {
    setSelectedEntries(prev => {
      const next = new Set(prev);
      if (selected) {
        next.add(entryId);
      } else {
        next.delete(entryId);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback((groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;

    setSelectedEntries(prev => {
      const next = new Set(prev);
      for (const entryId of group.entries) {
        next.add(entryId);
      }
      return next;
    });
  }, [groups]);

  const handleDeselectAll = useCallback(() => {
    setSelectedEntries(new Set());
  }, []);

  const handleBulkEnable = useCallback(async () => {
    await onEnableEntries(Array.from(selectedEntries));
    setSelectedEntries(new Set());
  }, [selectedEntries, onEnableEntries]);

  const handleBulkDisable = useCallback(async () => {
    await onDisableEntries(Array.from(selectedEntries));
    setSelectedEntries(new Set());
  }, [selectedEntries, onDisableEntries]);

  const handleBulkDelete = useCallback(async () => {
    if (confirm(`Delete ${selectedEntries.size} entries?`)) {
      await onDeleteEntries(Array.from(selectedEntries));
      setSelectedEntries(new Set());
    }
  }, [selectedEntries, onDeleteEntries]);

  const handleSaveEntry = useCallback(async (entry: Partial<QueueEntry>) => {
    if (editingEntry) {
      await onUpdateEntry(editingEntry.id, entry);
      setEditingEntry(null);
    } else if (creatingInGroup) {
      await onCreateEntry(creatingInGroup, entry);
      setCreatingInGroup(null);
    }
  }, [editingEntry, creatingInGroup, onUpdateEntry, onCreateEntry]);

  const handleCancelEdit = useCallback(() => {
    setEditingEntry(null);
    setCreatingInGroup(null);
  }, []);

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  const hasSelection = selectedEntries.size > 0;

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px',
          borderBottom: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-bg-elevated)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={handleCreateGroup}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 12px',
              backgroundColor: 'transparent',
              color: 'var(--color-text-secondary)',
              border: '1px dashed var(--color-border)',
              borderRadius: 'var(--radius-md)',
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <FolderPlus size={14} />
            Add Group
          </button>
        </div>

        {/* Bulk actions */}
        {hasSelection && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span
              style={{
                fontSize: '12px',
                color: 'var(--color-text-secondary)',
              }}
            >
              {selectedEntries.size} selected
            </span>
            <button
              onClick={handleBulkEnable}
              style={{
                padding: '4px 8px',
                backgroundColor: 'var(--color-success-subtle)',
                color: 'var(--color-success)',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              Enable
            </button>
            <button
              onClick={handleBulkDisable}
              style={{
                padding: '4px 8px',
                backgroundColor: 'var(--color-bg-tertiary)',
                color: 'var(--color-text-secondary)',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              Disable
            </button>
            <button
              onClick={handleBulkDelete}
              style={{
                padding: '4px 8px',
                backgroundColor: 'var(--color-error-subtle)',
                color: 'var(--color-error)',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              Delete
            </button>
            <button
              onClick={handleDeselectAll}
              style={{
                padding: '4px 8px',
                backgroundColor: 'transparent',
                color: 'var(--color-text-tertiary)',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Groups and entries */}
      <div
        className="custom-scrollbar"
        style={{
          flex: 1,
          overflowY: 'auto',
        }}
      >
        {groups.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '48px',
              color: 'var(--color-text-tertiary)',
            }}
          >
            <FolderPlus size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
            <p style={{ fontSize: '14px', margin: 0 }}>No queue groups yet</p>
            <button
              onClick={handleCreateGroup}
              style={{
                marginTop: '12px',
                padding: '8px 16px',
                backgroundColor: 'var(--color-accent)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Create First Group
            </button>
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.id}>
              <QueueGroupRow
                group={group}
                entryCount={group.entries.length}
                onToggle={() => handleToggleGroup(group.id, !group.collapsed)}
                onRename={() => handleRenameGroup(group.id)}
                onDelete={() => onDeleteGroup(group.id)}
                onAddEntry={() => handleAddEntry(group.id)}
                onSelectAll={() => handleSelectAll(group.id)}
              />

              {!group.collapsed && (
                <div>
                  {group.entries.map((entryId) => {
                    const entry = entries.get(entryId);
                    if (!entry) return null;

                    return (
                      <QueueEntryRow
                        key={entry.id}
                        entry={entry}
                        selected={selectedEntry?.id === entry.id}
                        checked={selectedEntries.has(entry.id)}
                        onClick={() => handleEntryClick(entry)}
                        onDoubleClick={() => handleEntryDoubleClick(entry)}
                        onCheck={(checked) => handleEntryToggle(entry.id, checked)}
                        onEnable={() => onEnableEntries([entry.id])}
                        onDisable={() => onDisableEntries([entry.id])}
                        onDuplicate={() => onDuplicateEntry(entry.id)}
                        onDelete={() => onDeleteEntry(entry.id)}
                      />
                    );
                  })}

                  {group.entries.length === 0 && (
                    <div
                      style={{
                        padding: '16px 48px',
                        textAlign: 'center',
                        color: 'var(--color-text-tertiary)',
                        fontSize: '12px',
                      }}
                    >
                      No entries in this group
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Entry editor modal */}
      {(editingEntry || creatingInGroup) && (
        <QueueEntryEditor
          entry={editingEntry || undefined}
          onSave={handleSaveEntry}
          onCancel={handleCancelEdit}
        />
      )}
    </div>
  );
}
