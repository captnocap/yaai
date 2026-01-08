// =============================================================================
// CLAUDE CODE SETTINGS PAGE
// =============================================================================
// Configuration page for Claude Code CLI integration settings.

import React from 'react';
import { SettingsGroup } from '../general/SettingsGroup';
import { SettingRow } from '../general/SettingRow';
import { useClaudeCodeConfig } from '../../../hooks/useClaudeCodeConfig';
import { Download, Upload, RotateCcw } from 'lucide-react';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface ClaudeCodeSettingsPageProps {
  className?: string;
}

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function ClaudeCodeSettingsPage({ className }: ClaudeCodeSettingsPageProps) {
  const {
    config,
    updateValue,
    resetAll,
    exportConfig,
    importConfig,
  } = useClaudeCodeConfig();

  // Handle file import
  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target?.result as string;
          importConfig(content);
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  return (
    <div
      className={className}
      style={{
        padding: '24px',
        maxWidth: '720px',
      }}
    >
      {/* Header with actions */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: '20px',
              fontWeight: 600,
              color: 'var(--color-text)',
            }}
          >
            Claude Code
          </h2>
          <p
            style={{
              margin: '4px 0 0',
              fontSize: '13px',
              color: 'var(--color-text-tertiary)',
            }}
          >
            Configure Claude Code CLI integration and storage settings
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <ActionButton icon={Download} label="Export" onClick={exportConfig} />
          <ActionButton icon={Upload} label="Import" onClick={handleImport} />
          <ActionButton icon={RotateCcw} label="Reset" onClick={resetAll} danger />
        </div>
      </div>

      {/* CLI Configuration */}
      <SettingsGroup title="CLI Configuration">
        <SettingRow
          label="Executable Path"
          description="Path to Claude Code CLI (leave empty for auto-detection from PATH)"
          control="input"
          value={config.cli.executablePath}
          placeholder="Auto-detect from PATH"
          onChange={(value) => updateValue('cli.executablePath', value)}
        />
        <SettingRow
          label="Startup Timeout"
          description="Maximum time to wait for CLI to start (seconds)"
          control="select"
          value={String(config.cli.startupTimeoutMs / 1000)}
          options={[
            { value: '10', label: '10 seconds' },
            { value: '30', label: '30 seconds' },
            { value: '60', label: '1 minute' },
            { value: '120', label: '2 minutes' },
          ]}
          onChange={(value) => updateValue('cli.startupTimeoutMs', parseInt(value) * 1000)}
        />
        <SettingRow
          label="Operation Timeout"
          description="Maximum time for individual operations"
          control="select"
          value={String(config.cli.operationTimeoutMs / 60000)}
          options={[
            { value: '1', label: '1 minute' },
            { value: '5', label: '5 minutes' },
            { value: '10', label: '10 minutes' },
            { value: '30', label: '30 minutes' },
          ]}
          onChange={(value) => updateValue('cli.operationTimeoutMs', parseInt(value) * 60000)}
        />
      </SettingsGroup>

      {/* Storage Settings */}
      <SettingsGroup title="Storage">
        <SettingRow
          label="Storage Location"
          description="Where to store session data and transcripts"
          control="select"
          value={config.storage.strategy}
          options={[
            { value: 'local', label: 'Local (~/.yaai)' },
            { value: 'project', label: 'Per Project (.yaai folder)' },
            { value: 'custom', label: 'Custom Path' },
          ]}
          onChange={(value) => updateValue('storage.strategy', value)}
        />
        {config.storage.strategy === 'custom' && (
          <SettingRow
            label="Custom Storage Path"
            description="Full path to custom storage directory"
            control="input"
            value={config.storage.customPath}
            placeholder="/path/to/storage"
            onChange={(value) => updateValue('storage.customPath', value)}
          />
        )}
        <SettingRow
          label="Max Sessions"
          description="Maximum number of sessions to keep (0 = unlimited)"
          control="select"
          value={String(config.storage.maxSessions)}
          options={[
            { value: '0', label: 'Unlimited' },
            { value: '25', label: '25 sessions' },
            { value: '50', label: '50 sessions' },
            { value: '100', label: '100 sessions' },
            { value: '200', label: '200 sessions' },
          ]}
          onChange={(value) => updateValue('storage.maxSessions', parseInt(value))}
        />
        <SettingRow
          label="Max Storage Size"
          description="Maximum total storage size for sessions"
          control="select"
          value={String(config.storage.maxStorageMB)}
          options={[
            { value: '0', label: 'Unlimited' },
            { value: '256', label: '256 MB' },
            { value: '512', label: '512 MB' },
            { value: '1024', label: '1 GB' },
            { value: '2048', label: '2 GB' },
            { value: '5120', label: '5 GB' },
          ]}
          onChange={(value) => updateValue('storage.maxStorageMB', parseInt(value))}
        />
      </SettingsGroup>

      {/* Archive Settings */}
      <SettingsGroup title="Archival">
        <SettingRow
          label="Archive Policy"
          description="When to archive old sessions"
          control="select"
          value={config.archive.policy}
          options={[
            { value: 'never', label: 'Never archive' },
            { value: 'on_session_end', label: 'When session ends' },
            { value: 'daily', label: 'Daily' },
            { value: 'weekly', label: 'Weekly' },
            { value: 'monthly', label: 'Monthly' },
          ]}
          onChange={(value) => updateValue('archive.policy', value)}
        />
        {config.archive.policy !== 'never' && (
          <>
            <SettingRow
              label="Compress Archives"
              description="Compress archived sessions to save space"
              control="toggle"
              value={config.archive.compress}
              onChange={(value) => updateValue('archive.compress', value)}
            />
            <SettingRow
              label="Retention Period"
              description="Days to keep sessions before archiving"
              control="select"
              value={String(config.archive.retentionDays)}
              options={[
                { value: '7', label: '7 days' },
                { value: '14', label: '14 days' },
                { value: '30', label: '30 days' },
                { value: '60', label: '60 days' },
                { value: '90', label: '90 days' },
              ]}
              onChange={(value) => updateValue('archive.retentionDays', parseInt(value))}
            />
            <SettingRow
              label="Include Transcripts"
              description="Include full conversation transcripts in archives"
              control="toggle"
              value={config.archive.includeTranscripts}
              onChange={(value) => updateValue('archive.includeTranscripts', value)}
            />
            <SettingRow
              label="Include Snapshots"
              description="Include file snapshots in archives (increases size)"
              control="toggle"
              value={config.archive.includeSnapshots}
              onChange={(value) => updateValue('archive.includeSnapshots', value)}
            />
          </>
        )}
      </SettingsGroup>

      {/* Snapshot Settings */}
      <SettingsGroup title="Restore Points">
        <SettingRow
          label="Auto Snapshots"
          description="Automatically create restore points"
          control="toggle"
          value={config.snapshot.autoSnapshot}
          onChange={(value) => updateValue('snapshot.autoSnapshot', value)}
        />
        {config.snapshot.autoSnapshot && (
          <>
            <SettingRow
              label="Snapshot on File Edit"
              description="Create snapshot before every file modification"
              control="toggle"
              value={config.snapshot.snapshotOnFileEdit}
              onChange={(value) => updateValue('snapshot.snapshotOnFileEdit', value)}
            />
            <SettingRow
              label="Snapshot on Tool Call"
              description="Create snapshot before tool execution"
              control="toggle"
              value={config.snapshot.snapshotOnToolCall}
              onChange={(value) => updateValue('snapshot.snapshotOnToolCall', value)}
            />
          </>
        )}
        <SettingRow
          label="Max Snapshots Per Session"
          description="Maximum restore points per session (0 = unlimited)"
          control="select"
          value={String(config.snapshot.maxSnapshotsPerSession)}
          options={[
            { value: '0', label: 'Unlimited' },
            { value: '25', label: '25 snapshots' },
            { value: '50', label: '50 snapshots' },
            { value: '100', label: '100 snapshots' },
            { value: '200', label: '200 snapshots' },
          ]}
          onChange={(value) => updateValue('snapshot.maxSnapshotsPerSession', parseInt(value))}
        />
        <SettingRow
          label="Max Snapshot Storage"
          description="Maximum storage for snapshots"
          control="select"
          value={String(config.snapshot.maxSnapshotStorageMB)}
          options={[
            { value: '0', label: 'Unlimited' },
            { value: '128', label: '128 MB' },
            { value: '256', label: '256 MB' },
            { value: '512', label: '512 MB' },
            { value: '1024', label: '1 GB' },
          ]}
          onChange={(value) => updateValue('snapshot.maxSnapshotStorageMB', parseInt(value))}
        />
        <SettingRow
          label="Max File Size"
          description="Maximum size of individual files to snapshot"
          control="select"
          value={String(config.snapshot.maxFileSizeMB)}
          options={[
            { value: '1', label: '1 MB' },
            { value: '5', label: '5 MB' },
            { value: '10', label: '10 MB' },
            { value: '25', label: '25 MB' },
            { value: '50', label: '50 MB' },
          ]}
          onChange={(value) => updateValue('snapshot.maxFileSizeMB', parseInt(value))}
        />
      </SettingsGroup>

      {/* Tool Approvals & Display */}
      <SettingsGroup title="Tool Approvals & Display">
        <SettingRow
          label="Auto-approve All Tool Calls"
          description="Automatically approve all file writes and shell commands. Use with caution - Claude will execute without asking."
          control="toggle"
          value={config.session.alwaysYesTool}
          onChange={(value) => updateValue('session.alwaysYesTool', value)}
        />
        {config.session.alwaysYesTool && (
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: 'rgba(234, 179, 8, 0.1)',
              border: '1px solid rgba(234, 179, 8, 0.3)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '12px',
            }}
          >
            <p style={{ margin: 0, fontSize: '13px', color: 'rgb(234, 179, 8)' }}>
              Warning: Auto-approve is enabled. Claude will execute file writes and shell commands without confirmation.
            </p>
          </div>
        )}
        <SettingRow
          label="Display Mode"
          description="How to display Claude's responses - streaming shows text as it arrives, complete waits for the full response"
          control="select"
          value={config.session.displayMode}
          options={[
            { value: 'streaming', label: 'Streaming (live updates)' },
            { value: 'complete', label: 'Complete responses' },
          ]}
          onChange={(value) => updateValue('session.displayMode', value)}
        />
        <SettingRow
          label="Show Document Viewer"
          description="Show the document viewer panel by default when Claude Code is active"
          control="toggle"
          value={config.session.showDocumentViewer}
          onChange={(value) => updateValue('session.showDocumentViewer', value)}
        />
        <SettingRow
          label="Confirm File Writes"
          description="Require confirmation before writing files (overridden by auto-approve)"
          control="toggle"
          value={config.session.confirmFileWrites}
          onChange={(value) => updateValue('session.confirmFileWrites', value)}
          disabled={config.session.alwaysYesTool}
        />
        <SettingRow
          label="Confirm Shell Commands"
          description="Require confirmation before executing shell commands (overridden by auto-approve)"
          control="toggle"
          value={config.session.confirmShellCommands}
          onChange={(value) => updateValue('session.confirmShellCommands', value)}
          disabled={config.session.alwaysYesTool}
        />
      </SettingsGroup>

      {/* Session Behavior */}
      <SettingsGroup title="Session Behavior">
        <SettingRow
          label="Auto-start Last Session"
          description="Automatically resume the last session on app launch"
          control="toggle"
          value={config.session.autoStartLastSession}
          onChange={(value) => updateValue('session.autoStartLastSession', value)}
        />
        <SettingRow
          label="Remember Layout"
          description="Remember window layout per project"
          control="toggle"
          value={config.session.rememberLayout}
          onChange={(value) => updateValue('session.rememberLayout', value)}
        />
        <SettingRow
          label="Default Model"
          description="Default model for new sessions (empty = CLI default)"
          control="input"
          value={config.session.defaultModel}
          placeholder="CLI default"
          onChange={(value) => updateValue('session.defaultModel', value)}
        />
      </SettingsGroup>

      {/* Logging */}
      <SettingsGroup title="Logging & Debugging">
        <SettingRow
          label="Log Level"
          description="Amount of detail to log"
          control="select"
          value={config.logging.level}
          options={[
            { value: 'none', label: 'None' },
            { value: 'errors', label: 'Errors only' },
            { value: 'warnings', label: 'Warnings & Errors' },
            { value: 'info', label: 'Info' },
            { value: 'debug', label: 'Debug' },
            { value: 'verbose', label: 'Verbose' },
          ]}
          onChange={(value) => updateValue('logging.level', value)}
        />
        <SettingRow
          label="Log to File"
          description="Write logs to a file for later review"
          control="toggle"
          value={config.logging.logToFile}
          onChange={(value) => updateValue('logging.logToFile', value)}
        />
        {config.logging.logToFile && (
          <>
            <SettingRow
              label="Log File Path"
              description="Custom log file location (empty = default)"
              control="input"
              value={config.logging.logFilePath}
              placeholder="Default location"
              onChange={(value) => updateValue('logging.logFilePath', value)}
            />
            <SettingRow
              label="Max Log File Size"
              description="Maximum log file size before rotation"
              control="select"
              value={String(config.logging.maxLogFileMB)}
              options={[
                { value: '10', label: '10 MB' },
                { value: '25', label: '25 MB' },
                { value: '50', label: '50 MB' },
                { value: '100', label: '100 MB' },
              ]}
              onChange={(value) => updateValue('logging.maxLogFileMB', parseInt(value))}
            />
            <SettingRow
              label="Log Rotation Count"
              description="Number of rotated log files to keep"
              control="select"
              value={String(config.logging.logRotationCount)}
              options={[
                { value: '1', label: '1 file' },
                { value: '3', label: '3 files' },
                { value: '5', label: '5 files' },
                { value: '10', label: '10 files' },
              ]}
              onChange={(value) => updateValue('logging.logRotationCount', parseInt(value))}
            />
          </>
        )}
        <SettingRow
          label="Capture Process Output"
          description="Include CLI stdout in logs"
          control="toggle"
          value={config.logging.captureStdout}
          onChange={(value) => updateValue('logging.captureStdout', value)}
        />
        <SettingRow
          label="Capture Error Output"
          description="Include CLI stderr in logs"
          control="toggle"
          value={config.logging.captureStderr}
          onChange={(value) => updateValue('logging.captureStderr', value)}
        />
      </SettingsGroup>

      {/* Multi-Agent (Advanced) */}
      <SettingsGroup title="Advanced" defaultOpen={false}>
        <SettingRow
          label="Enable Multi-Agent"
          description="Enable multi-agent orchestration features (experimental)"
          control="toggle"
          value={config.session.enableMultiAgent}
          onChange={(value) => updateValue('session.enableMultiAgent', value)}
        />
        {config.session.enableMultiAgent && (
          <SettingRow
            label="Max Concurrent Tasks"
            description="Maximum number of concurrent agent tasks"
            control="select"
            value={String(config.session.maxConcurrentTasks)}
            options={[
              { value: '1', label: '1 task' },
              { value: '2', label: '2 tasks' },
              { value: '3', label: '3 tasks' },
              { value: '5', label: '5 tasks' },
            ]}
            onChange={(value) => updateValue('session.maxConcurrentTasks', parseInt(value))}
          />
        )}
      </SettingsGroup>
    </div>
  );
}

// -----------------------------------------------------------------------------
// ACTION BUTTON
// -----------------------------------------------------------------------------

function ActionButton({
  icon: Icon,
  label,
  onClick,
  danger = false,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 12px',
        fontSize: '13px',
        fontWeight: 500,
        backgroundColor: danger ? 'rgba(239, 68, 68, 0.1)' : 'var(--color-bg-tertiary)',
        color: danger ? 'rgb(239, 68, 68)' : 'var(--color-text-secondary)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}
