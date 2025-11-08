-- Migration: Add selected_avatar_url and avatar_source fields
-- Run this in Supabase SQL Editor if you have an existing database

-- Add selected_avatar_url column (if it doesn't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'selected_avatar_url'
  ) THEN
    ALTER TABLE users ADD COLUMN selected_avatar_url TEXT;
    -- Set existing avatar_url as selected_avatar_url for existing users
    UPDATE users SET selected_avatar_url = avatar_url WHERE avatar_url IS NOT NULL;
  END IF;
END $$;

-- Add avatar_source column (if it doesn't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'avatar_source'
  ) THEN
    ALTER TABLE users ADD COLUMN avatar_source TEXT;
    -- Set default to 'google' for existing users with avatar_url
    UPDATE users SET avatar_source = 'google' WHERE avatar_url IS NOT NULL;
  END IF;
END $$;

-- Verify changes
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'users' AND column_name IN ('avatar_url', 'selected_avatar_url', 'avatar_source')
ORDER BY ordinal_position;

