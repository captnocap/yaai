-- Up

-- Add columns for image model configuration
-- image_endpoint: URL suffix for image generation API (e.g., "/api/generate-image")
-- image_models: JSON array of ImageModelConfig objects

ALTER TABLE credentials ADD COLUMN image_endpoint TEXT;
ALTER TABLE credentials ADD COLUMN image_models TEXT DEFAULT '[]';

-- Down

-- SQLite doesn't support DROP COLUMN in older versions, so we'd need to recreate the table
-- For now, just document that this migration is not easily reversible
