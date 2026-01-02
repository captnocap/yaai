// =============================================================================
// LOG DRAWER
// =============================================================================
// Collapsible drawer showing job history and logs.

import React from 'react';
import {
  ChevronUp,
  ChevronDown,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';
import type { Job } from '../../../types/image-gen';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface LogDrawerProps {
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  jobHistory: Job[];
}

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function LogDrawer({
  expanded,
  onExpandedChange,
  jobHistory,
}: LogDrawerProps) {
  const successCount = jobHistory.filter(j => j.state === 'completed').length;
  const failedCount = jobHistory.filter(j => j.state === 'failed').length;
  const cancelledCount = jobHistory.filter(j => j.state === 'cancelled').length;

  return (
    <div
      style={{
        borderTop: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-bg-elevated)',
      }}
    >
      {/* Header / Toggle */}
      <button
        onClick={() => onExpandedChange(!expanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '8px 16px',
          backgroundColor: 'transparent',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <span
            style={{
              fontSize: '12px',
              fontWeight: 500,
              color: 'var(--color-text-secondary)',
            }}
          >
            Job History
          </span>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            {successCount > 0 && (
              <StatBadge
                icon={<CheckCircle size={12} />}
                value={successCount}
                color="var(--color-success)"
              />
            )}
            {failedCount > 0 && (
              <StatBadge
                icon={<XCircle size={12} />}
                value={failedCount}
                color="var(--color-error)"
              />
            )}
            {cancelledCount > 0 && (
              <StatBadge
                icon={<AlertCircle size={12} />}
                value={cancelledCount}
                color="var(--color-warning)"
              />
            )}
          </div>
        </div>

        {expanded ? (
          <ChevronDown size={16} style={{ color: 'var(--color-text-tertiary)' }} />
        ) : (
          <ChevronUp size={16} style={{ color: 'var(--color-text-tertiary)' }} />
        )}
      </button>

      {/* Content */}
      {expanded && (
        <div
          className="custom-scrollbar"
          style={{
            maxHeight: '200px',
            overflowY: 'auto',
            borderTop: '1px solid var(--color-border)',
          }}
        >
          {jobHistory.length === 0 ? (
            <div
              style={{
                padding: '24px',
                textAlign: 'center',
                color: 'var(--color-text-tertiary)',
                fontSize: '12px',
              }}
            >
              No completed jobs yet
            </div>
          ) : (
            jobHistory.map((job) => (
              <LogEntry key={job.id} job={job} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// STAT BADGE
// -----------------------------------------------------------------------------

interface StatBadgeProps {
  icon: React.ReactNode;
  value: number;
  color: string;
}

function StatBadge({ icon, value, color }: StatBadgeProps) {
  return (
    <span
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 6px',
        backgroundColor: `${color}20`,
        borderRadius: 'var(--radius-sm)',
        color,
        fontSize: '11px',
      }}
    >
      {icon}
      {value}
    </span>
  );
}

// -----------------------------------------------------------------------------
// LOG ENTRY
// -----------------------------------------------------------------------------

interface LogEntryProps {
  job: Job;
}

function LogEntry({ job }: LogEntryProps) {
  const getStatusIcon = () => {
    switch (job.state) {
      case 'completed':
        return <CheckCircle size={14} style={{ color: 'var(--color-success)' }} />;
      case 'failed':
        return <XCircle size={14} style={{ color: 'var(--color-error)' }} />;
      case 'cancelled':
        return <AlertCircle size={14} style={{ color: 'var(--color-warning)' }} />;
      default:
        return <Clock size={14} style={{ color: 'var(--color-text-tertiary)' }} />;
    }
  };

  const formatTime = (timestamp: number | null) => {
    if (!timestamp) return '--';
    const date = new Date(timestamp);
    return date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDuration = () => {
    if (!job.startedAt || !job.finishedAt) return '--';
    const durationMs = job.finishedAt - job.startedAt;
    const seconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(seconds / 60);
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '10px 16px',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      {getStatusIcon()}

      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: '12px',
            color: 'var(--color-text)',
          }}
        >
          Job {job.id.slice(0, 8)}
        </div>
        <div
          style={{
            fontSize: '11px',
            color: 'var(--color-text-tertiary)',
            marginTop: '2px',
          }}
        >
          {job.stats.totalImages} images ({job.stats.successfulBatches}/{job.stats.totalBatches} batches)
        </div>
      </div>

      <div
        style={{
          textAlign: 'right',
        }}
      >
        <div
          style={{
            fontSize: '11px',
            color: 'var(--color-text-secondary)',
          }}
        >
          {formatTime(job.finishedAt)}
        </div>
        <div
          style={{
            fontSize: '10px',
            color: 'var(--color-text-tertiary)',
          }}
        >
          {getDuration()}
        </div>
      </div>

      {job.lastError && (
        <div
          style={{
            padding: '4px 8px',
            backgroundColor: 'var(--color-error-subtle)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--color-error)',
            fontSize: '10px',
            maxWidth: '200px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
          title={job.lastError.message}
        >
          {job.lastError.message}
        </div>
      )}
    </div>
  );
}
