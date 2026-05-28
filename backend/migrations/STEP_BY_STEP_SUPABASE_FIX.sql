-- ============================================
-- STEP-BY-STEP: Fix Supabase users Table
-- ============================================
-- Copy and paste EACH command separately into Supabase SQL Editor
-- Wait for "Success" message before running the next command

-- STEP 1: Check current columns (run this first)
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- STEP 2: Add phone_number column
ALTER TABLE users ADD COLUMN phone_number VARCHAR(20);

-- STEP 3: Add first_name column  
ALTER TABLE users ADD COLUMN first_name VARCHAR(50);

-- STEP 4: Add last_name column
ALTER TABLE users ADD COLUMN last_name VARCHAR(50);

-- STEP 5: Add mpin_hash column
ALTER TABLE users ADD COLUMN mpin_hash VARCHAR(255);

-- STEP 6: Add mpin_set column
ALTER TABLE users ADD COLUMN mpin_set BOOLEAN DEFAULT FALSE;

-- STEP 7: Create index for phone_number
CREATE INDEX idx_users_phone_number ON users(phone_number);

-- STEP 8: Verify all columns (run this last to confirm)
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Expected: 12 columns total (including the 5 new ones)

