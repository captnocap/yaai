// =============================================================================
// NAVIGATION LAYER
// =============================================================================
// The navigation sidebar content with expandable sections.
// Designed to work in both collapsed (icon-only) and expanded states.

import React from 'react';
import {
  MessageSquare,
  FileText,
  Brain,
  Wrench,
  Settings,
  Plus,
  ChevronRight,
  Sparkles,
  Terminal,
} from 'lucide-react';
import { cn } from '../../lib';
import { useWorkspaceLayoutContext } from './useWorkspaceLayout';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: number | string;
  active?: boolean;
  children?: NavItem[];
}

export interface NavigationLayerProps {
  items?: NavItem[];
  activeId?: string;
  onItemClick?: (id: string) => void;
  onNewChat?: () => void;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

// -----------------------------------------------------------------------------
// DEFAULT NAV ITEMS
// -----------------------------------------------------------------------------

const DEFAULT_NAV_ITEMS: NavItem[] = [
  { id: 'chats', label: 'Chats', icon: MessageSquare },
  { id: 'code', label: 'Code', icon: Terminal },
  { id: 'prompts', label: 'Prompts', icon: FileText },
  { id: 'memories', label: 'Memories', icon: Brain },
  { id: 'tools', label: 'Tools', icon: Wrench },
  { id: 'settings', label: 'Settings', icon: Settings },
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------

export function NavigationLayer({
  items = DEFAULT_NAV_ITEMS,
  activeId = 'chats',
  onItemClick,
  onNewChat,
  header,
  footer,
  className,
}: NavigationLayerProps) {
  const { state, actions } = useWorkspaceLayoutContext();
  const isExpanded = state.navigation.expanded || state.navigation.hovered;

  return (
    <div
      className={cn('navigation-content', className)}
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: '8px',
      }}
    >
      {/* Header / Logo */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '8px',
          marginBottom: '8px',
        }}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-hover))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Sparkles size={18} color="white" />
        </div>
        {isExpanded && (
          <span
            style={{
              fontSize: '16px',
              fontWeight: 600,
              color: 'var(--color-text)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
            }}
          >
            YAAI
          </span>
        )}
      </div>

      {header}

      {/* New Chat Button */}
      <button
        onClick={onNewChat}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: isExpanded ? '10px 12px' : '10px',
          marginBottom: '16px',
          border: '1px dashed var(--color-border)',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'transparent',
          color: 'var(--color-text-secondary)',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          justifyContent: isExpanded ? 'flex-start' : 'center',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--color-accent)';
          e.currentTarget.style.color = 'var(--color-accent)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--color-border)';
          e.currentTarget.style.color = 'var(--color-text-secondary)';
        }}
      >
        <Plus size={18} />
        {isExpanded && (
          <span style={{ fontSize: '14px' }}>New Chat</span>
        )}
      </button>

      {/* Nav Items */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {items.map((item) => (
          <NavItemButton
            key={item.id}
            item={item}
            active={item.id === activeId}
            expanded={isExpanded}
            onClick={() => onItemClick?.(item.id)}
          />
        ))}
      </nav>

      {footer}

      {/* Expand/Collapse Toggle */}
      <button
        onClick={actions.toggleNav}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: isExpanded ? 'flex-end' : 'center',
          padding: '8px',
          marginTop: '8px',
          border: 'none',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'transparent',
          color: 'var(--color-text-tertiary)',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
        title={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        <ChevronRight
          size={16}
          style={{
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
          }}
        />
      </button>
    </div>
  );
}

// -----------------------------------------------------------------------------
// NAV ITEM BUTTON
// -----------------------------------------------------------------------------

interface NavItemButtonProps {
  item: NavItem;
  active: boolean;
  expanded: boolean;
  onClick: () => void;
}

function NavItemButton({ item, active, expanded, onClick }: NavItemButtonProps) {
  const Icon = item.icon;

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: expanded ? '10px 12px' : '10px',
        border: 'none',
        borderRadius: 'var(--radius-md)',
        backgroundColor: active ? 'var(--color-accent-subtle)' : 'transparent',
        color: active ? 'var(--color-accent)' : 'var(--color-text-secondary)',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        justifyContent: expanded ? 'flex-start' : 'center',
        position: 'relative',
      }}
      title={expanded ? undefined : item.label}
    >
      <Icon size={18} style={{ flexShrink: 0 }} />
      {expanded && (
        <>
          <span
            style={{
              fontSize: '14px',
              flex: 1,
              textAlign: 'left',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {item.label}
          </span>
          {item.badge && (
            <span
              style={{
                fontSize: '11px',
                padding: '2px 6px',
                borderRadius: '9999px',
                backgroundColor: active ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
                color: active ? 'white' : 'var(--color-text-tertiary)',
              }}
            >
              {item.badge}
            </span>
          )}
        </>
      )}
      {!expanded && item.badge && (
        <span
          style={{
            position: 'absolute',
            top: '6px',
            right: '6px',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: 'var(--color-accent)',
          }}
        />
      )}
    </button>
  );
}

// -----------------------------------------------------------------------------
// CHAT LIST SECTION (for expanded view)
// -----------------------------------------------------------------------------

export interface ChatItem {
  id: string;
  title: string;
  preview?: string;
  timestamp?: Date;
  unread?: boolean;
}

export interface ChatListProps {
  chats: ChatItem[];
  activeChatId?: string;
  onChatClick?: (id: string) => void;
  className?: string;
}

export function ChatList({ chats, activeChatId, onChatClick, className }: ChatListProps) {
  return (
    <div
      className={cn('chat-list', className)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        padding: '8px 0',
      }}
    >
      {chats.map((chat) => (
        <button
          key={chat.id}
          onClick={() => onChatClick?.(chat.id)}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            padding: '8px 12px',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            backgroundColor: chat.id === activeChatId ? 'var(--color-bg-tertiary)' : 'transparent',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'background-color 0.15s ease',
          }}
        >
          <span
            style={{
              fontSize: '13px',
              fontWeight: chat.unread ? 600 : 400,
              color: 'var(--color-text)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {chat.title}
          </span>
          {chat.preview && (
            <span
              style={{
                fontSize: '12px',
                color: 'var(--color-text-tertiary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {chat.preview}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
