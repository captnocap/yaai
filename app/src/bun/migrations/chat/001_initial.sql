-- Up

-- Chats table
CREATE TABLE IF NOT EXISTS chats (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  prompt_id TEXT,
  default_model TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_chats_updated_at ON chats(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chats_created_at ON chats(created_at DESC);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  model TEXT,
  token_count INTEGER,
  generation_time INTEGER,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  branch_id TEXT,
  parent_id TEXT REFERENCES messages(id) ON DELETE SET NULL,
  is_liked INTEGER DEFAULT 0,
  metadata TEXT
);

CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_messages_branch_id ON messages(branch_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat_timestamp ON messages(chat_id, timestamp);

-- Attachments table
CREATE TABLE IF NOT EXISTS attachments (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  storage_path TEXT,
  url TEXT,
  metadata TEXT
);

CREATE INDEX IF NOT EXISTS idx_attachments_message_id ON attachments(message_id);

-- Tool calls table
CREATE TABLE IF NOT EXISTS tool_calls (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  input TEXT NOT NULL,
  output TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'success', 'error')),
  error TEXT,
  started_at TEXT,
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_tool_calls_message_id ON tool_calls(message_id);

-- Branches table
CREATE TABLE IF NOT EXISTS branches (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  parent_branch_id TEXT REFERENCES branches(id) ON DELETE SET NULL,
  fork_message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  name TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_branches_chat_id ON branches(chat_id);

-- Full-text search for messages
CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
  content,
  chat_id UNINDEXED,
  message_id UNINDEXED,
  tokenize='porter unicode61'
);

-- FTS triggers
CREATE TRIGGER IF NOT EXISTS messages_fts_insert AFTER INSERT ON messages BEGIN
  INSERT INTO messages_fts(content, chat_id, message_id)
  VALUES (NEW.content, NEW.chat_id, NEW.id);
END;

CREATE TRIGGER IF NOT EXISTS messages_fts_delete AFTER DELETE ON messages BEGIN
  INSERT INTO messages_fts(messages_fts, rowid, content, chat_id, message_id)
  VALUES ('delete', OLD.rowid, OLD.content, OLD.chat_id, OLD.id);
END;

CREATE TRIGGER IF NOT EXISTS messages_fts_update AFTER UPDATE OF content ON messages BEGIN
  INSERT INTO messages_fts(messages_fts, rowid, content, chat_id, message_id)
  VALUES ('delete', OLD.rowid, OLD.content, OLD.chat_id, OLD.id);
  INSERT INTO messages_fts(content, chat_id, message_id)
  VALUES (NEW.content, NEW.chat_id, NEW.id);
END;

-- Update chat.updated_at on message insert
CREATE TRIGGER IF NOT EXISTS chat_updated_on_message AFTER INSERT ON messages BEGIN
  UPDATE chats SET updated_at = datetime('now') WHERE id = NEW.chat_id;
END;

-- Migrations tracking table
CREATE TABLE IF NOT EXISTS _migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Down

DROP TRIGGER IF EXISTS chat_updated_on_message;
DROP TRIGGER IF EXISTS messages_fts_update;
DROP TRIGGER IF EXISTS messages_fts_delete;
DROP TRIGGER IF EXISTS messages_fts_insert;
DROP TABLE IF EXISTS messages_fts;
DROP TABLE IF EXISTS branches;
DROP TABLE IF EXISTS tool_calls;
DROP TABLE IF EXISTS attachments;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS chats;
DROP TABLE IF EXISTS _migrations;
