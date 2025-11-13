-- Create traders table in Supabase
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS traders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address TEXT UNIQUE NOT NULL,
  bot_name TEXT,
  avatar_url TEXT,
  "numberOfTxns" INTEGER DEFAULT 0,
  "totalVolume" DECIMAL(20, 2) NOT NULL,
  pnl DECIMAL(20, 2) NOT NULL,
  roi DECIMAL(10, 2) NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_traders_address ON traders(address);
CREATE INDEX IF NOT EXISTS idx_traders_bot_name ON traders(bot_name);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_traders_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_traders_updated_at ON traders;
CREATE TRIGGER update_traders_updated_at
  BEFORE UPDATE ON traders
  FOR EACH ROW
  EXECUTE FUNCTION update_traders_updated_at_column();

-- Enable Row Level Security (RLS) - Important for security!
ALTER TABLE traders ENABLE ROW LEVEL SECURITY;

-- SECURITY POLICIES:
-- Policy: Everyone (authenticated users) can view traders (public leaderboard data)
CREATE POLICY "Anyone can view traders"
  ON traders
  FOR SELECT
  USING (true); -- Public read access for leaderboard

-- Policy: Only service role can insert traders (backend API only)
CREATE POLICY "Service role can insert traders"
  ON traders
  FOR INSERT
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Policy: Only service role can update traders (backend API only)
CREATE POLICY "Service role can update traders"
  ON traders
  FOR UPDATE
  USING (auth.jwt()->>'role' = 'service_role');

-- Policy: Only service role can delete traders (backend API only)
CREATE POLICY "Service role can delete traders"
  ON traders
  FOR DELETE
  USING (auth.jwt()->>'role' = 'service_role');

-- Add comment for documentation
COMMENT ON TABLE traders IS 'Public leaderboard data for top traders. Read access for all authenticated users, write access for backend API only.';

-- Insert initial trader data with bot names and dummy avatars
INSERT INTO traders (address, bot_name, avatar_url, "numberOfTxns", "totalVolume", pnl, roi)
VALUES
  ('0x61733ede5ead283951befc49822d0505f0e0fb1b9127c244de010dd2926c5907', 'AlphaBot', 'https://api.dicebear.com/7.x/bottts/svg?seed=AlphaBot', 358, 59627.49, 517.25, 7838.97),
  ('0x2842c511c214cdadd58a5984ab1c57028e45d298e1a135e3f75556b96e874de5', 'CryptoBot', 'https://api.dicebear.com/7.x/bottts/svg?seed=CryptoBot', 281, 25481.46, 252.31, 4205.24),
  ('0xdf9baa09994e32699294378ac43327a6f94c2b17637b6a406df953aba6f55ea5', 'DeFiBot', 'https://api.dicebear.com/7.x/bottts/svg?seed=DeFiBot', 640, 227942.44, 1666.77, 1598.20),
  ('0xd04547df48f5930351871d9c4ee7dae46c820fa6516aaba16152370d8aeea2ed', 'TradeBot', 'https://api.dicebear.com/7.x/bottts/svg?seed=TradeBot', 206, 37906.68, 247.35, 824.51),
  ('0x1719a7fd848e78d0027f031095f4e406718b21299bb2c1065364365e45abf1d2', 'MarketBot', 'https://api.dicebear.com/7.x/bottts/svg?seed=MarketBot', 11, 1015.97, 36.96, 184.78),
  ('0xa67aba32c9be2f627cce7305220072a4c1f79875d06627931413c8a739bec9ef', 'ProfitBot', 'https://api.dicebear.com/7.x/bottts/svg?seed=ProfitBot', 13, 1167.86, 35.69, 178.47),
  ('0x4c4eab8302fc99c1e36310599ac5fe693356723de33320e0bb92436a144b4d0e', 'BlockBot', 'https://api.dicebear.com/7.x/bottts/svg?seed=BlockBot', 67, 133307.06, 970.93, 166.44),
  ('0x40a7140a7b1b0582de1975f456d1329db1e0c50b77f11398eadbef2683fd7f22', 'NinjaBot', 'https://api.dicebear.com/7.x/bottts/svg?seed=NinjaBot', 29, 1941.38, 31.16, 155.79),
  ('0xe0b033ea3cf8ddfc1b38616f2b7016562a678c4ba809107f81b72d91d171ef8a', 'KingBot', 'https://api.dicebear.com/7.x/bottts/svg?seed=KingBot', 13, 1191.84, 30.88, 154.42),
  ('0xb2ebaf4a2e688b02dca886a7e9043c3ea4d647f24bd6ace6ffe377212c878ee9', 'AptosBot', 'https://api.dicebear.com/7.x/bottts/svg?seed=AptosBot', 8, 809.84, 27.98, 139.88)
ON CONFLICT (address) DO UPDATE SET
  bot_name = COALESCE(EXCLUDED.bot_name, traders.bot_name),
  avatar_url = COALESCE(EXCLUDED.avatar_url, traders.avatar_url),
  "numberOfTxns" = EXCLUDED."numberOfTxns",
  "totalVolume" = EXCLUDED."totalVolume",
  pnl = EXCLUDED.pnl,
  roi = EXCLUDED.roi,
  updated_at = NOW();

