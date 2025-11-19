-- Fix RLS Policies for copy_trade_bots table
-- Run this in Supabase SQL Editor if you already created the table
-- This adds the missing RLS policies

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own bots" ON copy_trade_bots;
DROP POLICY IF EXISTS "Service role can view all bots" ON copy_trade_bots;
DROP POLICY IF EXISTS "Users can insert own bots" ON copy_trade_bots;
DROP POLICY IF EXISTS "Service role can insert bots" ON copy_trade_bots;
DROP POLICY IF EXISTS "Users can update own bots" ON copy_trade_bots;
DROP POLICY IF EXISTS "Service role can update bots" ON copy_trade_bots;
DROP POLICY IF EXISTS "Users can delete own bots" ON copy_trade_bots;
DROP POLICY IF EXISTS "Service role can delete bots" ON copy_trade_bots;

-- Enable Row Level Security (if not already enabled)
ALTER TABLE copy_trade_bots ENABLE ROW LEVEL SECURITY;

-- SECURITY POLICIES:
-- NOTE: Backend API uses service role key in connection string, which bypasses RLS automatically
-- These policies are for additional security if frontend ever accesses directly (it shouldn't)

-- Policy: Users can view their own bots only (if accessing via Supabase client)
CREATE POLICY "Users can view own bots"
  ON copy_trade_bots
  FOR SELECT
  USING (auth.uid()::text = user_id::text);

-- Policy: Service role can view all bots (for Supabase client access)
CREATE POLICY "Service role can view all bots"
  ON copy_trade_bots
  FOR SELECT
  USING (auth.jwt()->>'role' = 'service_role');

-- Policy: Users can insert their own bots (if accessing via Supabase client)
CREATE POLICY "Users can insert own bots"
  ON copy_trade_bots
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

-- Policy: Service role can insert bots (for Supabase client access)
CREATE POLICY "Service role can insert bots"
  ON copy_trade_bots
  FOR INSERT
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Policy: Users can update their own bots only (if accessing via Supabase client)
CREATE POLICY "Users can update own bots"
  ON copy_trade_bots
  FOR UPDATE
  USING (auth.uid()::text = user_id::text)
  WITH CHECK (auth.uid()::text = user_id::text);

-- Policy: Service role can update all bots (for Supabase client access)
CREATE POLICY "Service role can update bots"
  ON copy_trade_bots
  FOR UPDATE
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Policy: Users can delete their own bots only (if accessing via Supabase client)
CREATE POLICY "Users can delete own bots"
  ON copy_trade_bots
  FOR DELETE
  USING (auth.uid()::text = user_id::text);

-- Policy: Service role can delete bots (for Supabase client access)
CREATE POLICY "Service role can delete bots"
  ON copy_trade_bots
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
WHERE tablename = 'copy_trade_bots'
ORDER BY policyname;

