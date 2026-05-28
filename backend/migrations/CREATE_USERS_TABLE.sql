-- ============================================
-- CREATE users TABLE IN SUPABASE
-- ============================================
-- Run this in Supabase SQL Editor to create the table from scratch
-- This will create the table with ALL required columns

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone_number VARCHAR(20),
  first_name VARCHAR(50),
  last_name VARCHAR(50),
  nickname VARCHAR(50) UNIQUE,
  is_verified BOOLEAN DEFAULT FALSE,
  otp_code VARCHAR(10),
  otp_expires TIMESTAMP,
  mpin_hash VARCHAR(255),
  mpin_set BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone_number ON users(phone_number);
CREATE INDEX IF NOT EXISTS idx_users_nickname ON users(nickname);

-- Verify table was created
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Expected result: 12 columns total
-- 1. id
-- 2. email
-- 3. phone_number
-- 4. first_name
-- 5. last_name
-- 6. nickname
-- 7. is_verified
-- 8. otp_code
-- 9. otp_expires
-- 10. mpin_hash
-- 11. mpin_set
-- 12. created_at

