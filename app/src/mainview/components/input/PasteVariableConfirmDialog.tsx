// =============================================================================
// PASTE VARIABLE CONFIRM DIALOG
// =============================================================================
// Confirmation dialog shown when user pastes text containing {{variables}}.
// Allows user to choose: process variables, paste as plain text, or cancel.

import React from 'react'
import { AlertTriangle, Braces, FileText, X } from 'lucide-react'
import { getUniqueVariableNames } from '../../lib/variable-syntax'

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface PasteVariableConfirmDialogProps {
  isOpen: boolean
  pastedText: string
  onConfirm: (processVariables: boolean) => void
  onCancel: () => void
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function PasteVariableConfirmDialog({
  isOpen,
  pastedText,
  onConfirm,
  onCancel
}: PasteVariableConfirmDialogProps) {
  if (!isOpen) return null

  const variableNames = getUniqueVariableNames(pastedText)
  const previewText = pastedText.length > 200
    ? pastedText.substring(0, 200) + '...'
    : pastedText

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(4px)'
      }}
      onClick={onCancel}
    >
      <div
        style={{
          width: '480px',
          maxHeight: '90vh',
          backgroundColor: 'var(--color-bg-elevated)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          border: '1px solid var(--color-border)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid var(--color-border)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-warning-subtle)',
                color: 'var(--color-warning)'
              }}
            >
              <AlertTriangle size={16} />
            </div>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--color-text)' }}>
              Variables Detected in Paste
            </h3>
          </div>
          <button
            onClick={onCancel}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'transparent',
              color: 'var(--color-text-tertiary)',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px', overflow: 'auto', flex: 1 }}>
          <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
            The pasted text contains {variableNames.length} variable{variableNames.length !== 1 ? 's' : ''}.
            How would you like to handle them?
          </p>

          {/* Variables Found */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '6px',
              marginBottom: '16px'
            }}
          >
            {variableNames.map(name => (
              <span
                key={name}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 8px',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  backgroundColor: 'var(--color-accent-subtle)',
                  color: 'var(--color-accent)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-accent)'
                }}
              >
                <Braces size={12} />
                {`{{${name}}}`}
              </span>
            ))}
          </div>

          {/* Preview */}
          <div
            style={{
              padding: '12px',
              backgroundColor: 'var(--color-bg-tertiary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              fontSize: '12px',
              fontFamily: 'monospace',
              color: 'var(--color-text-secondary)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              maxHeight: '150px',
              overflow: 'auto'
            }}
          >
            {previewText}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '8px',
            padding: '16px 20px',
            borderTop: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-bg-secondary)'
          }}
        >
          <button
            onClick={onCancel}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'transparent',
              color: 'var(--color-text)',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(false)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              fontSize: '13px',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-bg-tertiary)',
              color: 'var(--color-text)',
              cursor: 'pointer'
            }}
          >
            <FileText size={14} />
            Paste as Plain Text
          </button>
          <button
            onClick={() => onConfirm(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              fontSize: '13px',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-accent)',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            <Braces size={14} />
            Process Variables
          </button>
        </div>
      </div>
    </div>
  )
}
