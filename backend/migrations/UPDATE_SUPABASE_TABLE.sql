-- ============================================
-- UPDATE Supabase users table - Add Missing Columns
-- ============================================
-- Run this in your Supabase SQL Editor
-- This adds the missing columns that the backend expects

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add first_name column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'first_name'
    ) THEN
        ALTER TABLE users ADD COLUMN first_name VARCHAR(50);
    END IF;

    -- Add last_name column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'last_name'
    ) THEN
        ALTER TABLE users ADD COLUMN last_name VARCHAR(50);
    END IF;

    -- Add phone_number column (make it nullable since email is the primary identifier)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'phone_number'
    ) THEN
        ALTER TABLE users ADD COLUMN phone_number VARCHAR(20);
        -- Create index for phone_number if not exists
        CREATE INDEX IF NOT EXISTS idx_users_phone_number ON users(phone_number);
    END IF;

    -- Add mpin_hash column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'mpin_hash'
    ) THEN
        ALTER TABLE users ADD COLUMN mpin_hash VARCHAR(255);
    END IF;

    -- Add mpin_set column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'mpin_set'
    ) THEN
        ALTER TABLE users ADD COLUMN mpin_set BOOLEAN DEFAULT FALSE;
    END IF;

    -- Make email NOT NULL if it isn't already (it should be the primary identifier)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'email' AND is_nullable = 'YES'
    ) THEN
        -- First set any NULL emails to a placeholder
        UPDATE users SET email = 'temp_' || id::text || '@temp.com' WHERE email IS NULL;
        -- Then make it NOT NULL
        ALTER TABLE users ALTER COLUMN email SET NOT NULL;
    END IF;

END $$;

-- Verify all columns exist
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- ============================================
-- Expected Result: You should now see 12 columns:
-- 1. id
-- 2. email (not null)
-- 3. phone_number (nullable)
-- 4. first_name (nullable)
-- 5. last_name (nullable)
-- 6. nickname (nullable)
-- 7. is_verified (default false)
-- 8. otp_code (nullable)
-- 9. otp_expires (nullable)
-- 10. mpin_hash (nullable)
-- 11. mpin_set (default false)
-- 12. created_at (default now())
-- ============================================
