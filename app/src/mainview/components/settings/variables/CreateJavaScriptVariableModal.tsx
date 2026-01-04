// =============================================================================
// CREATE JAVASCRIPT VARIABLE MODAL
// =============================================================================
// Modal form for creating/editing JavaScript (computed) variables.

import React, { useState, useEffect } from 'react'
import { X, Code2, AlertTriangle, Play } from 'lucide-react'
import { Select } from '../../atoms/Select'
import { useVariables } from '../../../hooks/useVariables'
import type { JavaScriptVariable } from '../../../types/variables'

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface CreateJavaScriptVariableModalProps {
  isOpen: boolean
  onClose: () => void
  editVariable?: JavaScriptVariable
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const EXAMPLE_CODE = `// Example: Generate a random ID
const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
let result = '';
for (let i = 0; i < 8; i++) {
  result += chars[Math.floor(Math.random() * chars.length)];
}
return result;`

const AVAILABLE_GLOBALS = [
  'Math', 'Date', 'String', 'Number', 'JSON', 'Array', 'Object',
  'Boolean', 'RegExp', 'Map', 'Set', 'parseInt', 'parseFloat',
  'isNaN', 'isFinite', 'encodeURI', 'decodeURI', 'console.log'
]

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function CreateJavaScriptVariableModal({
  isOpen,
  onClose,
  editVariable
}: CreateJavaScriptVariableModalProps) {
  const { createJavaScriptVariable, updateVariable, checkNameExists, expandVariables } = useVariables()

  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [timeout, setTimeout] = useState(5000)
  const [nameError, setNameError] = useState<string | null>(null)
  const [codeError, setCodeError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; value?: string; error?: string } | null>(null)

  const isEditing = !!editVariable

  // Populate form when editing
  useEffect(() => {
    if (editVariable) {
      setName(editVariable.name)
      setCode(editVariable.code)
      setDescription(editVariable.description || '')
      setTimeout(editVariable.timeout || 5000)
    } else {
      setName('')
      setCode('')
      setDescription('')
      setTimeout(5000)
    }
    setNameError(null)
    setCodeError(null)
    setTestResult(null)
  }, [editVariable, isOpen])

  if (!isOpen) return null

  const validateName = async (name: string): Promise<boolean> => {
    if (!name.trim()) {
      setNameError('Name is required')
      return false
    }

    if (!/^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(name)) {
      setNameError('Name must start with a letter or underscore')
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

  const handleTest = async () => {
    if (!name.trim() || !code.trim()) return

    setTesting(true)
    setTestResult(null)

    try {
      // Create temporary variable and expand it
      const results = await expandVariables([name])
      const result = results.find(r => r.variable === name)

      if (result?.error) {
        setTestResult({ success: false, error: result.error })
      } else {
        setTestResult({ success: true, value: result?.data || '(empty)' })
      }
    } catch (e) {
      setTestResult({ success: false, error: (e as Error).message })
    } finally {
      setTesting(false)
    }
  }

  const handleSubmit = async () => {
    if (!await validateName(name)) return

    if (!code.trim()) {
      setCodeError('Code is required')
      return
    }

    setSaving(true)
    try {
      if (isEditing && editVariable) {
        await updateVariable({
          id: editVariable.id,
          name,
          code,
          description: description || undefined,
          timeout
        })
      } else {
        await createJavaScriptVariable({
          name,
          code,
          description: description || undefined,
          timeout
        })
      }
      onClose()
    } catch (e) {
      setCodeError((e as Error).message)
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
          width: '600px',
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
              <Code2 size={16} />
            </div>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--color-text)' }}>
              {isEditing ? 'Edit JavaScript Variable' : 'Create JavaScript Variable'}
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
          {/* Security Warning */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              padding: '12px',
              marginBottom: '16px',
              backgroundColor: 'var(--color-warning-subtle)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-warning)'
            }}
          >
            <AlertTriangle size={16} style={{ color: 'var(--color-warning)', flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
              <p style={{ margin: '0 0 4px 0', fontWeight: 500 }}>Sandboxed Execution</p>
              <p style={{ margin: 0 }}>
                Code runs in a restricted environment with limited APIs. Network, filesystem, and process access are blocked.
              </p>
            </div>
          </div>

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
              placeholder="computed_value"
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

          {/* Code Field */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label
                style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  color: 'var(--color-text)'
                }}
              >
                JavaScript Code
              </label>
              <button
                onClick={() => setCode(EXAMPLE_CODE)}
                style={{
                  padding: '2px 8px',
                  fontSize: '11px',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--color-bg-tertiary)',
                  color: 'var(--color-text-tertiary)',
                  cursor: 'pointer'
                }}
              >
                Load Example
              </button>
            </div>
            <textarea
              value={code}
              onChange={e => {
                setCode(e.target.value)
                setCodeError(null)
                setTestResult(null)
              }}
              placeholder="// Your code here. Return a string value.&#10;return 'Hello World';"
              rows={10}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '13px',
                fontFamily: 'monospace',
                lineHeight: '1.5',
                border: `1px solid ${codeError ? 'var(--color-error)' : 'var(--color-border)'}`,
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-bg)',
                color: 'var(--color-text)',
                outline: 'none',
                resize: 'vertical',
                boxSizing: 'border-box'
              }}
            />
            {codeError && (
              <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: 'var(--color-error)' }}>
                {codeError}
              </p>
            )}
            <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
              Available: {AVAILABLE_GLOBALS.join(', ')}
            </p>
          </div>

          {/* Test Result */}
          {testResult && (
            <div
              style={{
                padding: '12px',
                marginBottom: '16px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: testResult.success ? 'var(--color-success-subtle)' : 'var(--color-error-subtle)',
                border: `1px solid ${testResult.success ? 'var(--color-success)' : 'var(--color-error)'}`,
                fontFamily: 'monospace',
                fontSize: '12px'
              }}
            >
              {testResult.success ? (
                <div>
                  <span style={{ color: 'var(--color-success)', fontWeight: 500 }}>Result: </span>
                  <span style={{ color: 'var(--color-text)' }}>{testResult.value}</span>
                </div>
              ) : (
                <div style={{ color: 'var(--color-error)' }}>
                  Error: {testResult.error}
                </div>
              )}
            </div>
          )}

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
              placeholder="What does this code compute?"
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

          {/* Timeout */}
          <div>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
                color: 'var(--color-text)'
              }}
            >
              Timeout:
              <Select
                value={String(timeout)}
                onChange={v => setTimeout(Number(v))}
                size="sm"
                options={[
                  { value: '1000', label: '1 second' },
                  { value: '5000', label: '5 seconds' },
                  { value: '10000', label: '10 seconds' },
                  { value: '15000', label: '15 seconds' }
                ]}
              />
            </label>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderTop: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-bg-secondary)'
          }}
        >
          <button
            onClick={handleTest}
            disabled={testing || !name.trim() || !code.trim() || !isEditing}
            title={!isEditing ? 'Save the variable first to test it' : 'Run the code and see the result'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              fontSize: '13px',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'transparent',
              color: 'var(--color-text)',
              cursor: testing || !isEditing ? 'not-allowed' : 'pointer',
              opacity: testing || !isEditing ? 0.6 : 1
            }}
          >
            <Play size={14} />
            {testing ? 'Running...' : 'Test'}
          </button>

          <div style={{ display: 'flex', gap: '8px' }}>
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
              disabled={saving || !name.trim() || !code.trim()}
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-accent)',
                color: 'white',
                cursor: saving || !name.trim() || !code.trim() ? 'not-allowed' : 'pointer',
                opacity: saving || !name.trim() || !code.trim() ? 0.6 : 1
              }}
            >
              {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Variable'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
