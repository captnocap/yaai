// =============================================================================
// PROXY INDICATOR
// =============================================================================
// Status dot showing proxy health. Green = healthy, Yellow = degraded,
// Red = failed, Transparent = disabled.

import React, { useEffect, useState } from 'react'
import { sendMessage } from '../../lib/comm-bridge'
import type { ProxyStatus } from '../../types'
import './ProxyIndicator.css'

interface ProxyIndicatorProps {
  onConfigClick?: () => void
}

export const ProxyIndicator: React.FC<ProxyIndicatorProps> = ({ onConfigClick }) => {
  const [status, setStatus] = useState<ProxyStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Fetch proxy status on mount and periodically
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const result = await sendMessage<ProxyStatus>('proxy:status')
        setStatus(result)
      } catch (error) {
        console.error('Failed to fetch proxy status:', error)
      }
    }

    fetchStatus()
    const interval = setInterval(fetchStatus, 30000)  // Refresh every 30s
    return () => clearInterval(interval)
  }, [])

  const getStatusColor = (): string => {
    if (!status?.isEnabled) return 'transparent'
    if (status.healthStatus === 'healthy') return '#10b981'  // Green
    if (status.healthStatus === 'degraded') return '#f59e0b'  // Yellow
    return '#ef4444'  // Red
  }

  const getStatusLabel = (): string => {
    if (!status?.isEnabled) return 'Proxy disabled'
    if (status.healthStatus === 'healthy') return 'Proxy healthy'
    if (status.healthStatus === 'degraded') return 'Proxy degraded'
    return 'Proxy failed'
  }

  const handleClick = () => {
    onConfigClick?.()
  }

  return (
    <div className="proxy-indicator-container">
      <button
        className="proxy-indicator-dot"
        style={{
          backgroundColor: getStatusColor(),
          borderColor: status?.isEnabled ? '#374151' : '#9ca3af'
        }}
        onClick={handleClick}
        title={getStatusLabel()}
        aria-label="Proxy status indicator"
      />

      {/* Tooltip showing details on hover */}
      {status?.isEnabled && (
        <div className="proxy-indicator-tooltip">
          <div className="proxy-tooltip-row">
            <span className="proxy-tooltip-label">Status:</span>
            <span className="proxy-tooltip-value">
              {status.healthStatus === 'healthy' && '✓ Healthy'}
              {status.healthStatus === 'degraded' && '⚠ Degraded'}
              {status.healthStatus === 'failed' && '✗ Failed'}
            </span>
          </div>

          {status.activeConfig && (
            <div className="proxy-tooltip-row">
              <span className="proxy-tooltip-label">Proxy:</span>
              <span className="proxy-tooltip-value">{status.activeConfig.nickname}</span>
            </div>
          )}

          {status.outboundIp && (
            <div className="proxy-tooltip-row">
              <span className="proxy-tooltip-label">IP:</span>
              <span className="proxy-tooltip-value">{status.outboundIp}</span>
            </div>
          )}

          {status.healthCheckMessage && (
            <div className="proxy-tooltip-row proxy-tooltip-error">
              <span className="proxy-tooltip-label">Error:</span>
              <span className="proxy-tooltip-value">{status.healthCheckMessage}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
