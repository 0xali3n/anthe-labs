-- Create wallets table in Supabase
-- Run this in Supabase SQL Editor: https://app.supabase.com/project/YOUR_PROJECT/sql
-- 
-- SECURITY: This table stores encrypted private keys
-- NEVER expose private keys to frontend!

CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  address TEXT UNIQUE NOT NULL, -- Aptos wallet address (public)
  encrypted_private_key TEXT NOT NULL, -- AES-256-GCM encrypted private key
  network TEXT DEFAULT 'testnet', -- testnet, mainnet, devnet
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_address ON wallets(address);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_wallets_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_wallets_updated_at ON wallets;
CREATE TRIGGER update_wallets_updated_at
  BEFORE UPDATE ON wallets
  FOR EACH ROW
  EXECUTE FUNCTION update_wallets_updated_at_column();

-- Enable Row Level Security (RLS) - Critical for security!
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

-- SECURITY POLICIES:
-- Users can only view their own wallet address (NOT private key)
CREATE POLICY "Users can view own wallet address"
  ON wallets
  FOR SELECT
  USING (auth.uid() = user_id);

-- RESTRICT: Only backend service role can insert/update wallets
-- This prevents direct database access from frontend
-- Service role has full access (for backend API only)

-- Policy: Users cannot insert wallets directly (backend only)
CREATE POLICY "Backend only - no user inserts"
  ON wallets
  FOR INSERT
  WITH CHECK (false); -- Users cannot insert - backend API only

-- Policy: Users cannot update wallets directly (backend only)
CREATE POLICY "Backend only - no user updates"
  ON wallets
  FOR UPDATE
  USING (false); -- Users cannot update - backend API only

-- NOTE: Backend API will use service role key to bypass RLS
-- Frontend will never have direct database access to wallets table

-- Add comment for documentation
COMMENT ON TABLE wallets IS 'Stores encrypted Aptos wallet private keys. Private keys are encrypted with AES-256-GCM. NEVER expose private keys to frontend!';
COMMENT ON COLUMN wallets.encrypted_private_key IS 'AES-256-GCM encrypted private key. Format: iv:tag:encryptedData (hex). Decryption requires ENCRYPTION_KEY environment variable.';
COMMENT ON COLUMN wallets.address IS 'Public Aptos wallet address. Safe to expose to frontend.';

