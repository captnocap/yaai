// =============================================================================
// SESSIONS PANEL
// =============================================================================
// Code session list panel for Code mode.

import React from 'react';
import { Terminal, Clock, Check, Loader2 } from 'lucide-react';
import { cn } from '../../../lib';
import { InputHubPanel } from '../InputHubPanel';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface CodeSession {
  id: string;
  title: string;
  status: 'idle' | 'running' | 'completed' | 'error';
  lastActivity: number;
  messageCount?: number;
}

export interface SessionsPanelProps {
  sessions: CodeSession[];
  currentSessionId?: string | null;
  onSessionClick?: (session: CodeSession) => void;
  onNewSession?: () => void;
  className?: string;
}

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function SessionsPanel({
  sessions,
  currentSessionId,
  onSessionClick,
  onNewSession,
  className,
}: SessionsPanelProps) {
  // Sort by most recent activity
  const sortedSessions = [...sessions].sort((a, b) => b.lastActivity - a.lastActivity);

  return (
    <InputHubPanel
      panelId="sessions"
      title="Sessions"
      icon={<Terminal size={10} />}
      compactHeader
      className={className}
    >
      <div className="h-full flex flex-col overflow-hidden">
        {/* New session button */}
        {onNewSession && (
          <button
            onClick={onNewSession}
            className={cn(
              'flex items-center gap-1.5 px-2 py-1.5 mx-1.5 mt-1.5 rounded',
              'text-[10px] font-medium',
              'bg-[var(--color-accent)]/10 text-[var(--color-accent)]',
              'hover:bg-[var(--color-accent)]/20',
              'transition-colors'
            )}
          >
            <Terminal size={12} />
            New Session
          </button>
        )}

        {/* Session list */}
        <div className="flex-1 overflow-auto p-1.5 space-y-1">
          {sortedSessions.map((session) => (
            <SessionItem
              key={session.id}
              session={session}
              isActive={session.id === currentSessionId}
              onClick={() => onSessionClick?.(session)}
            />
          ))}

          {sortedSessions.length === 0 && (
            <div className="h-full flex items-center justify-center">
              <span className="text-[10px] text-[var(--color-text-tertiary)]">
                No sessions yet
              </span>
            </div>
          )}
        </div>
      </div>
    </InputHubPanel>
  );
}

// -----------------------------------------------------------------------------
// SESSION ITEM
// -----------------------------------------------------------------------------

interface SessionItemProps {
  session: CodeSession;
  isActive: boolean;
  onClick?: () => void;
}

function SessionItem({ session, isActive, onClick }: SessionItemProps) {
  const timeAgo = formatTimeAgo(session.lastActivity);

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2 px-2 py-1.5 rounded',
        'text-left text-[11px]',
        'transition-colors duration-100',
        isActive
          ? 'bg-[var(--color-accent)]/20 text-[var(--color-text)]'
          : 'hover:bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]'
      )}
    >
      <SessionStatusIcon status={session.status} />
      <span className="truncate flex-1">{session.title}</span>
      <span className="text-[9px] text-[var(--color-text-tertiary)] shrink-0 flex items-center gap-1">
        <Clock size={8} />
        {timeAgo}
      </span>
    </button>
  );
}

// -----------------------------------------------------------------------------
// STATUS ICON
// -----------------------------------------------------------------------------

function SessionStatusIcon({ status }: { status: CodeSession['status'] }) {
  switch (status) {
    case 'running':
      return <Loader2 size={12} className="animate-spin text-amber-400" />;
    case 'completed':
      return <Check size={12} className="text-green-400" />;
    case 'error':
      return <span className="w-3 h-3 rounded-full bg-red-400" />;
    default:
      return <span className="w-3 h-3 rounded-full bg-[var(--color-text-tertiary)]/30" />;
  }
}

// -----------------------------------------------------------------------------
// UTILITIES
// -----------------------------------------------------------------------------

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return 'now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}
