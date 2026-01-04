-- Up

-- Variables table (all variable types stored in single table)
CREATE TABLE IF NOT EXISTS variables (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('system', 'app-level', 'wildcard', 'rest-api', 'javascript')),
  scope TEXT NOT NULL CHECK (scope IN ('system', 'app', 'chat')),
  description TEXT,
  is_enabled INTEGER NOT NULL DEFAULT 1 CHECK (is_enabled IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),

  -- App-level specific
  value TEXT,

  -- Wildcard specific
  wildcard_options TEXT,              -- JSON array of options
  wildcard_allow_duplicates INTEGER DEFAULT 0,
  wildcard_cache_duration INTEGER,    -- ms to cache selection

  -- REST API specific
  rest_method TEXT CHECK (rest_method IN ('GET', 'POST', 'PUT', 'PATCH', 'DELETE')),
  rest_url TEXT,
  rest_headers TEXT,                  -- JSON object, encrypted
  rest_body TEXT,                     -- JSON, encrypted
  rest_auth_type TEXT CHECK (rest_auth_type IN ('bearer', 'basic', 'api-key')),
  rest_auth_value TEXT,               -- Encrypted
  rest_auth_key_name TEXT,            -- For api-key type header name
  rest_timeout INTEGER DEFAULT 10000,
  rest_retries INTEGER DEFAULT 1,
  rest_cache_enabled INTEGER DEFAULT 0,
  rest_cache_duration INTEGER,        -- ms
  rest_response_parser_type TEXT CHECK (rest_response_parser_type IN ('text', 'json-path', 'regex')),
  rest_response_parser_selector TEXT,
  rest_response_parser_default TEXT,

  -- JavaScript specific
  js_code TEXT,                       -- Encrypted
  js_timeout INTEGER DEFAULT 5000
);

CREATE INDEX IF NOT EXISTS idx_variables_name ON variables(name);
CREATE INDEX IF NOT EXISTS idx_variables_type ON variables(type);
CREATE INDEX IF NOT EXISTS idx_variables_scope ON variables(scope);
CREATE INDEX IF NOT EXISTS idx_variables_enabled ON variables(is_enabled);

-- Variable test history (optional, for debugging)
CREATE TABLE IF NOT EXISTS variable_tests (
  id TEXT PRIMARY KEY,
  variable_id TEXT NOT NULL,
  success INTEGER NOT NULL CHECK (success IN (0, 1)),
  data TEXT,                          -- Resolved value on success
  error TEXT,                         -- Error message on failure
  duration INTEGER,                   -- ms
  tested_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (variable_id) REFERENCES variables(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_variable_tests_var ON variable_tests(variable_id, tested_at DESC);

-- Down

DROP INDEX IF EXISTS idx_variable_tests_var;
DROP TABLE IF EXISTS variable_tests;
DROP INDEX IF EXISTS idx_variables_enabled;
DROP INDEX IF EXISTS idx_variables_scope;
DROP INDEX IF EXISTS idx_variables_type;
DROP INDEX IF EXISTS idx_variables_name;
DROP TABLE IF EXISTS variables;
