// =============================================================================
// PROMPT LIBRARY
// =============================================================================
// Grid view of saved prompts with filtering and creation.

import React, { useState, useMemo } from 'react';
import { Plus, Search, FileText, Image, Wrench, MoreVertical, Copy, Trash2 } from 'lucide-react';
import type { PromptLibraryItem, PromptType } from '../../../types/workbench';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface PromptLibraryProps {
  prompts: PromptLibraryItem[];
  loading: boolean;
  error: string | null;
  onCreate: (type: PromptType) => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
}

type FilterType = 'all' | PromptType;

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function PromptLibrary({
  prompts,
  loading,
  error,
  onCreate,
  onOpen,
  onDelete,
  onDuplicate,
}: PromptLibraryProps) {
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');
  const [showCreateMenu, setShowCreateMenu] = useState(false);

  // Filter prompts
  const filteredPrompts = useMemo(() => {
    return prompts.filter(p => {
      // Filter by type
      if (filter !== 'all' && p.type !== filter) return false;

      // Filter by search
      if (search) {
        const s = search.toLowerCase();
        return (
          p.name.toLowerCase().includes(s) ||
          p.description?.toLowerCase().includes(s) ||
          p.tags?.some(t => t.toLowerCase().includes(s))
        );
      }

      return true;
    });
  }, [prompts, filter, search]);

  const handleCreate = (type: PromptType) => {
    setShowCreateMenu(false);
    onCreate(type);
  };

  return (
    <div className="h-full flex flex-col bg-[var(--color-bg-secondary)]">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-[var(--color-border)] bg-[var(--color-bg)]">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold text-[var(--color-text)]">
              Prompt Library
            </h1>

            {/* Create button */}
            <div className="relative">
              <button
                onClick={() => setShowCreateMenu(!showCreateMenu)}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--color-accent)] text-white rounded-lg hover:bg-[var(--color-accent-hover)] transition-colors"
              >
                <Plus size={16} />
                <span>Create</span>
              </button>

              {showCreateMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowCreateMenu(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-48 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg shadow-lg z-50 overflow-hidden">
                    <button
                      onClick={() => handleCreate('text')}
                      className="flex items-center gap-3 w-full px-4 py-3 text-left text-[var(--color-text)] hover:bg-[var(--color-bg-secondary)] transition-colors"
                    >
                      <FileText size={16} className="text-blue-500" />
                      <div>
                        <div className="font-medium">Text Prompt</div>
                        <div className="text-xs text-[var(--color-text-secondary)]">Chat/completion prompts</div>
                      </div>
                    </button>
                    <button
                      onClick={() => handleCreate('image')}
                      className="flex items-center gap-3 w-full px-4 py-3 text-left text-[var(--color-text)] hover:bg-[var(--color-bg-secondary)] transition-colors"
                    >
                      <Image size={16} className="text-purple-500" />
                      <div>
                        <div className="font-medium">Image Prompt</div>
                        <div className="text-xs text-[var(--color-text-secondary)]">With wildcard support</div>
                      </div>
                    </button>
                    <button
                      onClick={() => handleCreate('tool')}
                      className="flex items-center gap-3 w-full px-4 py-3 text-left text-[var(--color-text)] hover:bg-[var(--color-bg-secondary)] transition-colors"
                    >
                      <Wrench size={16} className="text-orange-500" />
                      <div>
                        <div className="font-medium">Tool Config</div>
                        <div className="text-xs text-[var(--color-text-secondary)]">Agent tool definitions</div>
                      </div>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Search and filters */}
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search prompts..."
                className="w-full pl-9 pr-4 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] text-sm placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-accent)]"
              />
            </div>

            <div className="flex items-center gap-1 bg-[var(--color-bg-secondary)] rounded-lg p-1">
              {(['all', 'text', 'image', 'tool'] as FilterType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilter(type)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    filter === type
                      ? 'bg-[var(--color-bg)] text-[var(--color-text)] shadow-sm'
                      : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
                  }`}
                >
                  {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-2 border-[var(--color-border)] border-t-[var(--color-accent)] rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-48">
            <p className="text-[var(--color-text-secondary)]">{error}</p>
          </div>
        ) : filteredPrompts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-[var(--color-text-secondary)]">
            <FileText size={48} className="mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No prompts yet</p>
            <p className="text-sm">Create your first prompt to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredPrompts.map((prompt) => (
              <PromptCard
                key={prompt.id}
                prompt={prompt}
                onOpen={() => onOpen(prompt.id)}
                onDelete={() => onDelete(prompt.id)}
                onDuplicate={() => onDuplicate(prompt.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// PROMPT CARD
// -----------------------------------------------------------------------------

interface PromptCardProps {
  prompt: PromptLibraryItem;
  onOpen: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

function PromptCard({ prompt, onOpen, onDelete, onDuplicate }: PromptCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const TypeIcon = {
    text: FileText,
    image: Image,
    tool: Wrench,
  }[prompt.type];

  const typeColor = {
    text: 'text-blue-500',
    image: 'text-purple-500',
    tool: 'text-orange-500',
  }[prompt.type];

  const handleMenuAction = (action: () => void) => {
    setShowMenu(false);
    action();
  };

  return (
    <div
      className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg p-4 hover:border-[var(--color-accent)] transition-colors cursor-pointer group"
      onClick={onOpen}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-lg bg-[var(--color-bg-secondary)] ${typeColor}`}>
          <TypeIcon size={20} />
        </div>

        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-1 rounded hover:bg-[var(--color-bg-secondary)] opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreVertical size={16} className="text-[var(--color-text-secondary)]" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(false);
                }}
              />
              <div className="absolute right-0 top-full mt-1 w-36 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg shadow-lg z-50 overflow-hidden">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMenuAction(onDuplicate);
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm text-[var(--color-text)] hover:bg-[var(--color-bg-secondary)]"
                >
                  <Copy size={14} />
                  Duplicate
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete "${prompt.name}"?`)) {
                      handleMenuAction(onDelete);
                    }
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm text-red-500 hover:bg-[var(--color-bg-secondary)]"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <h3 className="font-medium text-[var(--color-text)] mb-1 truncate">
        {prompt.name}
      </h3>

      {prompt.description && (
        <p className="text-sm text-[var(--color-text-secondary)] line-clamp-2 mb-3">
          {prompt.description}
        </p>
      )}

      <div className="flex items-center justify-between">
        <span className="text-xs text-[var(--color-text-secondary)] capitalize">
          {prompt.type}
        </span>
        <span className="text-xs text-[var(--color-text-secondary)]">
          {formatRelativeTime(prompt.updatedAt)}
        </span>
      </div>

      {prompt.tags && prompt.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {prompt.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 bg-[var(--color-bg-secondary)] rounded text-xs text-[var(--color-text-secondary)]"
            >
              {tag}
            </span>
          ))}
          {prompt.tags.length > 3 && (
            <span className="text-xs text-[var(--color-text-secondary)]">
              +{prompt.tags.length - 3}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(diff / 3600000);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(diff / 86400000);
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString();
}
