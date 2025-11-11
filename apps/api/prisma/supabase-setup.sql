-- Create users table in Supabase
-- Run this in Supabase SQL Editor: https://app.supabase.com/project/YOUR_PROJECT/sql

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT, -- Original Google photo (never overwritten after first save)
  selected_avatar_url TEXT, -- User's chosen avatar (Google or custom)
  avatar_source TEXT, -- 'google' | 'custom' - tracks which avatar is selected
  
  -- Google OAuth data
  google_id TEXT UNIQUE,
  
  -- User metadata
  display_name TEXT,
  username TEXT UNIQUE, -- Unique username chosen by user
  bio TEXT,
  
  -- Social connections
  twitter_username TEXT,
  twitter_connected BOOLEAN DEFAULT false,
  twitter_user_id TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS) - Important for security!
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policies (adjust based on your needs)
-- Policy: Users can read their own data
CREATE POLICY "Users can view own data"
  ON users
  FOR SELECT
  USING (auth.uid() = id);

-- Policy: Users can update their own data
CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  USING (auth.uid() = id);

-- Policy: Users can insert their own data (for initial signup)
CREATE POLICY "Users can insert own data"
  ON users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Optional: Allow service role to do everything (for API)
-- This is needed if your NestJS API uses service role key
CREATE POLICY "Service role full access"
  ON users
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

