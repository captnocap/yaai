// =============================================================================
// ACTIVE SESSIONS PANEL
// =============================================================================
// Shows currently running/active sessions across the workspace.

import React from 'react';
import { cn } from '../../../lib';
import { InputHubPanel } from '../InputHubPanel';
import { MessageSquare, Terminal, Image, Telescope, Loader2 } from 'lucide-react';
import type { ViewType } from '../../../workspace/types';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface ActiveSession {
  id: string;
  type: ViewType;
  title: string;
  status: 'idle' | 'streaming' | 'waiting';
  lastActivity: number;
}

export interface ActiveSessionsPanelProps {
  sessions: ActiveSession[];
  currentSessionId?: string | null;
  onSessionClick?: (session: ActiveSession) => void;
  className?: string;
}

// -----------------------------------------------------------------------------
// CONSTANTS
// -----------------------------------------------------------------------------

const TYPE_ICONS: Record<ViewType, React.ComponentType<{ size?: number; className?: string; color?: string }>> = {
  chat: MessageSquare,
  code: Terminal,
  image: Image,
  research: Telescope,
  prompts: MessageSquare,
  preview: MessageSquare,
};

const TYPE_COLORS: Record<ViewType, string> = {
  chat: '#3b82f6',
  code: '#10b981',
  image: '#8b5cf6',
  research: '#f59e0b',
  prompts: '#ec4899',
  preview: '#22c55e',
};

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function ActiveSessionsPanel({
  sessions,
  currentSessionId,
  onSessionClick,
  className,
}: ActiveSessionsPanelProps) {
  // Sort by most recent activity
  const sortedSessions = [...sessions].sort((a, b) => b.lastActivity - a.lastActivity);

  return (
    <InputHubPanel
      panelId="active-sessions"
      title="Active"
      compactHeader
      className={className}
    >
      <div className="h-full flex items-center gap-1.5 px-2 overflow-x-auto">
        {sortedSessions.length === 0 ? (
          <span className="text-[10px] text-[var(--color-text-tertiary)] italic">
            No active sessions
          </span>
        ) : (
          sortedSessions.map((session) => (
            <SessionChip
              key={session.id}
              session={session}
              isActive={session.id === currentSessionId}
              onClick={() => onSessionClick?.(session)}
            />
          ))
        )}
      </div>
    </InputHubPanel>
  );
}

// -----------------------------------------------------------------------------
// SESSION CHIP
// -----------------------------------------------------------------------------

interface SessionChipProps {
  session: ActiveSession;
  isActive: boolean;
  onClick?: () => void;
}

function SessionChip({ session, isActive, onClick }: SessionChipProps) {
  const Icon = TYPE_ICONS[session.type] || MessageSquare;
  const color = TYPE_COLORS[session.type] || '#3b82f6';

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-2 py-1 rounded',
        'text-[10px] font-medium whitespace-nowrap',
        'transition-all duration-150',
        'border',
        isActive
          ? 'bg-[var(--color-accent)]/20 border-[var(--color-accent)]/50 text-[var(--color-text)]'
          : 'bg-[var(--color-bg-secondary)] border-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]'
      )}
    >
      <Icon size={12} color={color} />
      <span className="max-w-[80px] truncate">{session.title}</span>
      {session.status === 'streaming' && (
        <Loader2 size={10} className="animate-spin text-[var(--color-accent)]" />
      )}
      {session.status === 'waiting' && (
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
      )}
    </button>
  );
}

// -----------------------------------------------------------------------------
// EMPTY STATE
// -----------------------------------------------------------------------------

export function ActiveSessionsEmpty() {
  return (
    <div className="h-full flex items-center justify-center px-2">
      <span className="text-[10px] text-[var(--color-text-tertiary)]">
        Start a chat or code session
      </span>
    </div>
  );
}
