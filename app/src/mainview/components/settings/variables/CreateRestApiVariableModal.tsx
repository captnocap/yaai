// =============================================================================
// CREATE REST API VARIABLE MODAL
// =============================================================================
// Multi-step wizard for creating REST API variables.
// Steps: 1) Request Config → 2) Test & Response → 3) Field Selector → 4) Save

import React, { useState, useEffect } from 'react'
import { X, Globe, ChevronRight, ChevronLeft, Play, Check, Plus, Trash2, AlertCircle } from 'lucide-react'
import { Select } from '../../atoms/Select'
import { useVariables } from '../../../hooks/useVariables'
import type { RestApiVariable, RestRequestConfig, ResponseParser, RestApiTestResult } from '../../../types/variables'

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface CreateRestApiVariableModalProps {
  isOpen: boolean
  onClose: () => void
  editVariable?: RestApiVariable
}

type Step = 1 | 2 | 3 | 4

interface HeaderEntry {
  key: string
  value: string
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function CreateRestApiVariableModal({
  isOpen,
  onClose,
  editVariable
}: CreateRestApiVariableModalProps) {
  const { createRestApiVariable, updateVariable, checkNameExists, testRestApi } = useVariables()

  // Step state
  const [step, setStep] = useState<Step>(1)

  // Step 1: Request config
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [method, setMethod] = useState<'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'>('GET')
  const [url, setUrl] = useState('')
  const [headers, setHeaders] = useState<HeaderEntry[]>([])
  const [body, setBody] = useState('')
  const [authType, setAuthType] = useState<'none' | 'bearer' | 'basic' | 'api-key'>('none')
  const [authValue, setAuthValue] = useState('')
  const [authKeyName, setAuthKeyName] = useState('X-API-Key')

  // Step 2: Test result
  const [testResult, setTestResult] = useState<RestApiTestResult | null>(null)
  const [testing, setTesting] = useState(false)

  // Step 3: Response parser
  const [parserType, setParserType] = useState<'text' | 'json-path' | 'regex'>('json-path')
  const [selector, setSelector] = useState('')
  const [defaultValue, setDefaultValue] = useState('')
  const [parsedPreview, setParsedPreview] = useState<string | null>(null)

  // Step 4: Options
  const [timeout, setTimeout] = useState(10000)
  const [retries, setRetries] = useState(1)
  const [cacheEnabled, setCacheEnabled] = useState(true)
  const [cacheDuration, setCacheDuration] = useState(300000) // 5 min

  // State
  const [nameError, setNameError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const isEditing = !!editVariable

  // Populate form when editing
  useEffect(() => {
    if (editVariable) {
      setName(editVariable.name)
      setDescription(editVariable.description || '')
      // Note: We don't have full requestConfig from sanitized response
      // This would need backend changes to return full config for editing
      setParserType(editVariable.responseParser.type)
      setSelector(editVariable.responseParser.selector)
      setDefaultValue(editVariable.responseParser.defaultValue || '')
      setTimeout(editVariable.timeout || 10000)
      setRetries(editVariable.retries || 1)
      setCacheEnabled(editVariable.cacheEnabled ?? true)
      setCacheDuration(editVariable.cacheDuration || 300000)
    } else {
      resetForm()
    }
  }, [editVariable, isOpen])

  const resetForm = () => {
    setStep(1)
    setName('')
    setDescription('')
    setMethod('GET')
    setUrl('')
    setHeaders([])
    setBody('')
    setAuthType('none')
    setAuthValue('')
    setAuthKeyName('X-API-Key')
    setTestResult(null)
    setParserType('json-path')
    setSelector('')
    setDefaultValue('')
    setParsedPreview(null)
    setTimeout(10000)
    setRetries(1)
    setCacheEnabled(true)
    setCacheDuration(300000)
    setNameError(null)
  }

  if (!isOpen) return null

  const validateName = async (): Promise<boolean> => {
    if (!name.trim()) {
      setNameError('Name is required')
      return false
    }

    if (!/^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(name)) {
      setNameError('Invalid name format')
      return false
    }

    if (!isEditing || name !== editVariable?.name) {
      const exists = await checkNameExists(name)
      if (exists) {
        setNameError('Name already exists')
        return false
      }
    }

    setNameError(null)
    return true
  }

  const buildRequestConfig = (): RestRequestConfig => {
    const config: RestRequestConfig = {
      method,
      url,
    }

    if (headers.length > 0) {
      config.headers = {}
      headers.forEach(h => {
        if (h.key.trim() && h.value.trim()) {
          config.headers![h.key] = h.value
        }
      })
    }

    if (body.trim() && method !== 'GET') {
      try {
        config.body = JSON.parse(body)
      } catch {
        config.body = body
      }
    }

    if (authType !== 'none' && authValue.trim()) {
      config.authentication = {
        type: authType,
        value: authValue,
        keyName: authType === 'api-key' ? authKeyName : undefined
      }
    }

    return config
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)

    try {
      const result = await testRestApi(buildRequestConfig(), timeout)
      setTestResult(result)

      // Try to parse preview if we have a selector
      if (result.success && result.body && selector) {
        try {
          const preview = parseValue(result.body, parserType, selector)
          setParsedPreview(preview)
        } catch {
          setParsedPreview(null)
        }
      }
    } catch (e) {
      setTestResult({
        success: false,
        error: (e as Error).message,
        duration: 0
      })
    } finally {
      setTesting(false)
    }
  }

  const parseValue = (text: string, type: string, path: string): string => {
    if (type === 'text') {
      return path === 'trim' ? text.trim() : text
    }

    if (type === 'json-path') {
      const data = JSON.parse(text)
      const parts = path.split(/[.\[\]]/).filter(Boolean)
      let current: any = data
      for (const part of parts) {
        if (current === null || current === undefined) return ''
        current = current[part]
      }
      return typeof current === 'string' ? current : JSON.stringify(current)
    }

    if (type === 'regex') {
      const regex = new RegExp(path)
      const match = text.match(regex)
      return match ? (match[1] ?? match[0]) : ''
    }

    return text
  }

  const handleSubmit = async () => {
    if (!await validateName()) return

    setSaving(true)
    try {
      const requestConfig = buildRequestConfig()
      const responseParser: ResponseParser = {
        type: parserType,
        selector,
        defaultValue: defaultValue || undefined
      }

      if (isEditing && editVariable) {
        await updateVariable({
          id: editVariable.id,
          name,
          description: description || undefined,
          requestConfig,
          responseParser,
          timeout,
          retries,
          cacheEnabled,
          cacheDuration: cacheEnabled ? cacheDuration : undefined
        })
      } else {
        await createRestApiVariable({
          name,
          description: description || undefined,
          requestConfig,
          responseParser,
          timeout,
          retries,
          cacheEnabled,
          cacheDuration: cacheEnabled ? cacheDuration : undefined
        })
      }
      onClose()
    } catch (e) {
      setNameError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const canProceedStep1 = name.trim() && url.trim()
  const canProceedStep2 = testResult?.success
  const canProceedStep3 = selector.trim()

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
          width: '640px',
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
              <Globe size={16} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--color-text)' }}>
                {isEditing ? 'Edit REST API Variable' : 'Create REST API Variable'}
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
                Step {step} of 4: {getStepTitle(step)}
              </p>
            </div>
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

        {/* Progress */}
        <div style={{ display: 'flex', padding: '12px 20px', gap: '8px', borderBottom: '1px solid var(--color-border)' }}>
          {[1, 2, 3, 4].map(s => (
            <div
              key={s}
              style={{
                flex: 1,
                height: '4px',
                borderRadius: '2px',
                backgroundColor: s <= step ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
                transition: 'background-color 0.2s'
              }}
            />
          ))}
        </div>

        {/* Content */}
        <div style={{ padding: '20px', overflow: 'auto', flex: 1 }}>
          {step === 1 && (
            <Step1RequestConfig
              name={name}
              setName={setName}
              nameError={nameError}
              setNameError={setNameError}
              description={description}
              setDescription={setDescription}
              method={method}
              setMethod={setMethod}
              url={url}
              setUrl={setUrl}
              headers={headers}
              setHeaders={setHeaders}
              body={body}
              setBody={setBody}
              authType={authType}
              setAuthType={setAuthType}
              authValue={authValue}
              setAuthValue={setAuthValue}
              authKeyName={authKeyName}
              setAuthKeyName={setAuthKeyName}
              validateName={validateName}
            />
          )}

          {step === 2 && (
            <Step2TestRequest
              testResult={testResult}
              testing={testing}
              onTest={handleTest}
            />
          )}

          {step === 3 && (
            <Step3FieldSelector
              responseBody={testResult?.body}
              parserType={parserType}
              setParserType={setParserType}
              selector={selector}
              setSelector={setSelector}
              defaultValue={defaultValue}
              setDefaultValue={setDefaultValue}
              parsedPreview={parsedPreview}
              setParsedPreview={setParsedPreview}
              parseValue={parseValue}
            />
          )}

          {step === 4 && (
            <Step4Options
              timeout={timeout}
              setTimeout={setTimeout}
              retries={retries}
              setRetries={setRetries}
              cacheEnabled={cacheEnabled}
              setCacheEnabled={setCacheEnabled}
              cacheDuration={cacheDuration}
              setCacheDuration={setCacheDuration}
              name={name}
              method={method}
              url={url}
              selector={selector}
            />
          )}
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
            onClick={() => setStep(s => (s - 1) as Step)}
            disabled={step === 1}
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
              cursor: step === 1 ? 'not-allowed' : 'pointer',
              opacity: step === 1 ? 0.5 : 1
            }}
          >
            <ChevronLeft size={14} />
            Back
          </button>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={onClose}
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

