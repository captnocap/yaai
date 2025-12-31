/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

/**
 * Format number to compact form (1234 -> 1.2K)
 */
export function formatCompact(num: number): string {
  if (num < 1000) return num.toString();
  const suffixes = ['', 'K', 'M', 'B', 'T'];
  const i = Math.floor(Math.log10(num) / 3);
  const scaled = num / Math.pow(1000, i);
  return `${scaled.toFixed(scaled < 10 ? 1 : 0)}${suffixes[i]}`;
}

/**
 * Format relative time (2 minutes ago, yesterday, etc.)
 */
export function formatRelativeTime(date: Date | string | number): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 10) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;

  return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Format time (3:45 PM)
 */
export function formatTime(date: Date | string | number): string {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format full datetime
 */
export function formatDateTime(date: Date | string | number): string {
  const d = new Date(date);
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${formatTime(d)}`;
}

/**
 * Format duration in ms to human readable
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const sec = ms / 1000;
  if (sec < 60) return `${sec.toFixed(1)}s`;
  const min = Math.floor(sec / 60);
  const remSec = Math.floor(sec % 60);
  return `${min}m ${remSec}s`;
}
