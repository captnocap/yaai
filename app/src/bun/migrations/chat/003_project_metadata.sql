-- Up

-- Add project metadata columns to chats table
ALTER TABLE chats ADD COLUMN last_interacted_at TEXT;
ALTER TABLE chats ADD COLUMN is_pinned INTEGER NOT NULL DEFAULT 0;
ALTER TABLE chats ADD COLUMN is_archived INTEGER NOT NULL DEFAULT 0;

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_chats_last_interacted_at ON chats(last_interacted_at DESC);
CREATE INDEX IF NOT EXISTS idx_chats_is_pinned ON chats(is_pinned);
CREATE INDEX IF NOT EXISTS idx_chats_is_archived ON chats(is_archived);

-- Backfill: Set last_interacted_at to the latest message timestamp for each chat
-- If no messages, use the chat's updated_at
UPDATE chats SET last_interacted_at = COALESCE(
  (SELECT MAX(timestamp) FROM messages WHERE chat_id = chats.id),
  updated_at
);

-- Drop the existing trigger and recreate with last_interacted_at support
DROP TRIGGER IF EXISTS chat_updated_on_message;

CREATE TRIGGER chat_updated_on_message AFTER INSERT ON messages BEGIN
  UPDATE chats
  SET updated_at = datetime('now'),
      last_interacted_at = datetime('now')
  WHERE id = NEW.chat_id;
END;

-- Down

DROP TRIGGER IF EXISTS chat_updated_on_message;

-- Recreate original trigger
CREATE TRIGGER chat_updated_on_message AFTER INSERT ON messages BEGIN
  UPDATE chats SET updated_at = datetime('now') WHERE id = NEW.chat_id;
END;

DROP INDEX IF EXISTS idx_chats_is_archived;
DROP INDEX IF EXISTS idx_chats_is_pinned;
DROP INDEX IF EXISTS idx_chats_last_interacted_at;

-- SQLite doesn't support DROP COLUMN in older versions, so we leave the columns
-- In production, would need to recreate the table without these columns