            {step < 4 ? (
              <button
                onClick={() => setStep(s => (s + 1) as Step)}
                disabled={
                  (step === 1 && !canProceedStep1) ||
                  (step === 2 && !canProceedStep2) ||
                  (step === 3 && !canProceedStep3)
                }
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
                  cursor: 'pointer',
                  opacity: (
                    (step === 1 && !canProceedStep1) ||
                    (step === 2 && !canProceedStep2) ||
                    (step === 3 && !canProceedStep3)
                  ) ? 0.6 : 1
                }}
              >
                Next
                <ChevronRight size={14} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={saving}
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
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.6 : 1
                }}
              >
                <Check size={14} />
                {saving ? 'Saving...' : 'Create Variable'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function getStepTitle(step: Step): string {
  switch (step) {
    case 1: return 'Configure Request'
    case 2: return 'Test Request'
    case 3: return 'Select Field'
    case 4: return 'Options & Save'
  }
}

// -----------------------------------------------------------------------------
// Step 1: Request Config
// -----------------------------------------------------------------------------

interface Step1Props {
  name: string
  setName: (v: string) => void
  nameError: string | null
  setNameError: (v: string | null) => void
  description: string
  setDescription: (v: string) => void
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  setMethod: (v: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE') => void
  url: string
  setUrl: (v: string) => void
  headers: HeaderEntry[]
  setHeaders: (v: HeaderEntry[]) => void
  body: string
  setBody: (v: string) => void
  authType: 'none' | 'bearer' | 'basic' | 'api-key'
  setAuthType: (v: 'none' | 'bearer' | 'basic' | 'api-key') => void
  authValue: string
  setAuthValue: (v: string) => void
  authKeyName: string
  setAuthKeyName: (v: string) => void
  validateName: () => Promise<boolean>
}

function Step1RequestConfig(props: Step1Props) {
  const addHeader = () => {
    props.setHeaders([...props.headers, { key: '', value: '' }])
  }

  const removeHeader = (index: number) => {
    props.setHeaders(props.headers.filter((_, i) => i !== index))
  }

  const updateHeader = (index: number, field: 'key' | 'value', value: string) => {
    const updated = [...props.headers]
    updated[index][field] = value
    props.setHeaders(updated)
  }

  return (
    <div>
      {/* Name */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: 'var(--color-text)' }}>
          Variable Name
        </label>
        <input
          type="text"
          value={props.name}
          onChange={e => { props.setName(e.target.value); props.setNameError(null) }}
          onBlur={props.validateName}
          placeholder="api_data"
          style={{
            width: '100%',
            padding: '10px 12px',
            fontSize: '13px',
            fontFamily: 'monospace',
            border: `1px solid ${props.nameError ? 'var(--color-error)' : 'var(--color-border)'}`,
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--color-bg)',
            color: 'var(--color-text)',
            outline: 'none',
            boxSizing: 'border-box'
          }}
        />
        {props.nameError && (
          <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: 'var(--color-error)' }}>{props.nameError}</p>
        )}
      </div>

      {/* Method + URL */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <Select
          value={props.method}
          onChange={v => props.setMethod(v as any)}
          options={[
            { value: 'GET', label: 'GET' },
            { value: 'POST', label: 'POST' },
            { value: 'PUT', label: 'PUT' },
            { value: 'PATCH', label: 'PATCH' },
            { value: 'DELETE', label: 'DELETE' }
          ]}
        />
        <input
          type="text"
          value={props.url}
          onChange={e => props.setUrl(e.target.value)}
          placeholder="https://api.example.com/data"
          style={{
            flex: 1,
            padding: '10px 12px',
            fontSize: '13px',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--color-bg)',
            color: 'var(--color-text)',
            outline: 'none'
          }}
        />
      </div>

      {/* Headers */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text)' }}>Headers</label>
          <button
            onClick={addHeader}
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
            <Plus size={12} /> Add
          </button>
        </div>
        {props.headers.map((h, i) => (
          <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <input
              type="text"
              value={h.key}
              onChange={e => updateHeader(i, 'key', e.target.value)}
              placeholder="Key"
              style={{
                flex: 1,
                padding: '8px 10px',
                fontSize: '12px',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--color-bg)',
                color: 'var(--color-text)',
                outline: 'none'
              }}
            />
            <input
              type="text"
              value={h.value}
              onChange={e => updateHeader(i, 'value', e.target.value)}
              placeholder="Value"
              style={{
                flex: 2,
                padding: '8px 10px',
                fontSize: '12px',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--color-bg)',
                color: 'var(--color-text)',
                outline: 'none'
              }}
            />
            <button
              onClick={() => removeHeader(i)}
              style={{
                padding: '8px',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'transparent',
                color: 'var(--color-error)',
                cursor: 'pointer'
              }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Authentication */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: 'var(--color-text)' }}>
          Authentication
        </label>
        <div style={{ display: 'flex', gap: '8px', marginBottom: props.authType !== 'none' ? '8px' : '0' }}>
          <Select
            value={props.authType}
            onChange={v => props.setAuthType(v as any)}
            size="sm"
            options={[
              { value: 'none', label: 'None' },
              { value: 'bearer', label: 'Bearer Token' },
              { value: 'basic', label: 'Basic Auth' },
              { value: 'api-key', label: 'API Key' }
            ]}
          />
        </div>
        {props.authType !== 'none' && (
          <div style={{ display: 'flex', gap: '8px' }}>
            {props.authType === 'api-key' && (
              <input
                type="text"
                value={props.authKeyName}
                onChange={e => props.setAuthKeyName(e.target.value)}
                placeholder="Header name"
                style={{
                  width: '140px',
                  padding: '8px 10px',
                  fontSize: '12px',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--color-bg)',
                  color: 'var(--color-text)',
                  outline: 'none'
                }}
              />
            )}
            <input
              type="password"
              value={props.authValue}
              onChange={e => props.setAuthValue(e.target.value)}
              placeholder={props.authType === 'basic' ? 'username:password' : 'Token/Key value'}
              style={{
                flex: 1,
                padding: '8px 10px',
                fontSize: '12px',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--color-bg)',
                color: 'var(--color-text)',
                outline: 'none'
              }}
            />
          </div>
        )}
      </div>

      {/* Body */}
      {props.method !== 'GET' && (
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: 'var(--color-text)' }}>
            Request Body (JSON)
          </label>
          <textarea
            value={props.body}
            onChange={e => props.setBody(e.target.value)}
            placeholder='{"key": "value"}'
            rows={4}
            style={{
              width: '100%',
              padding: '10px 12px',
              fontSize: '12px',
              fontFamily: 'monospace',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-bg)',
              color: 'var(--color-text)',
              outline: 'none',
              resize: 'vertical',
              boxSizing: 'border-box'
            }}
          />
        </div>
      )}

      {/* Description */}
      <div>
        <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: 'var(--color-text)' }}>
          Description <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 400 }}>(optional)</span>
        </label>
        <input
          type="text"
          value={props.description}
          onChange={e => props.setDescription(e.target.value)}
          placeholder="What does this API return?"
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
  )
}

