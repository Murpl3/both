-- ============================================
-- Add Missing Columns to Existing Supabase users Table
-- ============================================
-- Run this in your Supabase SQL Editor
-- This adds the missing columns without deleting any data

-- Add phone_number column
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);

-- Add first_name column
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(50);

-- Add last_name column
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(50);

-- Add mpin_hash column
ALTER TABLE users ADD COLUMN IF NOT EXISTS mpin_hash VARCHAR(255);

-- Add mpin_set column with default value
ALTER TABLE users ADD COLUMN IF NOT EXISTS mpin_set BOOLEAN DEFAULT FALSE;

-- Add balance column for wallet functionality
ALTER TABLE users ADD COLUMN IF NOT EXISTS balance DECIMAL(10, 2) DEFAULT 0.00;

-- Create index for phone_number if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_users_phone_number ON users(phone_number);

-- Verify the table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- ============================================
-- Expected Result: You should now see 13 columns:
-- 1. id (integer, primary key)
-- 2. email (varchar, unique, not null)
-- 3. nickname (varchar, unique, nullable)
-- 4. is_verified (boolean, default false)
-- 5. otp_code (varchar(10), nullable) - Stores 4-digit OTP codes
-- 6. otp_expires (timestamp, nullable)
-- 7. created_at (timestamp, default now())
-- 8. phone_number (varchar, nullable) ← NEW
-- 9. first_name (varchar, nullable) ← NEW
-- 10. last_name (varchar, nullable) ← NEW
-- 11. mpin_hash (varchar, nullable) ← NEW
-- 12. mpin_set (boolean, default false) ← NEW
-- 13. balance (decimal(10,2), default 0.00) ← NEW (for wallet)
-- ============================================

