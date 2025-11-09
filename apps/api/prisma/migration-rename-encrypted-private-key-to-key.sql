-- Migration: Rename encrypted_private_key to key in wallets table
-- Run this in Supabase SQL Editor if you have an existing database
-- 
-- This migration renames the column to match the updated schema

-- Rename column from encrypted_private_key to key (if it exists)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wallets' AND column_name = 'encrypted_private_key'
  ) THEN
    ALTER TABLE wallets RENAME COLUMN encrypted_private_key TO key;
    RAISE NOTICE 'Column renamed from encrypted_private_key to key';
  ELSE
    RAISE NOTICE 'Column encrypted_private_key does not exist, skipping rename';
  END IF;
END $$;

-- Update column comment (remove encryption algorithm details)
COMMENT ON COLUMN wallets.key IS 'Encrypted private key. Format: iv:tag:encryptedData (hex). Decryption requires ENCRYPTION_KEY environment variable.';

-- Update table comment (remove encryption algorithm details)
COMMENT ON TABLE wallets IS 'Stores encrypted Aptos wallet private keys. NEVER expose private keys to frontend!';

-- Verify changes
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'wallets' AND column_name = 'key'
ORDER BY ordinal_position;

