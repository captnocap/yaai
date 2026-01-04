-- Up

-- Add columns for custom provider support
-- Note: repairAppSchema() in db/index.ts handles adding these columns if they don't exist,
-- as a defensive measure for databases where this migration may have been skipped.

-- These ALTER statements will fail if columns exist, but the migration system
-- will record them as applied anyway. The repair function ensures columns exist.
ALTER TABLE credentials ADD COLUMN name TEXT;
ALTER TABLE credentials ADD COLUMN format TEXT NOT NULL DEFAULT 'openai';
ALTER TABLE credentials ADD COLUMN brand_color TEXT;

-- Set default names and formats for existing built-in providers
UPDATE credentials SET name = 'Anthropic', format = 'anthropic' WHERE id = 'anthropic' AND (name IS NULL OR name = '');
UPDATE credentials SET name = 'OpenAI', format = 'openai' WHERE id = 'openai' AND (name IS NULL OR name = '');
UPDATE credentials SET name = 'Google', format = 'google' WHERE id = 'google' AND (name IS NULL OR name = '');

-- Down

-- SQLite doesn't support DROP COLUMN in older versions, so we'd need to recreate the table
-- For now, just document that this migration is not easily reversible
