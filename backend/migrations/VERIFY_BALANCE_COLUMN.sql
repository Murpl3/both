-- ============================================
-- Verify Balance Column Exists in Supabase
-- ============================================
-- Run this in your Supabase SQL Editor to check if the balance column exists
-- If it doesn't exist, run the ADD_MISSING_COLUMNS.sql file

-- Check if balance column exists
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'users' 
  AND column_name = 'balance';

-- If the query returns NO ROWS, the balance column is missing!
-- Run this to add it:
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS balance DECIMAL(10, 2) DEFAULT 0.00;

-- Check all columns in users table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- Expected: balance should appear in the list with:
-- column_name: balance
-- data_type: numeric
-- is_nullable: YES
-- column_default: 0.00

