-- Migration: Create feedbacks table
-- Run this in Supabase SQL Editor

-- Create feedbacks table
CREATE TABLE IF NOT EXISTS feedbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT fk_feedbacks_user_id 
    FOREIGN KEY (user_id) 
    REFERENCES users(id) 
    ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_feedbacks_user_id ON feedbacks(user_id);
CREATE INDEX IF NOT EXISTS idx_feedbacks_created_at ON feedbacks(created_at);

-- Add comments for documentation
COMMENT ON TABLE feedbacks IS 'Stores user feedback submissions';
COMMENT ON COLUMN feedbacks.user_id IS 'User who submitted the feedback';
COMMENT ON COLUMN feedbacks.title IS 'Feedback title (max 200 characters)';
COMMENT ON COLUMN feedbacks.message IS 'Feedback message (max 5000 characters)';

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_feedbacks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER feedbacks_updated_at
  BEFORE UPDATE ON feedbacks
  FOR EACH ROW
  EXECUTE FUNCTION update_feedbacks_updated_at();

-- Enable Row Level Security (RLS) - Important for security!
ALTER TABLE feedbacks ENABLE ROW LEVEL SECURITY;

-- SECURITY POLICIES:
-- NOTE: Backend API uses service role key in connection string, which bypasses RLS automatically
-- These policies are for additional security if frontend ever accesses directly (it shouldn't)

-- Policy: Users can view their own feedbacks only (if accessing via Supabase client)
CREATE POLICY "Users can view own feedbacks"
  ON feedbacks
  FOR SELECT
  USING (auth.uid()::text = user_id::text);

-- Policy: Service role can view all feedbacks (for Supabase client access)
CREATE POLICY "Service role can view all feedbacks"
  ON feedbacks
  FOR SELECT
  USING (auth.jwt()->>'role' = 'service_role');

-- Policy: Users can insert their own feedbacks (if accessing via Supabase client)
CREATE POLICY "Users can insert own feedbacks"
  ON feedbacks
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

-- Policy: Service role can insert feedbacks (for Supabase client access)
CREATE POLICY "Service role can insert feedbacks"
  ON feedbacks
  FOR INSERT
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Policy: Users can update their own feedbacks only (if accessing via Supabase client)
CREATE POLICY "Users can update own feedbacks"
  ON feedbacks
  FOR UPDATE
  USING (auth.uid()::text = user_id::text)
  WITH CHECK (auth.uid()::text = user_id::text);

-- Policy: Service role can update all feedbacks (for Supabase client access)
CREATE POLICY "Service role can update feedbacks"
  ON feedbacks
  FOR UPDATE
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Policy: Users can delete their own feedbacks only (if accessing via Supabase client)
CREATE POLICY "Users can delete own feedbacks"
  ON feedbacks
  FOR DELETE
  USING (auth.uid()::text = user_id::text);

-- Policy: Service role can delete feedbacks (for Supabase client access)
CREATE POLICY "Service role can delete feedbacks"
  ON feedbacks
  FOR DELETE
  USING (auth.jwt()->>'role' = 'service_role');

-- Verify table creation
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'feedbacks'
ORDER BY ordinal_position;

-- Verify RLS policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'feedbacks'
ORDER BY policyname;

