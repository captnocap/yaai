import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../../../lib';
import {
  Volume2,
  VolumeX,
  Bell,
  BellOff,
  Type,
  AlignLeft,
  Hash,
  WrapText,
  ArrowDown,
  AlertCircle,
  Eye,
  EyeOff,
  Layers,
  Sun,
  Moon,
  Monitor,
  RotateCcw,
  ChevronDown,
} from 'lucide-react';
import type { CodeSettings, FontSizeOption, LineHeightOption, EditorThemeOption } from '../../../types/code-settings';

export interface QuickSettingsProps {
  settings: CodeSettings;
  onUpdateSetting: <K extends keyof CodeSettings>(key: K, value: CodeSettings[K]) => void;
  onToggleSetting: (key: keyof CodeSettings) => void;
  onReset: () => void;
  className?: string;
}

export function QuickSettings({
  settings,
  onUpdateSetting,
  onToggleSetting,
  onReset,
  className,
}: QuickSettingsProps) {
  return (
    <div className={cn(
      'w-72 p-3',
      'bg-[var(--color-bg)]',
      'border border-[var(--color-border)]',
      'rounded-lg shadow-lg',
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-[var(--color-border)]">
        <span className="text-sm font-medium text-[var(--color-text)]">Quick Settings</span>
        <button
          onClick={onReset}
          className="text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text)] flex items-center gap-1"
          title="Reset to defaults"
        >
          <RotateCcw className="w-3 h-3" />
          Reset
        </button>
      </div>

      {/* Notifications Section */}
      <SettingsSection title="Notifications">
        <ToggleRow
          icon={settings.soundOnComplete ? Volume2 : VolumeX}
          label="Sound on complete"
          enabled={settings.soundOnComplete}
          onToggle={() => onToggleSetting('soundOnComplete')}
        />
        <ToggleRow
          icon={settings.soundOnPrompt ? Bell : BellOff}
          label="Sound on prompt"
          enabled={settings.soundOnPrompt}
          onToggle={() => onToggleSetting('soundOnPrompt')}
        />
        <ToggleRow
          icon={Bell}
          label="Desktop notifications"
          enabled={settings.desktopNotifications}
          onToggle={() => onToggleSetting('desktopNotifications')}
        />
      </SettingsSection>

      {/* Display Section */}
      <SettingsSection title="Display">
        <SelectRow
          icon={Type}
          label="Font size"
          value={settings.fontSize}
          options={[
            { value: 'xs', label: 'Extra Small' },
            { value: 'sm', label: 'Small' },
            { value: 'md', label: 'Medium' },
            { value: 'lg', label: 'Large' },
            { value: 'xl', label: 'Extra Large' },
          ]}
          onChange={(value) => onUpdateSetting('fontSize', value as FontSizeOption)}
        />
        <SelectRow
          icon={AlignLeft}
          label="Line height"
          value={settings.lineHeight}
          options={[
            { value: 'compact', label: 'Compact' },
            { value: 'normal', label: 'Normal' },
            { value: 'relaxed', label: 'Relaxed' },
          ]}
          onChange={(value) => onUpdateSetting('lineHeight', value as LineHeightOption)}
        />
        <ToggleRow
          icon={Hash}
          label="Line numbers"
          enabled={settings.showLineNumbers}
          onToggle={() => onToggleSetting('showLineNumbers')}
        />
        <ToggleRow
          icon={WrapText}
          label="Word wrap"
          enabled={settings.wordWrap}
          onToggle={() => onToggleSetting('wordWrap')}
        />
      </SettingsSection>

      {/* Behavior Section */}
      <SettingsSection title="Behavior">
        <ToggleRow
          icon={ArrowDown}
          label="Auto-scroll"
          enabled={settings.autoScroll}
          onToggle={() => onToggleSetting('autoScroll')}
        />
        <ToggleRow
          icon={AlertCircle}
          label="Confirm before stop"
          enabled={settings.confirmBeforeStop}
          onToggle={() => onToggleSetting('confirmBeforeStop')}
        />
        <ToggleRow
          icon={settings.showToolCalls ? Eye : EyeOff}
          label="Show tool calls"
          enabled={settings.showToolCalls}
          onToggle={() => onToggleSetting('showToolCalls')}
        />
        <ToggleRow
          icon={Layers}
          label="Collapse compacted"
          enabled={settings.collapseCompactedMessages}
          onToggle={() => onToggleSetting('collapseCompactedMessages')}
        />
      </SettingsSection>

      {/* Theme Section */}
      <SettingsSection title="Editor Theme" noBorder>
        <div className="flex gap-1">
          <ThemeButton
            icon={Monitor}
            label="Auto"
            active={settings.editorTheme === 'auto'}
            onClick={() => onUpdateSetting('editorTheme', 'auto')}
          />
          <ThemeButton
            icon={Sun}
            label="Light"
            active={settings.editorTheme === 'light'}
            onClick={() => onUpdateSetting('editorTheme', 'light')}
          />
          <ThemeButton
            icon={Moon}
            label="Dark"
            active={settings.editorTheme === 'dark'}
            onClick={() => onUpdateSetting('editorTheme', 'dark')}
          />
        </div>
      </SettingsSection>
    </div>
  );
}

// Section wrapper
function SettingsSection({
  title,
  children,
  noBorder = false,
}: {
  title: string;
  children: React.ReactNode;
  noBorder?: boolean;
}) {
  return (
    <div className={cn(
      'py-2',
      !noBorder && 'border-b border-[var(--color-border)]'
    )}>
      <h4 className="text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider mb-2">
        {title}
      </h4>
      <div className="space-y-1">
        {children}
      </div>
    </div>
  );
}

// Toggle row component
function ToggleRow({
  icon: Icon,
  label,
  enabled,
  onToggle,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        'w-full flex items-center justify-between py-1.5 px-2 rounded',
        'hover:bg-[var(--color-bg-secondary)] transition-colors',
        'text-left'
      )}
    >
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-[var(--color-text-secondary)]" />
        <span className="text-sm text-[var(--color-text)]">{label}</span>
      </div>
      <div className={cn(
        'w-8 h-4 rounded-full transition-colors relative',
        enabled ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-bg-tertiary)]'
      )}>
        <div className={cn(
          'absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform',
          enabled ? 'translate-x-4' : 'translate-x-0.5'
        )} />
      </div>
    </button>
  );
}

