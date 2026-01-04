// =============================================================================
// CREATE APP VARIABLE MODAL
// =============================================================================
// Modal form for creating/editing app-level (simple text) variables.

import React, { useState, useEffect } from 'react'
import { X, FileText } from 'lucide-react'
import { useVariables } from '../../../hooks/useVariables'
import type { AppLevelVariable } from '../../../types/variables'

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface CreateAppVariableModalProps {
  isOpen: boolean
  onClose: () => void
  editVariable?: AppLevelVariable
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function CreateAppVariableModal({
  isOpen,
  onClose,
  editVariable
}: CreateAppVariableModalProps) {
  const { createAppVariable, updateVariable, checkNameExists } = useVariables()

  const [name, setName] = useState('')
  const [value, setValue] = useState('')
  const [description, setDescription] = useState('')
  const [nameError, setNameError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const isEditing = !!editVariable

  // Populate form when editing
  useEffect(() => {
    if (editVariable) {
      setName(editVariable.name)
      setValue(editVariable.value)
      setDescription(editVariable.description || '')
    } else {
      setName('')
      setValue('')
      setDescription('')
    }
    setNameError(null)
  }, [editVariable, isOpen])

  if (!isOpen) return null

  const validateName = async (name: string): Promise<boolean> => {
    if (!name.trim()) {
      setNameError('Name is required')
      return false
    }

    if (!/^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(name)) {
      setNameError('Name must start with a letter or underscore, and contain only letters, numbers, underscores, and hyphens')
      return false
    }

    if (name.length > 50) {
      setNameError('Name must be 50 characters or less')
      return false
    }

    // Check for conflicts (skip if editing same variable)
    if (!isEditing || name !== editVariable?.name) {
      const exists = await checkNameExists(name)
      if (exists) {
        setNameError('A variable with this name already exists')
        return false
      }
    }

    setNameError(null)
    return true
  }

  const handleSubmit = async () => {
    if (!await validateName(name)) return

    setSaving(true)
    try {
      if (isEditing && editVariable) {
        await updateVariable({
          id: editVariable.id,
          name,
          value,
          description: description || undefined
        })
      } else {
        await createAppVariable({
          name,
          value,
          description: description || undefined
        })
      }
      onClose()
    } catch (e) {
      setNameError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

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
      onClick={onClose}
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
                backgroundColor: 'var(--color-accent-subtle)',
                color: 'var(--color-accent)'
              }}
            >
              <FileText size={16} />
            </div>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--color-text)' }}>
              {isEditing ? 'Edit App Variable' : 'Create App Variable'}
            </h3>
          </div>
          <button
            onClick={onClose}
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
        <div style={{ padding: '20px', overflow: 'auto' }}>
          {/* Name Field */}
          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--color-text)'
              }}
            >
              Variable Name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => {
                setName(e.target.value)
                setNameError(null)
              }}
              placeholder="my_variable"
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: '13px',
                fontFamily: 'monospace',
                border: `1px solid ${nameError ? 'var(--color-error)' : 'var(--color-border)'}`,
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-bg)',
                color: 'var(--color-text)',
                outline: 'none',
                boxSizing: 'border-box'
              }}
              onBlur={() => name && validateName(name)}
            />
            {nameError && (
              <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: 'var(--color-error)' }}>
                {nameError}
              </p>
            )}
            <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
              Use in messages as <code style={{ fontFamily: 'monospace' }}>{`{{${name || 'name'}}}`}</code>
            </p>
          </div>

          {/* Value Field */}
          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--color-text)'
              }}
            >
              Value
            </label>
            <textarea
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder="Enter the variable value..."
              rows={4}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: '13px',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-bg)',
                color: 'var(--color-text)',
                outline: 'none',
                resize: 'vertical',
                fontFamily: 'inherit',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Description Field */}
          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--color-text)'
              }}
            >
              Description <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 400 }}>(optional)</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What is this variable for?"
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: '13px',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-bg)',
                color: 'var(--color-text)',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
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
            onClick={onClose}
            disabled={saving}
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
            onClick={handleSubmit}
            disabled={saving || !name.trim() || !value.trim()}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-accent)',
              color: 'white',
              cursor: saving || !name.trim() || !value.trim() ? 'not-allowed' : 'pointer',
              opacity: saving || !name.trim() || !value.trim() ? 0.6 : 1
            }}
          >
            {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Variable'}
          </button>
        </div>
      </div>
    </div>
  )
}
