-- ============================================
-- COMPLETE EZ-SAKAY Users Table for Supabase
-- ============================================
-- Run this in your Supabase SQL Editor if you want to create the table from scratch
-- OR if you need to ensure all columns are present

-- Drop table if you want to start fresh (UNCOMMENT THE NEXT LINE IF NEEDED)
-- DROP TABLE IF EXISTS users CASCADE;

-- Create users table with ALL required columns
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,           -- Primary identifier (required)
  phone_number VARCHAR(20),                     -- Optional phone number
  first_name VARCHAR(50),                       -- First name
  last_name VARCHAR(50),                        -- Last name
  nickname VARCHAR(50) UNIQUE,                  -- Display name (auto-generated, unique)
  is_verified BOOLEAN DEFAULT FALSE,            -- OTP verification status
  otp_code VARCHAR(10),                         -- Current OTP code (4 digits)
  otp_expires TIMESTAMP,                        -- OTP expiration time
  mpin_hash VARCHAR(255),                       -- Hashed MPIN (bcrypt)
  mpin_set BOOLEAN DEFAULT FALSE,               -- Whether MPIN has been set
  balance DECIMAL(10, 2) DEFAULT 0.00,          -- Wallet balance
  created_at TIMESTAMP DEFAULT NOW()            -- Account creation timestamp
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone_number ON users(phone_number);
CREATE INDEX IF NOT EXISTS idx_users_nickname ON users(nickname);

-- Verify table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- ============================================
-- Expected Result: 12 columns should be created
-- ============================================

