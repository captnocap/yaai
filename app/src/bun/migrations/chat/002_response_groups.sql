-- Parallel Model Responses Schema
-- Allows storing multiple responses per user message and tracking selection

-- Up

-- Main response groups table
-- Links a user message to a collection of potential responses
CREATE TABLE IF NOT EXISTS response_groups (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  selected_response_id TEXT REFERENCES messages(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_response_groups_chat_id ON response_groups(chat_id);
CREATE INDEX IF NOT EXISTS idx_response_groups_user_msg ON response_groups(user_message_id);
CREATE INDEX IF NOT EXISTS idx_response_groups_selected ON response_groups(selected_response_id);
CREATE INDEX IF NOT EXISTS idx_response_groups_chat_updated ON response_groups(chat_id, updated_at DESC);

-- Junction table linking messages to response groups
-- Preserves display order via position
CREATE TABLE IF NOT EXISTS response_group_members (
  response_group_id TEXT NOT NULL REFERENCES response_groups(id) ON DELETE CASCADE,
  message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (response_group_id, message_id)
);

CREATE INDEX IF NOT EXISTS idx_rgm_group_position ON response_group_members(response_group_id, position);
CREATE INDEX IF NOT EXISTS idx_rgm_message ON response_group_members(message_id);

-- Add response_group_id column to messages table
ALTER TABLE messages ADD COLUMN response_group_id TEXT REFERENCES response_groups(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_messages_response_group ON messages(response_group_id);

-- Trigger to auto-update response_groups.updated_at when selection changes
CREATE TRIGGER IF NOT EXISTS response_group_selection_updated
AFTER UPDATE OF selected_response_id ON response_groups
BEGIN
  UPDATE response_groups SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- Down

DROP TRIGGER IF EXISTS response_group_selection_updated;
DROP INDEX IF EXISTS idx_messages_response_group;
-- Note: Cannot drop column from messages in SQLite, but it won't cause issues
DROP INDEX IF EXISTS idx_rgm_message;
DROP INDEX IF EXISTS idx_rgm_group_position;
DROP INDEX IF EXISTS idx_response_groups_chat_updated;
DROP INDEX IF EXISTS idx_response_groups_selected;
DROP INDEX IF EXISTS idx_response_groups_user_msg;
DROP INDEX IF EXISTS idx_response_groups_chat_id;
DROP TABLE IF EXISTS response_group_members;
DROP TABLE IF EXISTS response_groups;
