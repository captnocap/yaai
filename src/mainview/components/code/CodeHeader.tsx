import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../../lib';
import { Folder, Play, Pause, Square, Settings } from 'lucide-react';
import { QuickSettings } from './settings';
import type { CodeSession, CodeSessionStatus } from '../../types/code-session';
import type { CodeSettings } from '../../types/code-settings';

export interface CodeHeaderProps {
  session: CodeSession | null;
  settings: CodeSettings;
  onStart?: () => void;
  onStop?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onUpdateSetting: <K extends keyof CodeSettings>(key: K, value: CodeSettings[K]) => void;
  onToggleSetting: (key: keyof CodeSettings) => void;
  onResetSettings: () => void;
  className?: string;
}

export function CodeHeader({
  session,
  settings,
  onStart,
  onStop,
  onPause,
  onResume,
  onUpdateSetting,
  onToggleSetting,
  onResetSettings,
  className,
}: CodeHeaderProps) {
  const [showSettings, setShowSettings] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close settings when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        settingsRef.current &&
        !settingsRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowSettings(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getStatusColor = (status: CodeSessionStatus) => {
    switch (status) {
      case 'running':
        return 'bg-green-500';
      case 'waiting_input':
        return 'bg-yellow-500';
      case 'paused':
        return 'bg-orange-500';
      case 'starting':
        return 'bg-blue-500';
      case 'stopped':
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = (status: CodeSessionStatus) => {
    switch (status) {
      case 'running':
        return 'Running';
      case 'waiting_input':
        return 'Waiting for input';
      case 'paused':
        return 'Paused';
      case 'starting':
        return 'Starting...';
      case 'stopped':
      default:
        return 'Stopped';
    }
  };

  return (
    <div className={cn(
      'flex items-center justify-between',
      'px-4 py-3',
      'border-b border-[var(--color-border)]',
      'bg-[var(--color-bg)]',
      className
    )}>
      {/* Left: Project info */}
      <div className="flex items-center gap-3">
        <h1 className="text-sm font-medium text-[var(--color-text)]">
          Claude Code
        </h1>

        {session && (
          <>
            <span className="text-[var(--color-text-tertiary)]">-</span>
            <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
              <Folder className="w-4 h-4" />
              <span className="font-mono">{session.projectPath}</span>
            </div>
          </>
        )}
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-3">
        {/* Status indicator */}
        {session && (
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
            <span className={cn(
              'w-2 h-2 rounded-full',
              getStatusColor(session.status),
              session.status === 'running' && 'animate-pulse'
            )} />
            <span>{getStatusText(session.status)}</span>
          </div>
        )}

        {/* Control buttons */}
        <div className="flex items-center gap-1">
          {!session || session.status === 'stopped' ? (
            <button
              onClick={onStart}
              className={cn(
                'flex items-center gap-1.5 py-1.5 px-3 rounded-lg',
                'text-xs font-medium',
                'bg-[var(--color-accent)] text-white',
                'hover:opacity-90 transition-opacity'
              )}
            >
              <Play className="w-3 h-3" />
              Start
            </button>
          ) : (
            <>
              {session.status === 'paused' ? (
                <button
                  onClick={onResume}
                  className={cn(
                    'flex items-center justify-center w-8 h-8 rounded-lg',
                    'text-[var(--color-text-secondary)]',
                    'hover:bg-[var(--color-bg-secondary)] transition-colors'
                  )}
                  title="Resume"
                >
                  <Play className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={onPause}
                  className={cn(
                    'flex items-center justify-center w-8 h-8 rounded-lg',
                    'text-[var(--color-text-secondary)]',
                    'hover:bg-[var(--color-bg-secondary)] transition-colors'
                  )}
                  title="Pause"
                >
                  <Pause className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={onStop}
                className={cn(
                  'flex items-center justify-center w-8 h-8 rounded-lg',
                  'text-red-500',
                  'hover:bg-[var(--color-bg-secondary)] transition-colors'
                )}
                title="Stop"
              >
                <Square className="w-4 h-4" />
              </button>
            </>
          )}

          {/* Settings button with popover */}
          <div className="relative">
            <button
              ref={buttonRef}
              onClick={() => setShowSettings(!showSettings)}
              className={cn(
                'flex items-center justify-center w-8 h-8 rounded-lg',
                'text-[var(--color-text-secondary)]',
                'hover:bg-[var(--color-bg-secondary)] transition-colors',
                showSettings && 'bg-[var(--color-bg-secondary)]'
              )}
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Settings popover */}
            {showSettings && (
              <div
                ref={settingsRef}
                className="absolute right-0 top-full mt-2 z-50"
              >
                <QuickSettings
                  settings={settings}
                  onUpdateSetting={onUpdateSetting}
                  onToggleSetting={onToggleSetting}
                  onReset={onResetSettings}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
