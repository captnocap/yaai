// =============================================================================
// VARIABLE BLOCK
// =============================================================================
// Individual variable block showing expansion state (loading, resolved, error).

import React from 'react'
import { RefreshCw, X, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type VariableBlockStatus = 'loading' | 'resolved' | 'error'

export interface VariableBlockProps {
  name: string
  status: VariableBlockStatus
  value?: string
  error?: string
  onRefresh: () => void
  onRemove: () => void
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function VariableBlock({
  name,
  status,
  value,
  error,
  onRefresh,
  onRemove
}: VariableBlockProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 10px',
        backgroundColor: status === 'error'
          ? 'var(--color-error-subtle)'
          : status === 'resolved'
            ? 'var(--color-success-subtle)'
            : 'var(--color-bg-tertiary)',
        border: `1px solid ${
          status === 'error'
            ? 'var(--color-error)'
            : status === 'resolved'
              ? 'var(--color-success)'
              : 'var(--color-border)'
        }`,
        borderRadius: 'var(--radius-md)',
        fontSize: '12px',
        maxWidth: '300px'
      }}
    >
      {/* Status Icon */}
      <div style={{ flexShrink: 0 }}>
        {status === 'loading' && (
          <Loader2
            size={14}
            style={{
              color: 'var(--color-text-tertiary)',
              animation: 'spin 1s linear infinite'
            }}
          />
        )}
        {status === 'resolved' && (
          <CheckCircle2
            size={14}
            style={{ color: 'var(--color-success)' }}
          />
        )}
        {status === 'error' && (
          <AlertCircle
            size={14}
            style={{ color: 'var(--color-error)' }}
          />
        )}
      </div>

      {/* Variable Name */}
      <span
        style={{
          fontFamily: 'monospace',
          fontWeight: 500,
          color: 'var(--color-text)',
          whiteSpace: 'nowrap'
        }}
      >
        {`{{${name}}}`}
      </span>

      {/* Value or Error */}
      {status === 'resolved' && value && (
        <span
          style={{
            color: 'var(--color-text-secondary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
            minWidth: 0
          }}
          title={value}
        >
          = {value.length > 30 ? `${value.substring(0, 30)}...` : value}
        </span>
      )}
      {status === 'error' && error && (
        <span
          style={{
            color: 'var(--color-error)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
            minWidth: 0
          }}
          title={error}
        >
          {error.length > 30 ? `${error.substring(0, 30)}...` : error}
        </span>
      )}
      {status === 'loading' && (
        <span style={{ color: 'var(--color-text-tertiary)' }}>
          Expanding...
        </span>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
        {/* Refresh (only when resolved or error) */}
        {status !== 'loading' && (
          <button
            onClick={onRefresh}
            title="Refresh"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '20px',
              height: '20px',
              padding: 0,
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'transparent',
              color: 'var(--color-text-tertiary)',
              cursor: 'pointer',
              transition: 'color 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--color-text)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--color-text-tertiary)'
            }}
          >
            <RefreshCw size={12} />
          </button>
        )}

        {/* Remove */}
        <button
          onClick={onRemove}
          title="Remove variable"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '20px',
            height: '20px',
            padding: 0,
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'transparent',
            color: 'var(--color-text-tertiary)',
            cursor: 'pointer',
            transition: 'color 0.15s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--color-error)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--color-text-tertiary)'
          }}
        >
          <X size={12} />
        </button>
      </div>
    </div>
  )
}
