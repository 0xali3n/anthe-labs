-- Migration: Create trader_registrations table
-- This is a separate table for trader registration forms (pending/approved/rejected)
-- The existing 'traders' table remains unchanged for approved/active traders

-- Create trader_registrations table
CREATE TABLE IF NOT EXISTS trader_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  address TEXT NOT NULL,
  bot_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT fk_trader_registrations_user_id 
    FOREIGN KEY (user_id) 
    REFERENCES users(id) 
    ON DELETE CASCADE,
  
  -- One registration per user
  CONSTRAINT unique_user_registration UNIQUE (user_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_trader_registrations_user_id ON trader_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_trader_registrations_address ON trader_registrations(address);
CREATE INDEX IF NOT EXISTS idx_trader_registrations_status ON trader_registrations(status);

-- Add comments for documentation
COMMENT ON TABLE trader_registrations IS 'Stores trader registration submissions from users. Separate from the traders table which contains approved/active traders.';
COMMENT ON COLUMN trader_registrations.user_id IS 'User who submitted the registration';
COMMENT ON COLUMN trader_registrations.address IS 'Trading wallet address from browser extension (separate from user profile wallet)';
COMMENT ON COLUMN trader_registrations.bot_name IS 'Bot/trader display name chosen by user';
COMMENT ON COLUMN trader_registrations.status IS 'Registration status: pending, approved, or rejected';

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_trader_registrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trader_registrations_updated_at
  BEFORE UPDATE ON trader_registrations
  FOR EACH ROW
  EXECUTE FUNCTION update_trader_registrations_updated_at();

-- Verify table creation
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'trader_registrations'
ORDER BY ordinal_position;