// Select row component
function SelectRow({
  icon: Icon,
  label,
  value,
  options,
  onChange,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.value === value);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center justify-between py-1.5 px-2 rounded',
          'hover:bg-[var(--color-bg-secondary)] transition-colors',
          'text-left'
        )}
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-[var(--color-text-secondary)]" />
          <span className="text-sm text-[var(--color-text)]">{label}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-[var(--color-text-secondary)]">
          <span>{selectedOption?.label}</span>
          <ChevronDown className={cn('w-3 h-3 transition-transform', isOpen && 'rotate-180')} />
        </div>
      </button>

      {isOpen && (
        <div className={cn(
          'absolute right-0 top-full mt-1 z-10',
          'min-w-[120px] py-1',
          'bg-[var(--color-bg)]',
          'border border-[var(--color-border)]',
          'rounded-md shadow-lg'
        )}>
          {options.map(option => (
            <button
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={cn(
                'w-full px-3 py-1.5 text-left text-sm',
                'hover:bg-[var(--color-bg-secondary)]',
                option.value === value && 'text-[var(--color-accent)]'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Theme button component
function ThemeButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-1 flex flex-col items-center gap-1 py-2 rounded',
        'transition-colors',
        active
          ? 'bg-[var(--color-accent)] text-white'
          : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]'
      )}
    >
      <Icon className="w-4 h-4" />
      <span className="text-xs">{label}</span>
    </button>
  );
}
