// =============================================================================
// CREATE WILDCARD VARIABLE MODAL
// =============================================================================
// Modal form for creating/editing wildcard (random selection) variables.

import React, { useState, useEffect } from 'react'
import { X, Shuffle, Plus, Trash2 } from 'lucide-react'
import { Select } from '../../atoms/Select'
import { useVariables } from '../../../hooks/useVariables'
import type { WildcardVariable } from '../../../types/variables'

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface CreateWildcardVariableModalProps {
  isOpen: boolean
  onClose: () => void
  editVariable?: WildcardVariable
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function CreateWildcardVariableModal({
  isOpen,
  onClose,
  editVariable
}: CreateWildcardVariableModalProps) {
  const { createWildcardVariable, updateVariable, checkNameExists } = useVariables()

  const [name, setName] = useState('')
  const [options, setOptions] = useState<string[]>([''])
  const [description, setDescription] = useState('')
  const [allowDuplicates, setAllowDuplicates] = useState(true)
  const [cacheDuration, setCacheDuration] = useState(0)
  const [nameError, setNameError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const isEditing = !!editVariable

  // Populate form when editing
  useEffect(() => {
    if (editVariable) {
      setName(editVariable.name)
      setOptions(editVariable.options.length > 0 ? editVariable.options : [''])
      setDescription(editVariable.description || '')
      setAllowDuplicates(editVariable.allowDuplicates ?? true)
      setCacheDuration(editVariable.cacheDuration || 0)
    } else {
      setName('')
      setOptions([''])
      setDescription('')
      setAllowDuplicates(true)
      setCacheDuration(0)
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

  const addOption = () => {
    setOptions([...options, ''])
  }

  const removeOption = (index: number) => {
    if (options.length > 1) {
      setOptions(options.filter((_, i) => i !== index))
    }
  }

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options]
    newOptions[index] = value
    setOptions(newOptions)
  }

  const handleSubmit = async () => {
    if (!await validateName(name)) return

    const validOptions = options.filter(o => o.trim())
    if (validOptions.length === 0) {
      setNameError('At least one option is required')
      return
    }

    setSaving(true)
    try {
      if (isEditing && editVariable) {
        await updateVariable({
          id: editVariable.id,
          name,
          options: validOptions,
          description: description || undefined,
          allowDuplicates,
          cacheDuration: cacheDuration > 0 ? cacheDuration : undefined
        })
      } else {
        await createWildcardVariable({
          name,
          options: validOptions,
          description: description || undefined,
          allowDuplicates,
          cacheDuration: cacheDuration > 0 ? cacheDuration : undefined
        })
      }
      onClose()
    } catch (e) {
      setNameError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const validOptionsCount = options.filter(o => o.trim()).length

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
          width: '520px',
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
              <Shuffle size={16} />
            </div>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--color-text)' }}>
              {isEditing ? 'Edit Wildcard Variable' : 'Create Wildcard Variable'}
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
        <div style={{ padding: '20px', overflow: 'auto', flex: 1 }}>
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
              placeholder="random_greeting"
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
          </div>

          {/* Options */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label
                style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  color: 'var(--color-text)'
                }}
              >
                Options ({validOptionsCount})
              </label>
              <button
                onClick={addOption}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 8px',
                  fontSize: '12px',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--color-accent-subtle)',
                  color: 'var(--color-accent)',
                  cursor: 'pointer'
                }}
              >
                <Plus size={12} />
                Add
              </button>
            </div>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              maxHeight: '200px',
              overflow: 'auto'
            }}>
              {options.map((option, index) => (
                <div key={index} style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={option}
                    onChange={e => updateOption(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      fontSize: '13px',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--color-bg)',
                      color: 'var(--color-text)',
                      outline: 'none'
                    }}
                  />
                  <button
                    onClick={() => removeOption(index)}
                    disabled={options.length === 1}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '32px',
                      height: '32px',
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'transparent',
                      color: options.length === 1 ? 'var(--color-text-tertiary)' : 'var(--color-error)',
                      cursor: options.length === 1 ? 'not-allowed' : 'pointer',
                      opacity: options.length === 1 ? 0.5 : 1
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
            <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
              One option will be randomly selected when the variable is expanded
            </p>
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

          {/* Settings Row */}
          <div style={{ display: 'flex', gap: '16px' }}>
            {/* Allow Duplicates */}
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
                color: 'var(--color-text)',
                cursor: 'pointer'
              }}
            >
              <input
                type="checkbox"
                checked={allowDuplicates}
                onChange={e => setAllowDuplicates(e.target.checked)}
                style={{
                  width: '16px',
                  height: '16px',
                  cursor: 'pointer',
                  accentColor: 'var(--color-accent)'
                }}
              />
              Allow consecutive duplicates
            </label>

            {/* Cache Duration */}
            <div style={{ flex: 1 }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '13px',
                  color: 'var(--color-text)'
                }}
              >
                Cache for:
                <Select
                  value={String(cacheDuration)}
                  onChange={v => setCacheDuration(Number(v))}
                  size="sm"
                  options={[
                    { value: '0', label: 'No caching' },
                    { value: '60000', label: '1 minute' },
                    { value: '300000', label: '5 minutes' },
                    { value: '900000', label: '15 minutes' },
                    { value: '3600000', label: '1 hour' }
                  ]}
                />
              </label>
            </div>
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
            disabled={saving || !name.trim() || validOptionsCount === 0}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-accent)',
              color: 'white',
              cursor: saving || !name.trim() || validOptionsCount === 0 ? 'not-allowed' : 'pointer',
              opacity: saving || !name.trim() || validOptionsCount === 0 ? 0.6 : 1
            }}
          >
            {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Variable'}
          </button>
        </div>
      </div>
    </div>
  )
}
