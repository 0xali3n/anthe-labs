-- Migration: Update copy_trade_bots table
-- Changes:
-- 1. Change id from UUID to VARCHAR(9) for 8-9 character bot IDs
-- 2. Change user_id to user_address (TEXT) - store wallet address instead of user ID
-- 3. Remove foreign key constraint to users table
-- 4. Update indexes

-- Step 1: Drop existing RLS policies first (they depend on user_id)
DROP POLICY IF EXISTS "Users can view own bots" ON copy_trade_bots;
DROP POLICY IF EXISTS "Service role can view all bots" ON copy_trade_bots;
DROP POLICY IF EXISTS "Users can insert own bots" ON copy_trade_bots;
DROP POLICY IF EXISTS "Service role can insert bots" ON copy_trade_bots;
DROP POLICY IF EXISTS "Users can update own bots" ON copy_trade_bots;
DROP POLICY IF EXISTS "Service role can update bots" ON copy_trade_bots;
DROP POLICY IF EXISTS "Users can delete own bots" ON copy_trade_bots;
DROP POLICY IF EXISTS "Service role can delete bots" ON copy_trade_bots;

-- Step 2: Drop existing foreign key constraint and indexes
ALTER TABLE copy_trade_bots 
  DROP CONSTRAINT IF EXISTS fk_copy_trade_bots_user_id;

DROP INDEX IF EXISTS idx_copy_trade_bots_user_id;
DROP INDEX IF EXISTS idx_copy_trade_bots_user_address;

-- Step 3: Add new user_address column (temporary, we'll migrate data)
ALTER TABLE copy_trade_bots 
  ADD COLUMN IF NOT EXISTS user_address TEXT;

-- Step 4: Migrate data: Get wallet address from users table
UPDATE copy_trade_bots c
SET user_address = w.address
FROM wallets w
WHERE c.user_id = w.user_id;

-- Step 5: Drop old user_id column (now safe since policies are dropped)
ALTER TABLE copy_trade_bots 
  DROP COLUMN IF EXISTS user_id;

-- Step 6: Make user_address NOT NULL (after data migration)
ALTER TABLE copy_trade_bots 
  ALTER COLUMN user_address SET NOT NULL;

-- Step 7: Change id column type from UUID to TEXT first
-- This allows us to update the values to 8-9 character IDs
ALTER TABLE copy_trade_bots 
  ALTER COLUMN id TYPE TEXT USING id::text;

-- Step 8: Generate new 8-9 character bot IDs for existing records
DO $$
DECLARE
  bot_record RECORD;
  new_id TEXT;
  old_id TEXT;
  counter INT := 0;
BEGIN
  FOR bot_record IN SELECT id FROM copy_trade_bots LOOP
    old_id := bot_record.id;
    
    -- Generate 8-9 character ID (mix of numbers and uppercase letters)
    new_id := upper(
      substr(md5(random()::text || clock_timestamp()::text), 1, 8) ||
      substr('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', floor(random() * 36)::int + 1, 1)
    );
    
    -- Ensure uniqueness by checking
    WHILE EXISTS (SELECT 1 FROM copy_trade_bots WHERE id = new_id) LOOP
      new_id := upper(
        substr(md5(random()::text || clock_timestamp()::text), 1, 8) ||
        substr('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', floor(random() * 36)::int + 1, 1)
      );
    END LOOP;
    
    -- Update the record with new ID
    UPDATE copy_trade_bots 
    SET id = new_id 
    WHERE id = old_id;
    
    counter := counter + 1;
  END LOOP;
  
  RAISE NOTICE 'Updated % bot IDs', counter;
END $$;

-- Step 9: Change id column type from TEXT to VARCHAR(9)
ALTER TABLE copy_trade_bots 
  ALTER COLUMN id TYPE VARCHAR(9);

-- Step 9: Create new indexes
CREATE INDEX IF NOT EXISTS idx_copy_trade_bots_user_address 
  ON copy_trade_bots(user_address);

CREATE INDEX IF NOT EXISTS idx_copy_trade_bots_trader_address 
  ON copy_trade_bots(trader_address);

CREATE INDEX IF NOT EXISTS idx_copy_trade_bots_status 
  ON copy_trade_bots(status);

-- Step 10: Add comment to table
COMMENT ON TABLE copy_trade_bots IS 'Copy trade bots table - uses user wallet address instead of user_id, and 8-9 character bot IDs';

COMMENT ON COLUMN copy_trade_bots.id IS '8-9 character bot ID (alphanumeric)';
COMMENT ON COLUMN copy_trade_bots.user_address IS 'User wallet address (from wallets table)';
COMMENT ON COLUMN copy_trade_bots.trader_address IS 'Target trader wallet address to copy';

-- Step 11: Create new RLS policies using user_address instead of user_id
-- Note: These policies check wallet address from auth context
-- You may need to adjust based on how you store wallet address in auth context
CREATE POLICY "Users can view own bots" ON copy_trade_bots 
  FOR SELECT 
  USING (
    user_address IN (
      SELECT address FROM wallets WHERE user_id::text = auth.uid()::text
    )
  );

CREATE POLICY "Service role can view all bots" ON copy_trade_bots 
  FOR SELECT 
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Users can insert own bots" ON copy_trade_bots 
  FOR INSERT 
  WITH CHECK (
    user_address IN (
      SELECT address FROM wallets WHERE user_id::text = auth.uid()::text
    )
  );

CREATE POLICY "Service role can insert bots" ON copy_trade_bots 
  FOR INSERT 
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Users can update own bots" ON copy_trade_bots 
  FOR UPDATE 
  USING (
    user_address IN (
      SELECT address FROM wallets WHERE user_id::text = auth.uid()::text
    )
  )
  WITH CHECK (
    user_address IN (
      SELECT address FROM wallets WHERE user_id::text = auth.uid()::text
    )
  );

CREATE POLICY "Service role can update bots" ON copy_trade_bots 
  FOR UPDATE 
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Users can delete own bots" ON copy_trade_bots 
  FOR DELETE 
  USING (
    user_address IN (
      SELECT address FROM wallets WHERE user_id::text = auth.uid()::text
    )
  );

CREATE POLICY "Service role can delete bots" ON copy_trade_bots 
  FOR DELETE 
  USING (auth.jwt()->>'role' = 'service_role');