// -----------------------------------------------------------------------------
// Step 2: Test Request
// -----------------------------------------------------------------------------

interface Step2Props {
  testResult: RestApiTestResult | null
  testing: boolean
  onTest: () => void
}

function Step2TestRequest({ testResult, testing, onTest }: Step2Props) {
  return (
    <div>
      <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
        Test your API request to make sure it works before saving.
      </p>

      <button
        onClick={onTest}
        disabled={testing}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 24px',
          fontSize: '14px',
          border: 'none',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--color-accent)',
          color: 'white',
          cursor: testing ? 'not-allowed' : 'pointer',
          opacity: testing ? 0.7 : 1,
          marginBottom: '16px'
        }}
      >
        <Play size={16} />
        {testing ? 'Testing...' : 'Send Request'}
      </button>

      {testResult && (
        <div
          style={{
            padding: '16px',
            borderRadius: 'var(--radius-md)',
            border: `1px solid ${testResult.success ? 'var(--color-success)' : 'var(--color-error)'}`,
            backgroundColor: testResult.success ? 'var(--color-success-subtle)' : 'var(--color-error-subtle)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            {testResult.success ? (
              <Check size={16} style={{ color: 'var(--color-success)' }} />
            ) : (
              <AlertCircle size={16} style={{ color: 'var(--color-error)' }} />
            )}
            <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text)' }}>
              {testResult.success ? `Success (${testResult.statusCode})` : 'Failed'}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginLeft: 'auto' }}>
              {testResult.duration}ms
            </span>
          </div>

          {testResult.error && (
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-error)' }}>
              {testResult.error}
            </p>
          )}

          {testResult.body && (
            <div>
              <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
                Response Body:
              </p>
              <pre
                style={{
                  margin: 0,
                  padding: '12px',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  backgroundColor: 'var(--color-bg)',
                  borderRadius: 'var(--radius-sm)',
                  overflow: 'auto',
                  maxHeight: '200px',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}
              >
                {(() => {
                  try {
                    return JSON.stringify(JSON.parse(testResult.body), null, 2)
                  } catch {
                    return testResult.body
                  }
                })()}
              </pre>
            </div>
          )}
        </div>
      )}

      {!testResult && !testing && (
        <div
          style={{
            padding: '32px',
            textAlign: 'center',
            backgroundColor: 'var(--color-bg-secondary)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)'
          }}
        >
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-tertiary)' }}>
            Click "Send Request" to test your API configuration
          </p>
        </div>
      )}
    </div>
  )
}

