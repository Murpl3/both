-- Add is_verified flag to conductors table (Supabase)
-- Used by the EZSakay Admin "Verify" action.

ALTER TABLE conductors ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;

