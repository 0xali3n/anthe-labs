-- Migration: Add apt_airdropped field to users table
-- This field tracks if 0.05 APT airdrop has been sent to the user on their first deposit

ALTER TABLE users
ADD COLUMN IF NOT EXISTS apt_airdropped BOOLEAN NOT NULL DEFAULT false;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_users_apt_airdropped ON users(apt_airdropped);

-- Add comment to the column
COMMENT ON COLUMN users.apt_airdropped IS 'Track if 0.05 APT airdrop has been sent to user on first deposit';

