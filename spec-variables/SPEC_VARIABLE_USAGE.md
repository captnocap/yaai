# Variable Usage in Chat Input — Specification

> Version: 1.0.0
> Last Updated: 2026-01-04

Frontend component behavior for variables in chat input. Covers live preview mode, runtime mode, variable block display, paste detection, and real-time feedback.

---

## Table of Contents

1. [Component Architecture](#1-component-architecture)
2. [Input Component Behavior](#2-input-component-behavior)
3. [Live Preview Mode](#3-live-preview-mode)
4. [Runtime Mode](#4-runtime-mode)
5. [Variable Block Component](#5-variable-block-component)
6. [Paste Detection](#6-paste-detection)
7. [Settings Integration](#7-settings-integration)
8. [Error Handling & Recovery](#8-error-handling--recovery)
9. [WebSocket Protocol](#9-websocket-protocol)

---

## 1. Component Architecture

### 1.1 Component Hierarchy

```
ChatView
├── InputContainer (existing)
│   ├── AutoTextArea
│   │   └── [input text with {{var}} detection]
│   ├── VariableBlocksContainer (NEW)
│   │   └── VariableBlock[] (NEW)
│   │       ├── BlockLoading | BlockResolved | BlockError
│   │       ├── RefreshButton
│   │       ├── RetryButton
│   │       └── RemoveButton
│   ├── AttachmentTray (existing)
│   └── ControlBar (existing)
└── SendButton
    └── Message send validation logic
```

### 1.2 Data Flow

**Live Preview Mode:**
```
User types {{var}}
    ↓
InputComponent detects {{var}} pattern
    ↓
Regex matches all {{...}} in input
    ↓
WebSocket: variable:expand {variables: ['var']}
    ↓
Backend expands variables (async)
    ↓
WebSocket response: {var: {data: '...', loading: false}}
    ↓
Frontend renders VariableBlock with data
    ↓
User can refresh block or remove variable from input
    ↓
User clicks send
    ↓
Message includes interpolated data
```

**Runtime Mode:**
```
User types {{var}}
    ↓
InputComponent detects {{var}} but doesn't expand yet
    ↓
No preview blocks shown
    ↓
User clicks send
    ↓
WebSocket: chat:add-message {content: '...{{var}}...', variables: ['var']}
    ↓
Backend:
  - Expands all variables
  - If any fail → return error
  - If all succeed → create message with interpolated content
    ↓
Frontend receives response or error
    ↓
If error: show error message, allow retry
If success: message appears in chat
```

---

## 2. Input Component Behavior

### 2.1 Variable Syntax Detection

```typescript
// lib/variable-syntax.ts

/**
 * Detect all variables in text
 * Returns array of {name, position}
 */
export function detectVariables(text: string): Array<{name: string; position: number}> {
  const regex = /\{\{([a-zA-Z_][\w-]*)\}\}/g
  const matches: Array<{name: string; position: number}> = []

  let match
  while ((match = regex.exec(text)) !== null) {
    matches.push({
      name: match[1],
      position: match.index
    })
  }

  return matches
}

/**
 * Validate variable name
 */
export function isValidVariableName(name: string): boolean {
  return /^[a-zA-Z_][\w-]*$/.test(name) && name.length <= 50
}

/**
 * Check if text has complete variable syntax
 * Returns true if all {{}} are balanced
 */
export function hasCompleteVariableSyntax(text: string): boolean {
  const openCount = (text.match(/\{\{/g) || []).length
  const closeCount = (text.match(/\}\}/g) || []).length
  return openCount === closeCount
}
```

### 2.2 Real-time Variable Detection (Live Mode Only)

**Component**: `src/mainview/components/input/AutoTextArea.tsx` (modified)

```typescript
import { useState, useEffect, useRef } from 'react'
import { detectVariables, hasCompleteVariableSyntax } from '../lib/variable-syntax'

interface AutoTextAreaProps {
  value: string
  onChange: (value: string) => void
  onVariablesDetected?: (variables: string[]) => void
  livePreviewEnabled?: boolean
  placeholder?: string
}

export const AutoTextArea: React.FC<AutoTextAreaProps> = ({
  value,
  onChange,
  onVariablesDetected,
  livePreviewEnabled = false
}) => {
  const [lastValidVariables, setLastValidVariables] = useState<string[]>([])
  const debounceTimer = useRef<NodeJS.Timeout>()

  useEffect(() => {
    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }

    // Only detect variables if live preview is enabled
    if (!livePreviewEnabled) {
      return
    }

    // Debounce variable detection (300ms)
    debounceTimer.current = setTimeout(() => {
      const detected = detectVariables(value)
      const validVariables = detected.map(v => v.name)

      // Only update if variables changed
      if (JSON.stringify(validVariables) !== JSON.stringify(lastValidVariables)) {
        setLastValidVariables(validVariables)
        onVariablesDetected?.(validVariables)
      }
    }, 300)

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
    }
  }, [value, livePreviewEnabled])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value

    // Detect removed variables
    const oldVariables = detectVariables(value).map(v => v.name)
    const newVariables = detectVariables(newValue).map(v => v.name)
    const removedVariables = oldVariables.filter(v => !newVariables.includes(v))

    // If variables were removed, notify parent to remove blocks
    if (removedVariables.length > 0) {
      onVariablesRemoved?.(removedVariables)
    }

    onChange(newValue)
  }

  return (
    <textarea
      value={value}
      onChange={handleChange}
      placeholder="Type your message... Use {{var}} for variables"
      className="input-textarea"
    />
  )
}
```

### 2.3 Instant Variable Removal

When user backspaces and removes closing `}}`:

```
User input: "Hello {{var}}"
User backspaces last character
Input becomes: "Hello {{var}"
    ↓
detectVariables() returns empty (incomplete syntax)
    ↓
onVariablesRemoved(['var']) called
    ↓
VariableBlocksContainer removes block for 'var'
    ↓
Block fades out instantly
```

---

## 3. Live Preview Mode

### 3.1 Expansion Request & Block Rendering

**Component**: `src/mainview/components/input/VariableBlocksContainer.tsx`

```typescript
import React, { useState, useEffect } from 'react'
import { commBridge } from '../../lib/comm-bridge'
import { VariableBlock } from './VariableBlock'
import type { VariableExpansionResult } from '@shared/types'

interface VariableBlocksContainerProps {
  variables: string[]           // Variable names to expand
  livePreviewEnabled: boolean
  onBlockRefresh?: (variableName: string) => void
  onBlockRemove?: (variableName: string) => void
}

export const VariableBlocksContainer: React.FC<VariableBlocksContainerProps> = ({
  variables,
  livePreviewEnabled,
  onBlockRefresh,
  onBlockRemove
}) => {
  const [blockStates, setBlockStates] = useState<Map<string, VariableExpansionResult>>(new Map())

  useEffect(() => {
    if (!livePreviewEnabled || variables.length === 0) {
      setBlockStates(new Map())
      return
    }

    // Expand all variables
    const expandVariables = async () => {
      const results = new Map<string, VariableExpansionResult>()

      // Parallel expansion
      const expansions = variables.map(varName => {
        // Add initial loading state immediately
        setBlockStates(prev => new Map(prev).set(varName, {
          variable: varName,
          loading: true,
          data: undefined,
          error: undefined
        }))

        // Request expansion
        return commBridge.expandVariables([varName]).then(result => {
          if (result.ok) {
            const expanded = result.value[0]
            results.set(varName, expanded)
          } else {
            results.set(varName, {
              variable: varName,
              loading: false,
              data: undefined,
              error: result.error?.message || 'Failed to expand'
            })
          }
        })
      })

      await Promise.all(expansions)
      setBlockStates(results)
    }

    expandVariables()
  }, [variables, livePreviewEnabled])

  const handleRefresh = async (variableName: string) => {
    setBlockStates(prev => new Map(prev).set(variableName, {
      variable: variableName,
      loading: true,
      data: undefined,
      error: undefined
    }))

    const result = await commBridge.expandVariables([variableName])

    if (result.ok) {
      const expanded = result.value[0]
      setBlockStates(prev => new Map(prev).set(variableName, expanded))
    } else {
      setBlockStates(prev => new Map(prev).set(variableName, {
        variable: variableName,
        loading: false,
        data: undefined,
        error: result.error?.message || 'Failed to expand'
      }))
    }

    onBlockRefresh?.(variableName)
  }

  const handleRemove = (variableName: string) => {
    setBlockStates(prev => {
      const next = new Map(prev)
      next.delete(variableName)
      return next
    })
    onBlockRemove?.(variableName)
  }

  if (blockStates.size === 0) {
    return null
  }

  return (
    <div className="variable-blocks-container">
      <div className="variable-blocks-header">Variables in message:</div>
      <div className="variable-blocks-list">
        {Array.from(blockStates.values()).map(blockState => (
          <VariableBlock
            key={blockState.variable}
            variable={blockState.variable}
            loading={blockState.loading}
            data={blockState.data}
            error={blockState.error}
            onRefresh={() => handleRefresh(blockState.variable)}
            onRemove={() => handleRemove(blockState.variable)}
          />
        ))}
      </div>
    </div>
  )
}
```

### 3.2 Block States & Transitions

**Live Preview States:**

1. **LOADING** (initial)
   ```
   ┌──────────────────────────────────────┐
   │ {{var}} [≈≈≈ Loading...]             │
   └──────────────────────────────────────┘
   ```

2. **RESOLVED** (data received)
   ```
   ┌──────────────────────────────────────┐
   │ {{var}}                   [↻] [×]    │
   │ "The resolved data here..."          │
   └──────────────────────────────────────┘
   ```

3. **ERROR** (request failed)
   ```
   ┌──────────────────────────────────────┐
   │ {{var}}                       [×]    │
   │ ⚠ Failed to expand: Connection error │
   │ [Retry]                              │
   └──────────────────────────────────────┘
   ```

---

## 4. Runtime Mode

### 4.1 Send Validation

**Modified send logic** in `ChatView.tsx`:

```typescript
async function handleSendMessage(content: string) {
  // Detect all variables in the message
  const variables = detectVariables(content)

  if (variables.length > 0 && !livePreviewEnabled) {
    // Runtime mode: validate variables at send time
    const expandResult = await commBridge.expandVariables(variables.map(v => v.name))

    if (!expandResult.ok) {
      showError(`Variable expansion failed: ${expandResult.error?.message}`)
      return
    }

    // Check if any variable failed
    const failedVars = expandResult.value.filter(v => v.error)
    if (failedVars.length > 0) {
      showError(`Failed to expand: ${failedVars.map(v => v.variable).join(', ')}`)
      return
    }

    // All variables expanded successfully
    // Interpolate into message content
    const interpolatedContent = interpolateVariables(content, expandResult.value)
    content = interpolatedContent
  }

  // Send message with interpolated content
  const result = await commBridge.addMessage({
    chatId,
    content,
    attachments: currentAttachments,
    role: 'user'
  })

  if (!result.ok) {
    showError('Failed to send message')
    return
  }

  // Clear input
  setInputContent('')
  setAttachments([])
}

function interpolateVariables(
  content: string,
  expanded: VariableExpansionResult[]
): string {
  let result = content

  for (const exp of expanded) {
    if (exp.data) {
      const regex = new RegExp(`\\{\\{${exp.variable}\\}\\}`, 'g')
      result = result.replace(regex, exp.data)
    }
  }

  return result
}
```

### 4.2 Error Feedback

If expansion fails in runtime mode:

```
User message: "Hello {{weather}}"
User clicks send
    ↓
Error: "Variable expansion failed: REST API timeout"
    ↓
Message is NOT sent
    ↓
Error message shown to user
    ↓
User can:
  - Toggle live preview to see/retry variables
  - Remove the variable and send without it
  - Wait and retry send
```

---

## 5. Variable Block Component

### 5.1 Block Component Definition

**Component**: `src/mainview/components/input/VariableBlock.tsx`

```typescript
import React from 'react'
import { Spinner, AlertTriangle, RotateCcw, Trash2 } from 'lucide-react'

interface VariableBlockProps {
  variable: string                      // Variable name
  loading: boolean                      // Is currently loading
  data?: string                         // Resolved data
  error?: string                        // Error message if failed
  onRefresh: () => void                 // Refresh this variable
  onRemove: () => void                  // Remove variable from input
}

export const VariableBlock: React.FC<VariableBlockProps> = ({
  variable,
  loading,
  data,
  error,
  onRefresh,
  onRemove
}) => {
  const displayText = data || error || 'Loading...'

  return (
    <div className={`variable-block ${loading ? 'loading' : ''} ${error ? 'error' : ''}`}>
      <div className="block-header">
        <span className="block-variable-name">{{{{ {variable} }}}}</span>
        <div className="block-actions">
          {error && (
            <button
              className="block-button retry"
              onClick={onRefresh}
              title="Retry expansion"
            >
              <RotateCcw size={16} />
            </button>
          )}
          {!loading && !error && (
            <button
              className="block-button refresh"
              onClick={onRefresh}
              title="Refresh variable"
            >
              <RotateCcw size={16} />
            </button>
          )}
          <button
            className="block-button remove"
            onClick={onRemove}
            title="Remove variable from message"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="block-content">
        {loading && (
          <div className="block-loading">
            <Spinner size={14} className="spinner-icon" />
            <span>Expanding...</span>
          </div>
        )}

        {error && (
          <div className="block-error">
            <AlertTriangle size={14} />
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && data && (
          <div className="block-data">
            <code className="block-value">{truncate(data, 200)}</code>
          </div>
        )}
      </div>
    </div>
  )
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen) + '...'
}
```

### 5.2 Block Styling

```css
.variable-blocks-container {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.variable-blocks-header {
  font-size: 12px;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.variable-blocks-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.variable-block {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 10px 12px;
  background-color: var(--color-bg-secondary);
  transition: all 0.2s ease;
}

.variable-block.loading {
  opacity: 0.7;
  border-color: var(--color-accent);
}

.variable-block.error {
  border-color: var(--color-error);
  background-color: rgba(255, 0, 0, 0.05);
}

.block-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.block-variable-name {
  font-family: monospace;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-accent);
}

.block-actions {
  display: flex;
  gap: 4px;
}

.block-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.block-button:hover {
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-primary);
}

.block-button.retry:hover {
  background-color: rgba(255, 165, 0, 0.1);
  color: var(--color-warning);
}

.block-content {
  font-size: 12px;
  line-height: 1.5;
}

.block-loading,
.block-error {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--color-text-secondary);
}

.block-error {
  color: var(--color-error);
}

.spinner-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.block-data {
  overflow: hidden;
}

.block-value {
  display: block;
  padding: 6px 8px;
  background-color: var(--color-bg-tertiary);
  border-radius: 4px;
  color: var(--color-text-primary);
  word-break: break-word;
  white-space: pre-wrap;
}
```

---

## 6. Paste Detection

### 6.1 Paste Handler

**In InputContainer** or **AutoTextArea**:

```typescript
async function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
  const pastedText = e.clipboardData?.getData('text/plain') || ''
  const detectedVariables = detectVariables(pastedText)

  if (detectedVariables.length > 0) {
    e.preventDefault()

    // Show confirmation dialog
    const userChoice = await showPasteConfirmation(
      detectedVariables.length,
      pastedText
    )

    if (userChoice === 'process') {
      // Insert with variables (they'll be expanded in live preview or at send)
      insertTextAtCursor(pastedText)
    } else if (userChoice === 'blank') {
      // Strip variables and insert plain text
      const plainText = pastedText.replace(/\{\{[^}]*\}\}/g, '')
      insertTextAtCursor(plainText)
    }
    // If 'cancel', do nothing
  } else {
    // No variables, just paste normally
    insertTextAtCursor(pastedText)
  }
}

function insertTextAtCursor(text: string) {
  // Insert text at current cursor position
  // (standard textarea operation)
}
```

### 6.2 Paste Confirmation Dialog

**Component**: `src/mainview/components/input/PasteConfirmationDialog.tsx`

```
┌─────────────────────────────────────────────────────────┐
│  Variables Detected in Pasted Text                [X]   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  5 variables detected: {{var1}}, {{var2}}, ...          │
│                                                          │
│  What would you like to do?                              │
│                                                          │
│  ◉ Process variables                                    │
│    (variables will be expanded in preview or at send)   │
│                                                          │
│  ○ Paste as plain text                                  │
│    ({{var}} syntax will be removed)                     │
│                                                          │
│  ○ Cancel                                               │
│                                                          │
│                    [OK]                                  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 7. Settings Integration

### 7.1 Per-Chat Variable Settings

**Component**: `src/mainview/components/chat/ChatSettings.tsx` (or new tab)

```
┌────────────────────────────────────────────────────────┐
│  Chat Settings > Variables                             │
├────────────────────────────────────────────────────────┤
│                                                         │
│  Variable Expansion for This Chat:                      │
│                                                         │
│  ☑ Enable {{var}} syntax                               │
│                                                         │
│  Default mode for this chat:                            │
│  ◉ Use global setting (currently: Live Preview)        │
│  ○ Live Preview (preview before send)                  │
│  ○ Runtime (expand only at send time)                  │
│                                                         │
│  Available variables in this chat:                      │
│  ☑ All system variables (time, date, etc)              │
│  ☑ All app-level variables                             │
│  ☑ {{model}} - current AI model                        │
│  ☑ {{chat-title}} - this chat's title                  │
│                                                         │
└────────────────────────────────────────────────────────┘
```

### 7.2 Global Default Settings

**In Settings > Variables (existing)**:

Add toggles for:
- {{var}} enabled/disabled
- Default expansion mode (Live/Runtime)
- Default wildcard cache duration

---

## 8. Error Handling & Recovery

### 8.1 Expansion Errors

Common errors and user-facing messages:

| Error | User Message | Recovery |
|-------|--------------|----------|
| REST API timeout | "Variable request took too long" | Retry button on block |
| REST API 404 | "API endpoint not found" | Check variable settings |
| Network unreachable | "Cannot reach API (proxy issue?)" | Check proxy settings |
| Invalid response | "API response format changed" | Edit variable selector |
| JavaScript error | "Variable code has an error" | Edit variable code |
| Undefined variable | "Variable '{{name}}' not found" | Create variable or fix name |
| Circular reference | "Variables reference each other" | Edit to break cycle |

### 8.2 Graceful Degradation

- **Live preview error** → Show error on block, user can:
  - Retry the block
  - Remove the variable
  - Continue typing (block remains in error state)
  - Send anyway (only in live mode)

- **Runtime error** → Block send, show error, user must:
  - Fix the variable (via settings or remove it)
  - Retry send

---

## 9. WebSocket Protocol

### 9.1 Expansion Request

```typescript
// Request
{
  "type": "request",
  "id": "req_123",
  "channel": "variable:expand",
  "payload": {
    "variables": ["var1", "var2", "var3"],
    "includeMetadata": true  // Include type, last-updated, etc
  },
  "timestamp": 1704067200000
}

// Response (success)
{
  "type": "response",
  "id": "req_123",
  "channel": "variable:expand",
  "payload": [
    {
      "variable": "var1",
      "data": "Hello World",
      "loading": false,
      "error": null,
      "type": "app-level"
    },
    {
      "variable": "var2",
      "data": "2026-01-04",
      "loading": false,
      "error": null,
      "type": "system"
    },
    {
      "variable": "var3",
      "data": null,
      "loading": false,
      "error": "REST API timeout",
      "type": "rest-api"
    }
  ],
  "timestamp": 1704067200100
}

// Response (handler error)
{
  "type": "response",
  "id": "req_123",
  "channel": "variable:expand",
  "error": {
    "code": "HANDLER_ERROR",
    "message": "Some variables not found"
  },
  "timestamp": 1704067200100
}
```

### 9.2 High-Level API (comm-bridge)

```typescript
// src/mainview/lib/comm-bridge.ts (add method)

export const commBridge = {
  async expandVariables(
    variableNames: string[]
  ): Promise<Result<VariableExpansionResult[]>> {
    return wsClient.request('variable:expand', {
      variables: variableNames,
      includeMetadata: true
    })
  }
}

export interface VariableExpansionResult {
  variable: string
  data?: string        // Resolved value
  error?: string       // Error message if failed
  loading?: boolean    // Still expanding (shouldn't be in response)
  type?: VariableType  // Metadata
}
```

---

## 10. Keyboard Shortcuts (Future)

Potential shortcuts for variable management:
- `Ctrl+K` - Open variable browser/search
- `Ctrl+/` - Toggle variable settings panel
- `Tab` - Autocomplete variable names (while typing {{)

---

*End of Variable Usage in Chat Input specification.*
