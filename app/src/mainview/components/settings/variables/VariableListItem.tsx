// =============================================================================
// VARIABLE LIST ITEM
// =============================================================================
// Individual variable display component with toggle, edit, and delete actions.

import React from 'react'
import { Edit2, Trash2, FileText, Shuffle, Globe, Code2 } from 'lucide-react'
import type { AnyVariable, VariableType } from '../../../types/variables'

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface VariableListItemProps {
  variable: AnyVariable
  onToggle: (id: string, enabled: boolean) => void
  onEdit: (variable: AnyVariable) => void
  onDelete: (id: string) => void
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function VariableListItem({
  variable,
  onToggle,
  onEdit,
  onDelete
}: VariableListItemProps) {
  const Icon = getTypeIcon(variable.type)
  const typeLabel = getTypeLabel(variable.type)
  const preview = getPreview(variable)

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '16px 20px',
        borderBottom: '1px solid var(--color-border)',
        opacity: variable.isEnabled ? 1 : 0.6
      }}
    >
      {/* Toggle */}
      <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={variable.isEnabled}
          onChange={e => onToggle(variable.id, e.target.checked)}
          style={{
            width: '18px',
            height: '18px',
            cursor: 'pointer',
            accentColor: 'var(--color-accent)'
          }}
        />
      </label>

      {/* Icon */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '32px',
          height: '32px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: variable.isEnabled ? 'var(--color-accent-subtle)' : 'var(--color-bg-tertiary)',
          color: variable.isEnabled ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
          flexShrink: 0
        }}
      >
        <Icon size={16} />
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <code
            style={{
              fontSize: '13px',
              fontFamily: 'monospace',
              fontWeight: 500,
              color: variable.isEnabled ? 'var(--color-text)' : 'var(--color-text-secondary)'
            }}
          >
            {`{{${variable.name}}}`}
          </code>
          <span
            style={{
              fontSize: '10px',
              padding: '2px 6px',
              borderRadius: '4px',
              backgroundColor: 'var(--color-bg-tertiary)',
              color: 'var(--color-text-tertiary)',
              textTransform: 'uppercase',
              fontWeight: 500
            }}
          >
            {typeLabel}
          </span>
        </div>
        {variable.description && (
          <p
            style={{
              margin: '4px 0 0 0',
              fontSize: '12px',
              color: 'var(--color-text-secondary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {variable.description}
          </p>
        )}
        {preview && (
          <p
            style={{
              margin: '4px 0 0 0',
              fontSize: '11px',
              color: 'var(--color-text-tertiary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontFamily: 'monospace'
            }}
          >
            {preview}
          </p>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '4px' }}>
        <ActionButton
          icon={<Edit2 size={14} />}
          onClick={() => onEdit(variable)}
          title="Edit variable"
        />
        <ActionButton
          icon={<Trash2 size={14} />}
          onClick={() => onDelete(variable.id)}
          title="Delete variable"
          danger
        />
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function getTypeIcon(type: VariableType) {
  switch (type) {
    case 'app-level':
      return FileText
    case 'wildcard':
      return Shuffle
    case 'rest-api':
      return Globe
    case 'javascript':
      return Code2
    default:
      return FileText
  }
}

function getTypeLabel(type: VariableType): string {
  switch (type) {
    case 'app-level':
      return 'Text'
    case 'wildcard':
      return 'Wildcard'
    case 'rest-api':
      return 'API'
    case 'javascript':
      return 'JS'
    default:
      return type
  }
}

function getPreview(variable: AnyVariable): string | null {
  switch (variable.type) {
    case 'app-level':
      const value = variable.value
      if (value.length > 60) {
        return `"${value.substring(0, 60)}..."`
      }
      return `"${value}"`

    case 'wildcard':
      const options = variable.options
      if (options.length <= 3) {
        return options.join(' | ')
      }
      return `${options.slice(0, 3).join(' | ')} (+${options.length - 3} more)`

    case 'rest-api':
      return `${variable.requestConfig.method} ${variable.requestConfig.url}`

    case 'javascript':
      const code = variable.code.split('\n')[0]
      if (code.length > 50) {
        return code.substring(0, 50) + '...'
      }
      return code

    default:
      return null
  }
}

// -----------------------------------------------------------------------------
// Sub-Components
// -----------------------------------------------------------------------------

interface ActionButtonProps {
  icon: React.ReactNode
  onClick: () => void
  title: string
  danger?: boolean
}

function ActionButton({ icon, onClick, title, danger }: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '28px',
        height: '28px',
        border: 'none',
        borderRadius: 'var(--radius-sm)',
        backgroundColor: 'transparent',
        color: danger ? 'var(--color-error)' : 'var(--color-text-tertiary)',
        cursor: 'pointer',
        transition: 'all 0.15s ease'
      }}
      onMouseEnter={e => {
        e.currentTarget.style.backgroundColor = danger
          ? 'var(--color-error-subtle)'
          : 'var(--color-bg-tertiary)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.backgroundColor = 'transparent'
      }}
    >
      {icon}
    </button>
  )
}
