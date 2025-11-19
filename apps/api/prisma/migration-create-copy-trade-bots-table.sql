-- Migration: Create copy_trade_bots table
-- This table stores copy trading bot configurations and status for users
-- Run this in Supabase SQL Editor

-- Create copy_trade_bots table
CREATE TABLE IF NOT EXISTS copy_trade_bots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  trader_address TEXT,
  allocated_amount DECIMAL(20, 2) NOT NULL,
  allocation_percent DECIMAL(5, 2) NOT NULL,
  mode TEXT NOT NULL DEFAULT 'smart_ratio',
  status TEXT NOT NULL DEFAULT 'running',
  
  -- Stats (will be fetched from different table in future, mock for now)
  total_trades INTEGER NOT NULL DEFAULT 0,
  pnl DECIMAL(20, 2) NOT NULL DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  stopped_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  CONSTRAINT fk_copy_trade_bots_user_id 
    FOREIGN KEY (user_id) 
    REFERENCES users(id) 
    ON DELETE CASCADE,
  
  -- Validation constraints
  CONSTRAINT check_allocation_percent 
    CHECK (allocation_percent >= 0 AND allocation_percent <= 100),
  CONSTRAINT check_allocated_amount 
    CHECK (allocated_amount >= 0),
  CONSTRAINT check_mode 
    CHECK (mode IN ('smart_ratio', 'fixed_amount', 'advanced')),
  CONSTRAINT check_status 
    CHECK (status IN ('running', 'stopped'))
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_copy_trade_bots_user_id ON copy_trade_bots(user_id);
CREATE INDEX IF NOT EXISTS idx_copy_trade_bots_trader_address ON copy_trade_bots(trader_address);
CREATE INDEX IF NOT EXISTS idx_copy_trade_bots_status ON copy_trade_bots(status);

-- Add comments for documentation
COMMENT ON TABLE copy_trade_bots IS 'Stores copy trading bot configurations and status for users. Each bot tracks allocation, target trader, and performance metrics.';
COMMENT ON COLUMN copy_trade_bots.user_id IS 'User who created this copy trading bot';
COMMENT ON COLUMN copy_trade_bots.trader_address IS 'Target trader wallet address to copy (can be null initially)';
COMMENT ON COLUMN copy_trade_bots.allocated_amount IS 'Amount allocated for copy trading in USDT';
COMMENT ON COLUMN copy_trade_bots.allocation_percent IS 'Percentage of user balance allocated (0-100)';
COMMENT ON COLUMN copy_trade_bots.mode IS 'Trading mode: smart_ratio, fixed_amount, or advanced';
COMMENT ON COLUMN copy_trade_bots.status IS 'Bot status: running or stopped';
COMMENT ON COLUMN copy_trade_bots.total_trades IS 'Total number of trades executed (mock data for now)';
COMMENT ON COLUMN copy_trade_bots.pnl IS 'Profit and Loss in USDT (mock data for now)';

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_copy_trade_bots_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER copy_trade_bots_updated_at
  BEFORE UPDATE ON copy_trade_bots
  FOR EACH ROW
  EXECUTE FUNCTION update_copy_trade_bots_updated_at();

-- Enable Row Level Security (RLS) - Important for security!
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

-- Verify table creation
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'copy_trade_bots'
ORDER BY ordinal_position;

