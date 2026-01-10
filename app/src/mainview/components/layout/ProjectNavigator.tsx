// =============================================================================
// PROJECT NAVIGATOR
// =============================================================================
// VS Code-style sidebar for navigating all projects across modes.

import React, { useState, useCallback } from 'react';
import { Plus, Search, Archive, ChevronDown, ChevronRight, RefreshCw } from 'lucide-react';
import { ProjectListItem } from './ProjectListItem';
import { ProjectContextMenu, type ProjectAction } from './ProjectContextMenu';
import type { ProjectSummary, ProjectType } from '../../../bun/lib/stores/chat-store.types';

export interface ProjectNavigatorProps {
  projects: ProjectSummary[];
  activeProjectId: string | null;
  onProjectClick: (project: ProjectSummary) => void;
  onNewProject: (type: ProjectType) => void;
  onProjectAction: (action: ProjectAction, project: ProjectSummary) => void;
  onSyncClaudeProjects?: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  showArchived: boolean;
  onShowArchivedChange: (show: boolean) => void;
  loading?: boolean;
  syncing?: boolean;
}

export function ProjectNavigator({
  projects,
  activeProjectId,
  onProjectClick,
  onNewProject,
  onProjectAction,
  onSyncClaudeProjects,
  searchQuery,
  onSearchChange,
  showArchived,
  onShowArchivedChange,
  loading,
  syncing,
}: ProjectNavigatorProps) {
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    project: ProjectSummary;
  } | null>(null);
  const [archiveExpanded, setArchiveExpanded] = useState(false);

  // Separate pinned, active, and archived projects
  const pinnedProjects = projects.filter((p) => p.isPinned && !p.isArchived);
  const activeProjects = projects.filter((p) => !p.isPinned && !p.isArchived);
  const archivedProjects = projects.filter((p) => p.isArchived);

  const handleContextMenu = useCallback((e: React.MouseEvent, project: ProjectSummary) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      project,
    });
  }, []);

  const handleContextMenuAction = useCallback(
    (action: ProjectAction) => {
      if (contextMenu) {
        onProjectAction(action, contextMenu.project);
      }
    },
    [contextMenu, onProjectAction]
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        {/* Search + Refresh */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '8px',
          }}
        >
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 10px',
              backgroundColor: 'var(--color-bg-elevated)',
              borderRadius: '6px',
            }}
          >
            <Search size={14} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              style={{
                flex: 1,
                border: 'none',
                backgroundColor: 'transparent',
                color: 'var(--color-text)',
                fontSize: '13px',
                outline: 'none',
              }}
            />
          </div>
          {onSyncClaudeProjects && (
            <button
              onClick={onSyncClaudeProjects}
              disabled={syncing}
              title="Sync Claude Code projects"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                border: 'none',
                borderRadius: '6px',
                backgroundColor: 'var(--color-bg-elevated)',
                color: syncing ? 'var(--color-text-tertiary)' : 'var(--color-text-secondary)',
                cursor: syncing ? 'default' : 'pointer',
                transition: 'all 0.15s ease',
              }}
              className="hover:bg-[var(--color-bg-tertiary)]"
            >
              <RefreshCw
                size={14}
                style={{
                  animation: syncing ? 'spin 1s linear infinite' : 'none',
                }}
              />
            </button>
          )}
        </div>

        {/* New Project Button */}
        <button
          onClick={() => onNewProject('chat')}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '8px',
            border: '1px dashed var(--color-border)',
            borderRadius: '6px',
            backgroundColor: 'transparent',
            color: 'var(--color-text-secondary)',
            fontSize: '13px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          className="hover:bg-[var(--color-bg-elevated)] hover:border-[var(--color-text-tertiary)]"
        >
          <Plus size={14} />
          <span>New Chat</span>
        </button>
      </div>

      {/* Project List */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '8px',
        }}
      >
        {loading ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '32px',
              color: 'var(--color-text-tertiary)',
              fontSize: '13px',
            }}
          >
            Loading...
          </div>
        ) : projects.length === 0 ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '32px',
              color: 'var(--color-text-tertiary)',
              fontSize: '13px',
              textAlign: 'center',
            }}
          >
            {searchQuery ? 'No projects found' : 'No projects yet'}
          </div>
        ) : (
          <>
            {/* Pinned Section */}
            {pinnedProjects.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--color-text-tertiary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    padding: '0 4px',
                    marginBottom: '4px',
                  }}
                >
                  Pinned
                </div>
                {pinnedProjects.map((project) => (
                  <ProjectListItem
                    key={project.id}
                    id={project.id}
                    type={project.type}
                    title={project.title}
                    preview={project.preview}
                    isPinned={project.isPinned}
                    active={project.id === activeProjectId}
                    onClick={() => onProjectClick(project)}
                    onContextMenu={(e) => handleContextMenu(e, project)}
                  />
                ))}
              </div>
            )}

            {/* All Projects Section */}
            {activeProjects.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                {pinnedProjects.length > 0 && (
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: 'var(--color-text-tertiary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      padding: '0 4px',
                      marginBottom: '4px',
                    }}
                  >
                    Recent
                  </div>
                )}
                {activeProjects.map((project) => (
                  <ProjectListItem
                    key={project.id}
                    id={project.id}
                    type={project.type}
                    title={project.title}
                    preview={project.preview}
                    isPinned={project.isPinned}
                    active={project.id === activeProjectId}
                    onClick={() => onProjectClick(project)}
                    onContextMenu={(e) => handleContextMenu(e, project)}
                  />
                ))}
              </div>
            )}

            {/* Archive Section */}
            {showArchived && archivedProjects.length > 0 && (
              <div>
                <button
                  onClick={() => setArchiveExpanded(!archiveExpanded)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    width: '100%',
                    padding: '4px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: 'var(--color-text-tertiary)',
                    fontSize: '11px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  {archiveExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  <Archive size={12} />
                  <span>Archive ({archivedProjects.length})</span>
                </button>
                {archiveExpanded &&
                  archivedProjects.map((project) => (
                    <ProjectListItem
                      key={project.id}
                      id={project.id}
                      type={project.type}
                      title={project.title}
                      preview={project.preview}
                      isPinned={project.isPinned}
                      active={project.id === activeProjectId}
                      onClick={() => onProjectClick(project)}
                      onContextMenu={(e) => handleContextMenu(e, project)}
                    />
                  ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer - Archive toggle */}
      <div
        style={{
          padding: '8px 12px',
          borderTop: '1px solid var(--color-border)',
        }}
      >
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            color: 'var(--color-text-tertiary)',
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => onShowArchivedChange(e.target.checked)}
            style={{ cursor: 'pointer' }}
          />
          <span>Show archived</span>
        </label>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ProjectContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          isPinned={contextMenu.project.isPinned}
          isArchived={contextMenu.project.isArchived}
          onAction={handleContextMenuAction}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
