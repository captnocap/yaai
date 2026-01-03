-- Up

-- Credentials table (encrypted API keys per provider)
CREATE TABLE IF NOT EXISTS credentials (
  id TEXT PRIMARY KEY,
  api_key_encrypted TEXT NOT NULL,
  base_url TEXT,
  metadata TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- App settings (key-value store with dot-path keys)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Provider configurations
CREATE TABLE IF NOT EXISTS provider_configs (
  id TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL DEFAULT 1,
  default_model TEXT,
  base_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- User's model list
CREATE TABLE IF NOT EXISTS user_models (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  model_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  context_window INTEGER,
  max_output INTEGER,
  supports_vision INTEGER NOT NULL DEFAULT 0,
  supports_tools INTEGER NOT NULL DEFAULT 0,
  input_price REAL,
  output_price REAL,
  is_default INTEGER NOT NULL DEFAULT 0,
  enabled INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(provider, model_id)
);

CREATE INDEX IF NOT EXISTS idx_user_models_provider ON user_models(provider);
CREATE INDEX IF NOT EXISTS idx_user_models_enabled ON user_models(enabled);

-- Down

DROP INDEX IF EXISTS idx_user_models_enabled;
DROP INDEX IF EXISTS idx_user_models_provider;
DROP TABLE IF EXISTS user_models;
DROP TABLE IF EXISTS provider_configs;
DROP TABLE IF EXISTS settings;
DROP TABLE IF EXISTS credentials;
