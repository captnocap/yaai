-- Up

-- Add columns for custom provider support
ALTER TABLE credentials ADD COLUMN name TEXT;
ALTER TABLE credentials ADD COLUMN format TEXT NOT NULL DEFAULT 'openai';
ALTER TABLE credentials ADD COLUMN brand_color TEXT;

-- Set default names and formats for existing built-in providers
UPDATE credentials SET name = 'Anthropic', format = 'anthropic' WHERE id = 'anthropic';
UPDATE credentials SET name = 'OpenAI', format = 'openai' WHERE id = 'openai';
UPDATE credentials SET name = 'Google', format = 'google' WHERE id = 'google';

-- Down

-- SQLite doesn't support DROP COLUMN in older versions, so we'd need to recreate the table
-- For now, just document that this migration is not easily reversible
