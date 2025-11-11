-- Migration: Remove theme, notifications fields and add username
-- Run this in Supabase SQL Editor if you have an existing database

-- Add username column (if it doesn't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'username'
  ) THEN
    ALTER TABLE users ADD COLUMN username TEXT UNIQUE;
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
  END IF;
END $$;

-- Remove theme column (if it exists)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'theme'
  ) THEN
    ALTER TABLE users DROP COLUMN theme;
  END IF;
END $$;

-- Remove notifications_enabled column (if it exists)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'notifications_enabled'
  ) THEN
    ALTER TABLE users DROP COLUMN notifications_enabled;
  END IF;
END $$;

-- Remove email_notifications column (if it exists)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'email_notifications'
  ) THEN
    ALTER TABLE users DROP COLUMN email_notifications;
  END IF;
END $$;

-- Remove settings_updated_at column (if it exists)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'settings_updated_at'
  ) THEN
    ALTER TABLE users DROP COLUMN settings_updated_at;
  END IF;
END $$;

-- Verify changes
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

