-- Migration: Add additional capability columns and model icon support
-- Version: 007
-- Description: Extends user_models with reasoning, search, code, files capabilities and custom icon

-- Add capability columns (using INTEGER for boolean, 0=false, 1=true)
ALTER TABLE user_models ADD COLUMN supports_reasoning INTEGER NOT NULL DEFAULT 0;
ALTER TABLE user_models ADD COLUMN supports_search INTEGER NOT NULL DEFAULT 0;
ALTER TABLE user_models ADD COLUMN supports_code INTEGER NOT NULL DEFAULT 0;
ALTER TABLE user_models ADD COLUMN supports_files INTEGER NOT NULL DEFAULT 0;

-- Add icon column for custom model icons (base64 data URL or path)
ALTER TABLE user_models ADD COLUMN icon TEXT;
