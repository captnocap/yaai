-- Up

-- Drafts table for persisting in-progress input across sessions
CREATE TABLE IF NOT EXISTS drafts (
  project_id TEXT PRIMARY KEY,
  project_type TEXT NOT NULL CHECK (project_type IN ('chat', 'code', 'image', 'research')),
  content TEXT NOT NULL DEFAULT '',
  selected_model TEXT,
  attachments TEXT,  -- JSON array of attachment metadata
  metadata TEXT,     -- JSON object for mode-specific data (e.g., image gen settings)
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_drafts_project_type ON drafts(project_type);
CREATE INDEX IF NOT EXISTS idx_drafts_updated_at ON drafts(updated_at DESC);

-- Down

DROP INDEX IF EXISTS idx_drafts_updated_at;
DROP INDEX IF EXISTS idx_drafts_project_type;
DROP TABLE IF EXISTS drafts;
