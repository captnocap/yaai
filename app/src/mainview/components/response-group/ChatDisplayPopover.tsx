import React from 'react'
import * as Popover from '@radix-ui/react-popover'
import { Type, RotateCcw } from 'lucide-react'
import { cn } from '../../lib'
import { useChatDisplay, type FontSize, type FontFamily, type LineHeight } from './ChatDisplayContext'

// ============================================
// Types
// ============================================

interface SegmentedControlProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string }[]
}

// ============================================
// Segmented Control Component
// ============================================

function SegmentedControl<T extends string>({ value, onChange, options }: SegmentedControlProps<T>) {
  return (
    <div className="flex rounded-lg bg-[var(--color-bg-tertiary)] p-1 gap-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all',
            value === option.value
              ? 'bg-[var(--color-bg-elevated)] text-[var(--color-text)] shadow-sm'
              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

// ============================================
// Radio Group Component
// ============================================

interface RadioGroupProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string; description?: string }[]
}

function RadioGroup<T extends string>({ value, onChange, options }: RadioGroupProps<T>) {
  return (
    <div className="space-y-1">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left',
            value === option.value
              ? 'bg-[var(--color-accent-subtle)]'
              : 'hover:bg-[var(--color-bg-tertiary)]'
          )}
        >
          <div
            className={cn(
              'w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors',
              value === option.value
                ? 'border-[var(--color-accent)]'
                : 'border-[var(--color-border-strong)]'
            )}
          >
            {value === option.value && (
              <div className="w-2 h-2 rounded-full bg-[var(--color-accent)]" />
            )}
          </div>
          <div>
            <div className={cn(
              'text-sm',
              value === option.value
                ? 'text-[var(--color-text)] font-medium'
                : 'text-[var(--color-text-secondary)]'
            )}>
              {option.label}
            </div>
            {option.description && (
              <div className="text-xs text-[var(--color-text-tertiary)]">
                {option.description}
              </div>
            )}
          </div>
        </button>
      ))}
    </div>
  )
}

// ============================================
// Main Popover Component
// ============================================

interface ChatDisplayPopoverProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ChatDisplayPopover({ open, onOpenChange }: ChatDisplayPopoverProps) {
  const { settings, setFontSize, setFontFamily, setLineHeight, resetSettings } = useChatDisplay()

  const fontSizeOptions: { value: FontSize; label: string }[] = [
    { value: 'xs', label: 'XS' },
    { value: 'sm', label: 'SM' },
    { value: 'md', label: 'MD' },
    { value: 'lg', label: 'LG' },
    { value: 'xl', label: 'XL' },
  ]

  const fontFamilyOptions: { value: FontFamily; label: string; description?: string }[] = [
    { value: 'system', label: 'System', description: 'Default system font' },
    { value: 'mono', label: 'Monospace', description: 'Fixed-width coding font' },
    { value: 'serif', label: 'Serif', description: 'Traditional reading font' },
  ]

  const lineHeightOptions: { value: LineHeight; label: string }[] = [
    { value: 'compact', label: 'Compact' },
    { value: 'normal', label: 'Normal' },
    { value: 'relaxed', label: 'Relaxed' },
  ]

  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger asChild>
        <button
          title="Chat Display Settings"
          className={cn(
            'p-1 rounded transition-colors',
            open
              ? 'bg-[var(--color-accent-subtle)] text-[var(--color-accent)]'
              : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-elevated)]'
          )}
        >
          <Type size={14} />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          className="z-50 w-72 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-xl shadow-xl p-4 animate-in fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2"
          sideOffset={8}
          side="top"
          align="end"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[var(--color-text)]">
              Display Settings
            </h3>
            <button
              onClick={resetSettings}
              className="flex items-center gap-1.5 text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text)] transition-colors"
              title="Reset to defaults"
            >
              <RotateCcw size={12} />
              Reset
            </button>
          </div>

          {/* Font Size */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-2">
              Font Size
            </label>
            <SegmentedControl
              value={settings.fontSize}
              onChange={setFontSize}
              options={fontSizeOptions}
            />
          </div>

          {/* Font Family */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-2">
              Font Family
            </label>
            <RadioGroup
              value={settings.fontFamily}
              onChange={setFontFamily}
              options={fontFamilyOptions}
            />
          </div>

          {/* Line Height */}
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-2">
              Line Spacing
            </label>
            <SegmentedControl
              value={settings.lineHeight}
              onChange={setLineHeight}
              options={lineHeightOptions}
            />
          </div>

          {/* Arrow */}
          <Popover.Arrow className="fill-[var(--color-bg-elevated)]" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
