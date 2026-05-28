-- ============================================
-- Fix Supabase users Table - Add Missing Columns
-- ============================================
-- Run each ALTER TABLE command separately if the batch doesn't work
-- Copy and paste ONE command at a time into Supabase SQL Editor

-- Step 1: Add phone_number
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);

-- Step 2: Add first_name  
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(50);

-- Step 3: Add last_name
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(50);

-- Step 4: Add mpin_hash
ALTER TABLE users ADD COLUMN IF NOT EXISTS mpin_hash VARCHAR(255);

-- Step 5: Add mpin_set
ALTER TABLE users ADD COLUMN IF NOT EXISTS mpin_set BOOLEAN DEFAULT FALSE;

-- Step 6: Create index
CREATE INDEX IF NOT EXISTS idx_users_phone_number ON users(phone_number);

-- Step 7: Verify all columns exist
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

-- ============================================
-- IMPORTANT: If you get errors running all at once,
-- run them ONE AT A TIME:
-- 1. Copy just the first ALTER TABLE command
-- 2. Run it
-- 3. Check if it worked
-- 4. Move to the next command
-- ============================================

