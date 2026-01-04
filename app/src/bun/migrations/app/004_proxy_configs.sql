-- =============================================================================
-- Migration 004: Create proxy configuration tables
-- =============================================================================

CREATE TABLE IF NOT EXISTS proxy_configs (
  id TEXT PRIMARY KEY,
  nickname TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('http', 'socks5')),
  hostname TEXT NOT NULL,
  port INTEGER NOT NULL CHECK (port >= 1 AND port <= 65535),
  username TEXT,
  password TEXT,
  is_active INTEGER NOT NULL DEFAULT 0 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Ensure only one active proxy at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_proxy_active
  ON proxy_configs(is_active) WHERE is_active = 1;

-- Trigger to ensure only one active proxy
CREATE TRIGGER IF NOT EXISTS proxy_activate
  BEFORE UPDATE OF is_active ON proxy_configs
  WHEN NEW.is_active = 1
  BEGIN
    UPDATE proxy_configs SET is_active = 0 WHERE is_active = 1 AND id != NEW.id;
  END;

-- Health check history (optional, for tracking)
CREATE TABLE IF NOT EXISTS proxy_health_checks (
  id TEXT PRIMARY KEY,
  proxy_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'failed')),
  outbound_ip TEXT,
  user_ip TEXT,
  error_message TEXT,
  checked_at TEXT NOT NULL,
  FOREIGN KEY (proxy_id) REFERENCES proxy_configs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_proxy_health_recent
  ON proxy_health_checks(proxy_id, checked_at DESC);
