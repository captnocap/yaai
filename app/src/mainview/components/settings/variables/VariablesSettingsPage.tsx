// =============================================================================
// VARIABLES SETTINGS PAGE
// =============================================================================
// Main settings page for managing variables - system, app-level, wildcard,
// REST API, and JavaScript variables.

import React, { useState } from 'react'
import { Plus, RefreshCw, Code2, Globe, Shuffle, FileText, Info } from 'lucide-react'
import { SettingsGroup } from '../general/SettingsGroup'
import { useVariables } from '../../../hooks/useVariables'
import { VariableListItem } from './VariableListItem'
import { CreateAppVariableModal } from './CreateAppVariableModal'
import { CreateWildcardVariableModal } from './CreateWildcardVariableModal'
import { CreateJavaScriptVariableModal } from './CreateJavaScriptVariableModal'
import { CreateRestApiVariableModal } from './CreateRestApiVariableModal'
import type { AnyVariable, VariableType } from '../../../types/variables'

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface VariablesSettingsPageProps {
  className?: string
}

type CreateModalType = 'app-level' | 'wildcard' | 'rest-api' | 'javascript' | null

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function VariablesSettingsPage({ className }: VariablesSettingsPageProps) {
  const {
    variables,
    systemVariables,
    loading,
    error,
    deleteVariable,
    toggleVariable,
    refreshVariables
  } = useVariables()

  const [createModal, setCreateModal] = useState<CreateModalType>(null)
  const [editingVariable, setEditingVariable] = useState<AnyVariable | null>(null)

  // Group variables by type
  const appLevelVars = variables.filter(v => v.type === 'app-level')
  const wildcardVars = variables.filter(v => v.type === 'wildcard')
  const restApiVars = variables.filter(v => v.type === 'rest-api')
  const javascriptVars = variables.filter(v => v.type === 'javascript')

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this variable?')) {
      await deleteVariable(id)
    }
  }

  const handleToggle = async (id: string, enabled: boolean) => {
    await toggleVariable(id, enabled)
  }

  const handleEdit = (variable: AnyVariable) => {
    setEditingVariable(variable)
    setCreateModal(variable.type as CreateModalType)
  }

  if (loading) {
    return (
      <div style={{ padding: '24px', color: 'var(--color-text-secondary)' }}>
        Loading variables...
      </div>
    )
  }

  return (
    <div className={className} style={{ padding: '24px', maxWidth: '800px' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '24px'
      }}>
        <div>
          <h2 style={{
            margin: 0,
            fontSize: '20px',
            fontWeight: 600,
            color: 'var(--color-text)'
          }}>
            Variables
          </h2>
          <p style={{
            margin: '4px 0 0 0',
            fontSize: '13px',
            color: 'var(--color-text-secondary)'
          }}>
            Define and manage variables for dynamic text expansion in chat messages.
          </p>
        </div>
        <button
          onClick={refreshVariables}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 12px',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'transparent',
            color: 'var(--color-text-secondary)',
            fontSize: '13px',
            cursor: 'pointer'
          }}
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {error && (
        <div style={{
          padding: '12px 16px',
          marginBottom: '16px',
          backgroundColor: 'var(--color-error-subtle)',
          border: '1px solid var(--color-error)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--color-error)',
          fontSize: '13px'
        }}>
          {error}
        </div>
      )}

      {/* Usage Info */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        padding: '16px',
        marginBottom: '24px',
        backgroundColor: 'var(--color-bg-secondary)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)'
      }}>
        <Info size={18} style={{ color: 'var(--color-accent)', flexShrink: 0, marginTop: '2px' }} />
        <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
          <p style={{ margin: '0 0 8px 0' }}>
            Use variables in chat messages with the <code style={{
              padding: '2px 6px',
              backgroundColor: 'var(--color-bg-tertiary)',
              borderRadius: '4px',
              fontFamily: 'monospace',
              fontSize: '12px'
            }}>{'{{variableName}}'}</code> syntax.
          </p>
          <p style={{ margin: 0 }}>
            Variables are expanded when you send a message. System variables are always available.
          </p>
        </div>
      </div>

      {/* System Variables */}
      <SettingsGroup title="System Variables" defaultOpen={false}>
        <div style={{ padding: '16px' }}>
          <p style={{
            margin: '0 0 16px 0',
            fontSize: '13px',
            color: 'var(--color-text-secondary)'
          }}>
            Built-in variables that are always available. These cannot be modified.
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '12px'
          }}>
            {systemVariables.map(sv => (
              <div
                key={sv.name}
                style={{
                  padding: '12px',
                  backgroundColor: 'var(--color-bg-secondary)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)'
                }}
              >
                <code style={{
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  color: 'var(--color-accent)'
                }}>
                  {`{{${sv.name}}}`}
                </code>
                <p style={{
                  margin: '6px 0 0 0',
                  fontSize: '12px',
                  color: 'var(--color-text-secondary)'
                }}>
                  {sv.description}
                </p>
                <p style={{
                  margin: '4px 0 0 0',
                  fontSize: '11px',
                  color: 'var(--color-text-tertiary)',
                  fontStyle: 'italic'
                }}>
                  e.g., {sv.example}
                </p>
              </div>
            ))}
          </div>
        </div>
      </SettingsGroup>

      {/* Create Variable Buttons */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '24px',
        flexWrap: 'wrap'
      }}>
        <CreateVariableButton
          icon={<FileText size={14} />}
          label="App Variable"
          description="Simple text value"
          onClick={() => setCreateModal('app-level')}
        />
        <CreateVariableButton
          icon={<Shuffle size={14} />}
          label="Wildcard"
          description="Random from list"
          onClick={() => setCreateModal('wildcard')}
        />
        <CreateVariableButton
          icon={<Globe size={14} />}
          label="REST API"
          description="Fetch from URL"
          onClick={() => setCreateModal('rest-api')}
        />
        <CreateVariableButton
          icon={<Code2 size={14} />}
          label="JavaScript"
          description="Custom logic"
          onClick={() => setCreateModal('javascript')}
        />
      </div>

      {/* Custom Variables */}
      {variables.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* App-Level Variables */}
          {appLevelVars.length > 0 && (
            <SettingsGroup title={`App Variables (${appLevelVars.length})`}>
              {appLevelVars.map(variable => (
                <VariableListItem
                  key={variable.id}
                  variable={variable}
                  onToggle={handleToggle}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </SettingsGroup>
          )}

          {/* Wildcard Variables */}
          {wildcardVars.length > 0 && (
            <SettingsGroup title={`Wildcard Variables (${wildcardVars.length})`}>
              {wildcardVars.map(variable => (
                <VariableListItem
                  key={variable.id}
                  variable={variable}
                  onToggle={handleToggle}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </SettingsGroup>
          )}

          {/* REST API Variables */}
          {restApiVars.length > 0 && (
            <SettingsGroup title={`REST API Variables (${restApiVars.length})`}>
              {restApiVars.map(variable => (
                <VariableListItem
                  key={variable.id}
                  variable={variable}
                  onToggle={handleToggle}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </SettingsGroup>
          )}

          {/* JavaScript Variables */}
          {javascriptVars.length > 0 && (
            <SettingsGroup title={`JavaScript Variables (${javascriptVars.length})`}>
              {javascriptVars.map(variable => (
                <VariableListItem
                  key={variable.id}
                  variable={variable}
                  onToggle={handleToggle}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </SettingsGroup>
          )}
        </>
      )}

      {/* Modals */}
      <CreateAppVariableModal
        isOpen={createModal === 'app-level'}
        onClose={() => {
          setCreateModal(null)
          setEditingVariable(null)
        }}
        editVariable={editingVariable?.type === 'app-level' ? editingVariable : undefined}
      />

      <CreateWildcardVariableModal
        isOpen={createModal === 'wildcard'}
        onClose={() => {
          setCreateModal(null)
          setEditingVariable(null)
        }}
        editVariable={editingVariable?.type === 'wildcard' ? editingVariable : undefined}
      />

      <CreateJavaScriptVariableModal
        isOpen={createModal === 'javascript'}
        onClose={() => {
          setCreateModal(null)
          setEditingVariable(null)
        }}
        editVariable={editingVariable?.type === 'javascript' ? editingVariable : undefined}
      />

      <CreateRestApiVariableModal
        isOpen={createModal === 'rest-api'}
        onClose={() => {
          setCreateModal(null)
          setEditingVariable(null)
        }}
        editVariable={editingVariable?.type === 'rest-api' ? editingVariable : undefined}
      />
    </div>
  )
}

// -----------------------------------------------------------------------------
// Sub-Components
// -----------------------------------------------------------------------------

interface CreateVariableButtonProps {
  icon: React.ReactNode
  label: string
  description: string
  onClick: () => void
}

function CreateVariableButton({ icon, label, description, onClick }: CreateVariableButtonProps) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '12px 16px',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        backgroundColor: 'var(--color-bg)',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 0.15s ease'
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'var(--color-accent)'
        e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--color-border)'
        e.currentTarget.style.backgroundColor = 'var(--color-bg)'
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '32px',
        height: '32px',
        borderRadius: 'var(--radius-md)',
        backgroundColor: 'var(--color-accent-subtle)',
        color: 'var(--color-accent)'
      }}>
        {icon}
      </div>
      <div>
        <div style={{
          fontSize: '13px',
          fontWeight: 500,
          color: 'var(--color-text)'
        }}>
          {label}
        </div>
        <div style={{
          fontSize: '11px',
          color: 'var(--color-text-tertiary)'
        }}>
          {description}
        </div>
      </div>
      <Plus size={16} style={{ marginLeft: 'auto', color: 'var(--color-text-tertiary)' }} />
    </button>
  )
}

function EmptyState() {
  return (
    <div style={{
      padding: '48px 24px',
      textAlign: 'center',
      backgroundColor: 'var(--color-bg-secondary)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--color-border)'
    }}>
      <div style={{
        width: '48px',
        height: '48px',
        margin: '0 auto 16px',
        borderRadius: '50%',
        backgroundColor: 'var(--color-bg-tertiary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Code2 size={24} style={{ color: 'var(--color-text-tertiary)' }} />
      </div>
      <h3 style={{
        margin: '0 0 8px 0',
        fontSize: '15px',
        fontWeight: 600,
        color: 'var(--color-text)'
      }}>
        No Custom Variables
      </h3>
      <p style={{
        margin: 0,
        fontSize: '13px',
        color: 'var(--color-text-secondary)'
      }}>
        Create your first variable using the buttons above.
      </p>
    </div>
  )
}