// -----------------------------------------------------------------------------
// Step 3: Field Selector
// -----------------------------------------------------------------------------

interface Step3Props {
  responseBody?: string
  parserType: 'text' | 'json-path' | 'regex'
  setParserType: (v: 'text' | 'json-path' | 'regex') => void
  selector: string
  setSelector: (v: string) => void
  defaultValue: string
  setDefaultValue: (v: string) => void
  parsedPreview: string | null
  setParsedPreview: (v: string | null) => void
  parseValue: (text: string, type: string, path: string) => string
}

function Step3FieldSelector(props: Step3Props) {
  const updateSelector = (value: string) => {
    props.setSelector(value)
    if (props.responseBody && value) {
      try {
        const preview = props.parseValue(props.responseBody, props.parserType, value)
        props.setParsedPreview(preview)
      } catch {
        props.setParsedPreview(null)
      }
    } else {
      props.setParsedPreview(null)
    }
  }

  return (
    <div>
      <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
        Select which part of the response to extract as the variable value.
      </p>

      {/* Parser Type */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: 'var(--color-text)' }}>
          Extraction Method
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['json-path', 'regex', 'text'] as const).map(type => (
            <button
              key={type}
              onClick={() => { props.setParserType(type); updateSelector(props.selector) }}
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: props.parserType === type ? 'var(--color-accent-subtle)' : 'transparent',
                color: props.parserType === type ? 'var(--color-accent)' : 'var(--color-text)',
                cursor: 'pointer'
              }}
            >
              {type === 'json-path' ? 'JSON Path' : type === 'regex' ? 'Regex' : 'Full Text'}
            </button>
          ))}
        </div>
      </div>

      {/* Selector */}
      {props.parserType !== 'text' && (
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: 'var(--color-text)' }}>
            {props.parserType === 'json-path' ? 'JSON Path' : 'Regex Pattern'}
          </label>
          <input
            type="text"
            value={props.selector}
            onChange={e => updateSelector(e.target.value)}
            placeholder={props.parserType === 'json-path' ? 'data.items[0].name' : '(?<=value:)\\s*(\\w+)'}
            style={{
              width: '100%',
              padding: '10px 12px',
              fontSize: '13px',
              fontFamily: 'monospace',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-bg)',
              color: 'var(--color-text)',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
          <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
            {props.parserType === 'json-path'
              ? 'Use dot notation: data.user.name, data.items[0]'
              : 'First capture group is extracted if present'}
          </p>
        </div>
      )}

      {props.parserType === 'text' && (
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: 'var(--color-text)' }}>
            Text Mode
          </label>
          <Select
            value={props.selector}
            onChange={updateSelector}
            options={[
              { value: '', label: 'Return as-is' },
              { value: 'trim', label: 'Trim whitespace' }
            ]}
          />
        </div>
      )}

      {/* Preview */}
      {props.parsedPreview !== null && (
        <div
          style={{
            padding: '12px',
            marginBottom: '16px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--color-success-subtle)',
            border: '1px solid var(--color-success)'
          }}
        >
          <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
            Extracted Value:
          </p>
          <code style={{ fontSize: '13px', fontFamily: 'monospace', color: 'var(--color-text)' }}>
            {props.parsedPreview || '(empty)'}
          </code>
        </div>
      )}

      {/* Default Value */}
      <div>
        <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: 'var(--color-text)' }}>
          Default Value <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 400 }}>(if extraction fails)</span>
        </label>
        <input
          type="text"
          value={props.defaultValue}
          onChange={e => props.setDefaultValue(e.target.value)}
          placeholder="Fallback value"
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
  )
}

