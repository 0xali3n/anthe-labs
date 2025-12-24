-- Fix RLS Policies for feedbacks table
-- Run this in Supabase SQL Editor if you already created the table and enabled RLS
-- This adds the missing RLS policies

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own feedbacks" ON feedbacks;
DROP POLICY IF EXISTS "Service role can view all feedbacks" ON feedbacks;
DROP POLICY IF EXISTS "Users can insert own feedbacks" ON feedbacks;
DROP POLICY IF EXISTS "Service role can insert feedbacks" ON feedbacks;
DROP POLICY IF EXISTS "Users can update own feedbacks" ON feedbacks;
DROP POLICY IF EXISTS "Service role can update feedbacks" ON feedbacks;
DROP POLICY IF EXISTS "Users can delete own feedbacks" ON feedbacks;
DROP POLICY IF EXISTS "Service role can delete feedbacks" ON feedbacks;

-- Enable Row Level Security (if not already enabled)
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

-- Verify policies were created
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

