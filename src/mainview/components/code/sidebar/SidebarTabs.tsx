import React, { useState } from 'react';
import { cn } from '../../../lib';
import { History, FolderTree } from 'lucide-react';

export type SidebarTabId = 'history' | 'files';

export interface SidebarTabsProps {
  activeTab: SidebarTabId;
  onTabChange: (tab: SidebarTabId) => void;
  historyContent: React.ReactNode;
  filesContent: React.ReactNode;
  className?: string;
}

export function SidebarTabs({
  activeTab,
  onTabChange,
  historyContent,
  filesContent,
  className,
}: SidebarTabsProps) {
  const tabs: { id: SidebarTabId; label: string; icon: React.ElementType }[] = [
    { id: 'files', label: 'Files', icon: FolderTree },
    { id: 'history', label: 'History', icon: History },
  ];

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Tab buttons */}
      <div className="flex border-b border-[var(--color-border)]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2.5 px-3',
                'text-xs font-medium',
                'border-b-2 -mb-px transition-colors',
                isActive
                  ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                  : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'history' && historyContent}
        {activeTab === 'files' && filesContent}
      </div>
    </div>
  );
}
