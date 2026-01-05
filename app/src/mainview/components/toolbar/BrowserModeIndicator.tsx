// =============================================================================
// BROWSER MODE INDICATOR
// =============================================================================
// Shows whether the app is accessible via web browser.
// Left click = toggle on/off, Right click = copy URL to clipboard.

import React, { useEffect, useState } from 'react'
import { Globe } from 'lucide-react'
import { sendMessage } from '../../lib/comm-bridge'
import { getConnectedPort } from '../../lib/ws-client'

export const BrowserModeIndicator: React.FC = () => {
  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [copied, setCopied] = useState(false)
  const [toggling, setToggling] = useState(false)

  const port = getConnectedPort() || 3001
  const url = `http://localhost:${port}`

  // Fetch initial state
  useEffect(() => {
    sendMessage<boolean>('settings:get', 'browserModeEnabled')
      .then((value) => setEnabled(value ?? true))
      .catch(() => setEnabled(true))
  }, [])

  // Left click = toggle
  const handleClick = async () => {
    if (toggling) return
    setToggling(true)

    const newValue = !enabled
    console.log('[BrowserModeIndicator] Toggling from', enabled, 'to', newValue)

    try {
      const result = await sendMessage('settings:set', {
        path: 'browserModeEnabled',
        value: newValue,
      })
      console.log('[BrowserModeIndicator] Backend response:', JSON.stringify(result))
      setEnabled(newValue)
    } catch (err) {
      console.error('[BrowserModeIndicator] Failed to toggle:', err)
    } finally {
      setToggling(false)
    }
  }

  // Right click = copy URL
  const handleContextMenu = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!enabled) return

    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard not available
    }
  }

  const isEnabled = enabled ?? false

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '0 8px',
      }}
    >
      <button
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        disabled={toggling}
        title={
          copied
            ? 'Copied!'
            : isEnabled
              ? `Browser Mode ON - Left click to disable, Right click to copy ${url}`
              : 'Browser Mode OFF - Left click to enable (requires restart)'
        }
        style={{
          background: 'none',
          border: 'none',
          padding: '4px',
          cursor: toggling ? 'wait' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '4px',
          transition: 'all 200ms ease',
          color: isEnabled ? '#10b981' : '#6b7280',
          opacity: toggling ? 0.5 : isEnabled ? 1 : 0.5,
        }}
      >
        <Globe size={14} />
      </button>

      {isEnabled && (
        <span
          style={{
            fontSize: '11px',
            color: copied ? '#10b981' : '#9ca3af',
            fontFamily: 'monospace',
            transition: 'color 200ms ease',
          }}
        >
          :{port}
        </span>
      )}
    </div>
  )
}
