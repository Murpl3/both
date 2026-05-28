-- ============================================
-- EzSAKAY Transactions Table for Supabase
-- ============================================
-- Run this in your Supabase SQL Editor to create the transactions table
-- This stores ticket bookings for each user

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  user_phone VARCHAR(20) NOT NULL,                    -- User's phone number for quick lookup
  ref_no VARCHAR(20) NOT NULL UNIQUE,                 -- Unique reference number
  transaction_type VARCHAR(20) NOT NULL,              -- 'WALLET' or 'CASH'
  amount DECIMAL(10, 2) NOT NULL,                     -- Transaction amount
  origin VARCHAR(255) NOT NULL,                       -- Origin location
  destination VARCHAR(255) NOT NULL,                  -- Destination location
  passengers INTEGER DEFAULT 1,                       -- Number of passengers
  schedule_time VARCHAR(20),                          -- Scheduled departure time (e.g., "9:00 AM")
  operator VARCHAR(100) DEFAULT 'DASUTRANSCO',        -- Bus operator name
  departure_timestamp BIGINT,                         -- Departure time as Unix timestamp
  expiry_minutes INTEGER DEFAULT 5,                   -- Minutes after departure when ticket expires
  status VARCHAR(20) DEFAULT 'ACTIVE',                -- ACTIVE, EXPIRED, USED
  created_at TIMESTAMP DEFAULT NOW()                  -- Transaction creation time
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_phone ON transactions(user_phone);
CREATE INDEX IF NOT EXISTS idx_transactions_ref_no ON transactions(ref_no);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);

-- Add comment to table
COMMENT ON TABLE transactions IS 'EzSAKAY ticket booking transactions';

-- Enable Row Level Security (optional - uncomment if needed)
-- ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to see only their own transactions (optional)
-- CREATE POLICY "Users can view own transactions" ON transactions
--   FOR SELECT USING (user_phone = current_user);

-- ============================================
-- Verify table structure
-- ============================================
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'transactions'
ORDER BY ordinal_position;
