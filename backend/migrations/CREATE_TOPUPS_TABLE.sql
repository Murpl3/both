-- EZ-SAKAY Top-ups Table for Supabase
-- Run this in your Supabase SQL Editor

-- First, add balance column to users table if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS balance DECIMAL(10, 2) DEFAULT 0.00;

-- Create topups table
CREATE TABLE IF NOT EXISTS topups (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(20) DEFAULT 'completed',
  payment_method VARCHAR(50),
  transaction_ref VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_topups_user_id ON topups(user_id);
CREATE INDEX IF NOT EXISTS idx_topups_created_at ON topups(created_at);
CREATE INDEX IF NOT EXISTS idx_topups_status ON topups(status);

-- Add comments for documentation
COMMENT ON TABLE topups IS 'EZ-SAKAY user top-up transactions';
COMMENT ON COLUMN topups.user_id IS 'Reference to users table';
COMMENT ON COLUMN topups.amount IS 'Top-up amount in PHP';
COMMENT ON COLUMN topups.status IS 'Transaction status: pending, completed, failed';
COMMENT ON COLUMN topups.payment_method IS 'Payment method used (e.g., GCash, Credit Card)';

-- Verify tables
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name IN ('users', 'topups')
ORDER BY table_name, ordinal_position;

