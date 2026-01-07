-- Migration: Add extended model type columns
-- Up
ALTER TABLE credentials ADD COLUMN embedding_endpoint TEXT;
ALTER TABLE credentials ADD COLUMN embedding_models TEXT DEFAULT '[]';
ALTER TABLE credentials ADD COLUMN video_endpoint TEXT;
ALTER TABLE credentials ADD COLUMN video_models TEXT DEFAULT '[]';
ALTER TABLE credentials ADD COLUMN tts_endpoint TEXT;
ALTER TABLE credentials ADD COLUMN tts_models TEXT DEFAULT '[]';
ALTER TABLE credentials ADD COLUMN tee_endpoint TEXT;
ALTER TABLE credentials ADD COLUMN tee_models TEXT DEFAULT '[]';

-- Down
-- SQLite doesn't support DROP COLUMN in older versions
