// =============================================================================
// SELECT COMPONENT
// =============================================================================
// Custom dropdown select using Radix UI. Works reliably on Linux where native
// <select> elements have issues inside modals with backdrop-filter.

import React from 'react'
import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface SelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  disabled?: boolean
  className?: string
  triggerClassName?: string
  size?: 'sm' | 'md'
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function Select({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  disabled = false,
  className,
  triggerClassName,
  size = 'md'
}: SelectProps) {
  const selectedOption = options.find(o => o.value === value)

  const paddingY = size === 'sm' ? '6px' : '8px'
  const paddingX = size === 'sm' ? '10px' : '12px'
  const fontSize = size === 'sm' ? '12px' : '13px'

  return (
    <SelectPrimitive.Root value={value} onValueChange={onChange} disabled={disabled}>
      <SelectPrimitive.Trigger
        className={triggerClassName}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          padding: `${paddingY} ${paddingX}`,
          fontSize,
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--color-bg)',
          color: disabled ? 'var(--color-text-tertiary)' : 'var(--color-text)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          outline: 'none',
          minWidth: '120px',
          opacity: disabled ? 0.6 : 1,
          ...parseClassName(className)
        }}
      >
        <SelectPrimitive.Value placeholder={placeholder}>
          {selectedOption?.label || placeholder}
        </SelectPrimitive.Value>
        <SelectPrimitive.Icon>
          <ChevronDown size={14} style={{ color: 'var(--color-text-tertiary)' }} />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={4}
          style={{
            backgroundColor: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 10px 38px -10px rgba(0, 0, 0, 0.35), 0 10px 20px -15px rgba(0, 0, 0, 0.2)',
            overflow: 'hidden',
            zIndex: 1100,
            minWidth: 'var(--radix-select-trigger-width)',
            maxHeight: '300px'
          }}
        >
          <SelectPrimitive.Viewport
            style={{
              padding: '4px'
            }}
          >
            {options.map(option => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: `${paddingY} ${paddingX}`,
                  paddingLeft: '28px',
                  fontSize,
                  borderRadius: 'var(--radius-sm)',
                  color: option.disabled ? 'var(--color-text-tertiary)' : 'var(--color-text)',
                  cursor: option.disabled ? 'not-allowed' : 'pointer',
                  outline: 'none',
                  position: 'relative',
                  userSelect: 'none'
                }}
                onMouseEnter={e => {
                  if (!option.disabled) {
                    e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)'
                  }
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                <SelectPrimitive.ItemIndicator
                  style={{
                    position: 'absolute',
                    left: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Check size={14} style={{ color: 'var(--color-accent)' }} />
                </SelectPrimitive.ItemIndicator>
                <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}

// Helper to handle className as style overrides (simple version)
function parseClassName(className?: string): React.CSSProperties {
  if (!className) return {}
  // For now, just return empty - className can be used for external CSS
  return {}
}

// -----------------------------------------------------------------------------
// Convenience: Select with inline options
// -----------------------------------------------------------------------------

export interface SimpleSelectProps {
  value: string
  onChange: (value: string) => void
  children: React.ReactNode
  placeholder?: string
  disabled?: boolean
  size?: 'sm' | 'md'
}

export function SimpleSelect({
  value,
  onChange,
  children,
  placeholder,
  disabled,
  size = 'md'
}: SimpleSelectProps) {
  // Extract options from children
  const options: SelectOption[] = React.Children.toArray(children)
    .filter((child): child is React.ReactElement =>
      React.isValidElement(child) && child.type === 'option'
    )
    .map(child => ({
      value: child.props.value,
      label: child.props.children,
      disabled: child.props.disabled
    }))

  return (
    <Select
      value={value}
      onChange={onChange}
      options={options}
      placeholder={placeholder}
      disabled={disabled}
      size={size}
    />
  )
}