// -----------------------------------------------------------------------------
// Step 4: Options
// -----------------------------------------------------------------------------

interface Step4Props {
  timeout: number
  setTimeout: (v: number) => void
  retries: number
  setRetries: (v: number) => void
  cacheEnabled: boolean
  setCacheEnabled: (v: boolean) => void
  cacheDuration: number
  setCacheDuration: (v: number) => void
  name: string
  method: string
  url: string
  selector: string
}

function Step4Options(props: Step4Props) {
  return (
    <div>
      <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
        Review your configuration and set additional options.
      </p>

      {/* Summary */}
      <div
        style={{
          padding: '16px',
          marginBottom: '20px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border)'
        }}
      >
        <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 600, color: 'var(--color-text)' }}>
          Summary
        </h4>
        <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
          <p style={{ margin: '0 0 4px 0' }}>
            <strong>Variable:</strong> <code style={{ fontFamily: 'monospace' }}>{`{{${props.name}}}`}</code>
          </p>
          <p style={{ margin: '0 0 4px 0' }}>
            <strong>Request:</strong> {props.method} {props.url.length > 40 ? props.url.substring(0, 40) + '...' : props.url}
          </p>
          <p style={{ margin: 0 }}>
            <strong>Selector:</strong> <code style={{ fontFamily: 'monospace' }}>{props.selector || '(full text)'}</code>
          </p>
        </div>
      </div>

      {/* Options Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Timeout */}
        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: 'var(--color-text)' }}>
            Timeout
          </label>
          <Select
            value={String(props.timeout)}
            onChange={v => props.setTimeout(Number(v))}
            size="sm"
            options={[
              { value: '5000', label: '5 seconds' },
              { value: '10000', label: '10 seconds' },
              { value: '30000', label: '30 seconds' },
              { value: '60000', label: '60 seconds' }
            ]}
          />
        </div>

        {/* Retries */}
        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: 'var(--color-text)' }}>
            Retries
          </label>
          <Select
            value={String(props.retries)}
            onChange={v => props.setRetries(Number(v))}
            size="sm"
            options={[
              { value: '0', label: 'No retries' },
              { value: '1', label: '1 retry' },
              { value: '2', label: '2 retries' },
              { value: '3', label: '3 retries' }
            ]}
          />
        </div>
      </div>

      {/* Caching */}
      <div style={{ marginTop: '16px' }}>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
            color: 'var(--color-text)',
            cursor: 'pointer',
            marginBottom: props.cacheEnabled ? '12px' : '0'
          }}
        >
          <input
            type="checkbox"
            checked={props.cacheEnabled}
            onChange={e => props.setCacheEnabled(e.target.checked)}
            style={{ width: '16px', height: '16px', accentColor: 'var(--color-accent)' }}
          />
          Enable caching
        </label>
        {props.cacheEnabled && (
          <Select
            value={String(props.cacheDuration)}
            onChange={v => props.setCacheDuration(Number(v))}
            size="sm"
            options={[
              { value: '60000', label: '1 minute' },
              { value: '300000', label: '5 minutes' },
              { value: '900000', label: '15 minutes' },
              { value: '3600000', label: '1 hour' },
              { value: '86400000', label: '24 hours' }
            ]}
          />
        )}
      </div>
    </div>
  )
}
