// =============================================================================
// JOB MONITOR
// =============================================================================
// Displays active jobs with progress bars and controls.

import React from 'react';
import { Pause, Play, X, Target, AlertCircle } from 'lucide-react';
import { IconButton } from '../../atoms/IconButton';
import { JobProgressBar } from './JobProgressBar';
import { TargetAdjuster } from './TargetAdjuster';
import type { Job } from '../../../types/image-gen';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface JobMonitorProps {
  jobs: Job[];
  onPauseJob: (jobId: string) => Promise<void>;
  onResumeJob: (jobId: string) => Promise<void>;
  onCancelJob: (jobId: string) => Promise<void>;
  onUpdateTarget: (jobId: string, target: number) => Promise<void>;
}

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function JobMonitor({
  jobs,
  onPauseJob,
  onResumeJob,
  onCancelJob,
  onUpdateTarget,
}: JobMonitorProps) {
  if (jobs.length === 0) return null;

  return (
    <div
      style={{
        padding: '12px 16px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px',
        }}
      >
        <h3
          style={{
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--color-text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            margin: 0,
          }}
        >
          Active Jobs ({jobs.length})
        </h3>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {jobs.map((job) => (
          <JobCard
            key={job.id}
            job={job}
            onPause={() => onPauseJob(job.id)}
            onResume={() => onResumeJob(job.id)}
            onCancel={() => onCancelJob(job.id)}
            onUpdateTarget={(target) => onUpdateTarget(job.id, target)}
          />
        ))}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// JOB CARD
// -----------------------------------------------------------------------------

interface JobCardProps {
  job: Job;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onUpdateTarget: (target: number) => void;
}

function JobCard({
  job,
  onPause,
  onResume,
  onCancel,
  onUpdateTarget,
}: JobCardProps) {
  const [showTargetAdjuster, setShowTargetAdjuster] = React.useState(false);

  const isPaused = job.state === 'paused';
  const isAutoPaused = job.autoPaused;
  const progress = job.stats.totalBatches / Math.max(job.stats.expectedBatches, 1);

  return (
    <div
      style={{
        padding: '12px',
        backgroundColor: 'var(--color-bg)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '8px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {/* Status indicator */}
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isAutoPaused
                ? 'var(--color-error)'
                : isPaused
                  ? 'var(--color-warning)'
                  : 'var(--color-success)',
            }}
          />

          <span
            style={{
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--color-text)',
            }}
          >
            Job {job.id.slice(0, 8)}
          </span>

          {isAutoPaused && (
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 6px',
                backgroundColor: 'var(--color-error-subtle)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--color-error)',
                fontSize: '11px',
              }}
            >
              <AlertCircle size={12} />
              Auto-paused
            </span>
          )}
        </div>

        {/* Controls */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <IconButton
            icon={<Target size={14} />}
            tooltip="Adjust target"
            size="sm"
            onClick={() => setShowTargetAdjuster(!showTargetAdjuster)}
          />

          {isPaused ? (
            <IconButton
              icon={<Play size={14} />}
              tooltip="Resume"
              size="sm"
              onClick={onResume}
            />
          ) : (
            <IconButton
              icon={<Pause size={14} />}
              tooltip="Pause"
              size="sm"
              onClick={onPause}
            />
          )}

          <IconButton
            icon={<X size={14} />}
            tooltip="Cancel"
            size="sm"
            onClick={() => {
              if (confirm('Cancel this job?')) {
                onCancel();
              }
            }}
          />
        </div>
      </div>

      {/* Progress bar */}
      <JobProgressBar
        progress={progress}
        stats={job.stats}
        isPaused={isPaused}
        isAutoPaused={isAutoPaused}
      />

      {/* Stats row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '8px',
          fontSize: '11px',
          color: 'var(--color-text-tertiary)',
        }}
      >
        <span>
          {job.stats.successfulBatches} / {job.stats.expectedBatches} batches
        </span>
        <span>
          {job.stats.totalImages} images ({job.stats.expectedImages} expected)
        </span>
        {job.stats.failedBatches > 0 && (
          <span style={{ color: 'var(--color-error)' }}>
            {job.stats.failedBatches} failed
          </span>
        )}
      </div>

      {/* Target adjuster */}
      {showTargetAdjuster && (
        <TargetAdjuster
          currentTarget={job.liveConfig.targetImages}
          currentProgress={job.stats.totalImages}
          onChange={onUpdateTarget}
          onClose={() => setShowTargetAdjuster(false)}
        />
      )}

      {/* Error message */}
      {job.lastError && (
        <div
          style={{
            marginTop: '8px',
            padding: '8px',
            backgroundColor: 'var(--color-error-subtle)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '11px',
            color: 'var(--color-error)',
          }}
        >
          {job.lastError.message}
          {job.lastError.hint && (
            <div style={{ marginTop: '4px', opacity: 0.8 }}>
              Hint: {job.lastError.hint}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
