-- FIX: Ensure top-ups are deleted when users are deleted
-- Run this in Supabase SQL Editor

-- Step 1: Check current foreign key constraints
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
    ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'topups'
    AND kcu.column_name = 'user_id';

-- Step 2: Drop the existing constraint if it exists (replace 'topups_user_id_fkey' with actual constraint name from Step 1)
-- Common constraint names: topups_user_id_fkey, topups_user_id_users_id_fk, etc.
DO $$
DECLARE
    constraint_name_var TEXT;
BEGIN
    -- Find the constraint name
    SELECT tc.constraint_name INTO constraint_name_var
    FROM information_schema.table_constraints AS tc
    WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = 'topups'
        AND tc.constraint_name LIKE '%user_id%';
    
    -- Drop it if found
    IF constraint_name_var IS NOT NULL THEN
        EXECUTE 'ALTER TABLE topups DROP CONSTRAINT IF EXISTS ' || constraint_name_var;
        RAISE NOTICE 'Dropped constraint: %', constraint_name_var;
    ELSE
        RAISE NOTICE 'No existing constraint found';
    END IF;
END $$;

-- Step 3: Add the constraint with CASCADE DELETE
ALTER TABLE topups 
ADD CONSTRAINT topups_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES users(id) 
ON DELETE CASCADE;

-- Step 4: Verify the constraint was created correctly
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
    ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'topups'
    AND kcu.column_name = 'user_id';

-- Expected result: delete_rule should be 'CASCADE'

