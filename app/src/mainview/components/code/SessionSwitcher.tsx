// =============================================================================
// SESSION SWITCHER
// =============================================================================
// Compact card widget for quick session switching.
// Positioned near the input area for rapid access to different sessions.

import React, { useState } from 'react';
import { cn } from '../../lib';
import { Plus, ChevronUp, ChevronDown, MessageSquare, Clock, Loader2 } from 'lucide-react';
import type { ClaudeSession } from '../../hooks/useClaudeCodeData';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface SessionSwitcherProps {
  sessions: ClaudeSession[];
  selectedSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onNewSession: () => void;
  loading?: boolean;
  className?: string;
}

// -----------------------------------------------------------------------------
// HELPER FUNCTIONS
// -----------------------------------------------------------------------------

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function getSessionName(session: ClaudeSession): string {
  // Use slug if available, otherwise create from date
  if (session.slug) {
    return session.slug.replace(/-/g, ' ').slice(0, 30);
  }
  return `Session ${new Date(session.createdAt).toLocaleDateString()}`;
}

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function SessionSwitcher({
  sessions,
  selectedSessionId,
  onSelectSession,
  onNewSession,
  loading = false,
  className,
}: SessionSwitcherProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Limit visible sessions in collapsed state
  const visibleSessions = isExpanded ? sessions : sessions.slice(0, 3);
  const hasMoreSessions = sessions.length > 3 && !isExpanded;

  return (
    <div
      className={cn(
        'border-t border-[var(--color-border)]',
        'bg-[var(--color-bg-secondary)]',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            'flex items-center gap-2',
            'text-xs font-medium text-[var(--color-text-secondary)]',
            'hover:text-[var(--color-text)] transition-colors'
          )}
        >
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronUp className="w-3.5 h-3.5" />
          )}
          <span>Sessions ({sessions.length})</span>
        </button>

        <button
          onClick={onNewSession}
          disabled={loading}
          className={cn(
            'flex items-center gap-1.5 px-2 py-1 rounded',
            'text-xs font-medium',
            'bg-[var(--color-accent)] text-white',
            'hover:opacity-90 transition-opacity',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {loading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Plus className="w-3 h-3" />
          )}
          <span>New</span>
        </button>
      </div>

      {/* Session List */}
      {isExpanded && (
        <div className="px-2 pb-2 space-y-1 max-h-48 overflow-y-auto">
          {sessions.length === 0 ? (
            <div className="px-2 py-3 text-xs text-[var(--color-text-tertiary)] text-center">
              No sessions yet
            </div>
          ) : (
            <>
              {visibleSessions.map((session) => (
                <SessionItem
                  key={session.id}
                  session={session}
                  isSelected={session.id === selectedSessionId}
                  onClick={() => onSelectSession(session.id)}
                />
              ))}
              {hasMoreSessions && (
                <button
                  onClick={() => setIsExpanded(true)}
                  className={cn(
                    'w-full px-2 py-1.5 rounded',
                    'text-xs text-[var(--color-text-tertiary)]',
                    'hover:bg-[var(--color-bg-elevated)] transition-colors',
                    'text-center'
                  )}
                >
                  Show {sessions.length - 3} more...
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// SESSION ITEM
// -----------------------------------------------------------------------------

interface SessionItemProps {
  session: ClaudeSession;
  isSelected: boolean;
  onClick: () => void;
}

function SessionItem({ session, isSelected, onClick }: SessionItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2 px-2 py-1.5 rounded',
        'text-left transition-colors',
        isSelected
          ? 'bg-[var(--color-accent-subtle)] border border-[var(--color-accent)]'
          : 'hover:bg-[var(--color-bg-elevated)] border border-transparent'
      )}
    >
      {/* Status dot */}
      <div
        className={cn(
          'w-2 h-2 rounded-full flex-shrink-0',
          isSelected
            ? 'bg-[var(--color-accent)]'
            : 'bg-[var(--color-text-tertiary)]'
        )}
      />

      {/* Session info */}
      <div className="flex-1 min-w-0">
        <div
          className={cn(
            'text-xs font-medium truncate',
            isSelected ? 'text-[var(--color-accent)]' : 'text-[var(--color-text)]'
          )}
        >
          {getSessionName(session)}
        </div>
        <div className="flex items-center gap-2 text-[10px] text-[var(--color-text-tertiary)]">
          <span className="flex items-center gap-0.5">
            <Clock className="w-2.5 h-2.5" />
            {formatRelativeTime(session.updatedAt)}
          </span>
          <span className="flex items-center gap-0.5">
            <MessageSquare className="w-2.5 h-2.5" />
            {session.messageCount}
          </span>
        </div>
      </div>
    </button>
  );
}
