-- EZ-SAKAY Users Table for Supabase (Phone + MPIN authentication)
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  phone_number VARCHAR(20) UNIQUE NOT NULL,
  email VARCHAR(255),
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

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_phone_number ON users(phone_number);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_nickname ON users(nickname);

-- Add comments for documentation
COMMENT ON TABLE users IS 'EZ-SAKAY user accounts with phone OTP and MPIN authentication';
COMMENT ON COLUMN users.phone_number IS 'User phone number (unique, used for login)';
COMMENT ON COLUMN users.email IS 'User email address (optional, collected during signup)';
COMMENT ON COLUMN users.first_name IS 'User first name';
COMMENT ON COLUMN users.last_name IS 'User last name';
COMMENT ON COLUMN users.nickname IS 'User display name (auto-generated, unique)';
COMMENT ON COLUMN users.is_verified IS 'Whether user has verified their phone with OTP';
COMMENT ON COLUMN users.otp_code IS 'Current OTP code (4 digits, plain text)';
COMMENT ON COLUMN users.otp_expires IS 'OTP expiration timestamp';
COMMENT ON COLUMN users.mpin_hash IS 'Hashed MPIN (6 digits, bcrypt)';
COMMENT ON COLUMN users.mpin_set IS 'Whether MPIN has been set';

