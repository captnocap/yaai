-- Up

-- =============================================================================
-- CLAUDE CODE PROJECTS
-- =============================================================================
-- Cached Claude Code projects from ~/.claude/projects/
-- Enables unified navigation alongside chat projects

CREATE TABLE IF NOT EXISTS claude_projects (
  id TEXT PRIMARY KEY,                    -- Encoded path as ID (e.g., '-home-user-project')
  project_path TEXT NOT NULL UNIQUE,      -- Actual filesystem path
  title TEXT NOT NULL,                    -- Directory name or custom title

  -- Metadata
  description TEXT,
  session_count INTEGER DEFAULT 0,
  last_session_id TEXT,

  -- Organization
  is_pinned INTEGER NOT NULL DEFAULT 0,
  is_archived INTEGER NOT NULL DEFAULT 0,

  -- Timestamps (ISO 8601 strings)
  last_interacted_at TEXT,                -- Last time opened in YAAI
  last_synced_at TEXT,                    -- Last sync from ~/.claude
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_claude_projects_last_interacted
  ON claude_projects(last_interacted_at DESC);
CREATE INDEX IF NOT EXISTS idx_claude_projects_pinned
  ON claude_projects(is_pinned);
CREATE INDEX IF NOT EXISTS idx_claude_projects_archived
  ON claude_projects(is_archived);
CREATE INDEX IF NOT EXISTS idx_claude_projects_path
  ON claude_projects(project_path);

-- =============================================================================
-- REVIEW COMMENTS
-- =============================================================================
-- Line-by-line comments for document viewer review feature

CREATE TABLE IF NOT EXISTS review_comments (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  file_path TEXT NOT NULL,

  -- Line range
  start_line INTEGER NOT NULL,
  end_line INTEGER,                       -- NULL if single line

  -- Content
  content TEXT NOT NULL,

  -- State
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'resolved', 'dismissed')),

  -- Timestamps
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  sent_at TEXT,
  resolved_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_review_comments_session
  ON review_comments(session_id);
CREATE INDEX IF NOT EXISTS idx_review_comments_session_file
  ON review_comments(session_id, file_path);
CREATE INDEX IF NOT EXISTS idx_review_comments_status
  ON review_comments(status);

-- =============================================================================
-- TOOL PERMISSIONS
-- =============================================================================
-- Persistent "Always" permissions for tool calls

CREATE TABLE IF NOT EXISTS tool_permissions (
  id TEXT PRIMARY KEY,
  tool_name TEXT NOT NULL UNIQUE,         -- e.g., 'Write', 'Bash', 'Edit'
  permission TEXT NOT NULL DEFAULT 'ask'
    CHECK (permission IN ('ask', 'allow', 'deny')),

  -- Metadata
  last_used_at TEXT,
  use_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tool_permissions_name
  ON tool_permissions(tool_name);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Update claude_projects timestamp when modified
CREATE TRIGGER IF NOT EXISTS claude_projects_updated
AFTER UPDATE ON claude_projects
BEGIN
  UPDATE claude_projects SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- Update tool_permissions timestamp when modified
CREATE TRIGGER IF NOT EXISTS tool_permissions_updated
AFTER UPDATE ON tool_permissions
BEGIN
  UPDATE tool_permissions SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- Down

DROP TRIGGER IF EXISTS tool_permissions_updated;
DROP TRIGGER IF EXISTS claude_projects_updated;

DROP INDEX IF EXISTS idx_tool_permissions_name;
DROP TABLE IF EXISTS tool_permissions;

DROP INDEX IF EXISTS idx_review_comments_status;
DROP INDEX IF EXISTS idx_review_comments_session_file;
DROP INDEX IF EXISTS idx_review_comments_session;
DROP TABLE IF EXISTS review_comments;

DROP INDEX IF EXISTS idx_claude_projects_path;
DROP INDEX IF EXISTS idx_claude_projects_archived;
DROP INDEX IF EXISTS idx_claude_projects_pinned;
DROP INDEX IF EXISTS idx_claude_projects_last_interacted;
DROP TABLE IF EXISTS claude_projects;
