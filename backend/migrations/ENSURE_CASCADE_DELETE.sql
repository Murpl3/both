-- EZ-SAKAY: Ensure CASCADE DELETE for topups when user is deleted
-- Run this in your Supabase SQL Editor to ensure top-up transactions
-- are automatically deleted when a user account is deleted

-- Step 1: Check if foreign key constraint exists
DO $$
BEGIN
    -- Drop the existing foreign key constraint if it exists (without CASCADE)
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'topups_user_id_fkey' 
        AND table_name = 'topups'
    ) THEN
        ALTER TABLE topups DROP CONSTRAINT topups_user_id_fkey;
        RAISE NOTICE 'Dropped existing foreign key constraint';
    END IF;
END $$;

-- Step 2: Add the foreign key constraint with ON DELETE CASCADE
ALTER TABLE topups 
ADD CONSTRAINT topups_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES users(id) 
ON DELETE CASCADE;

-- Step 3: Verify the constraint was created correctly
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
    ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'topups'
    AND kcu.column_name = 'user_id';

-- Expected Result:
-- You should see:
-- constraint_name: topups_user_id_fkey
-- table_name: topups
-- column_name: user_id
-- foreign_table_name: users
-- foreign_column_name: id
-- delete_rule: CASCADE  <-- This confirms CASCADE is set!

-- Step 4: Test (Optional - Remove comments to test)
-- Create a test user and topup, then delete the user to verify CASCADE works
/*
-- Create test user
INSERT INTO users (email, is_verified) 
VALUES ('test_cascade@example.com', true) 
RETURNING id;

-- Note the user ID from above, then:
-- Create test topup (replace USER_ID with actual ID)
INSERT INTO topups (user_id, amount, status) 
VALUES (USER_ID, 100.00, 'completed');

-- Delete the user - topup should be automatically deleted
DELETE FROM users WHERE email = 'test_cascade@example.com';

-- Verify topup was deleted (should return 0 rows)
SELECT * FROM topups WHERE user_id = USER_ID;
*/

