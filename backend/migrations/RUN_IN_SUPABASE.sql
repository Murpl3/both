-- ============================================
-- EZ-SAKAY Users Table - Run this in Supabase SQL Editor
-- ============================================
-- Copy and paste this entire script into your Supabase SQL Editor
-- Then click "Run" or press Ctrl+Enter

-- Drop table if it exists (optional - only if you want to start fresh)
-- DROP TABLE IF EXISTS users CASCADE;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  nickname VARCHAR(50) UNIQUE,
  is_verified BOOLEAN DEFAULT FALSE,
  otp_code VARCHAR(10),
  otp_expires TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_nickname ON users(nickname);

-- Verify table was created
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- ============================================
-- Expected Result:
-- You should see 7 columns:
-- 1. id (integer, not null)
-- 2. email (varchar, not null)
-- 3. nickname (varchar, nullable)
-- 4. is_verified (boolean, default false)
-- 5. otp_code (varchar, nullable)
-- 6. otp_expires (timestamp, nullable)
-- 7. created_at (timestamp, default now())
-- ============================================

