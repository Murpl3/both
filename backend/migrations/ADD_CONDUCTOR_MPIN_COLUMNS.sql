-- Add MPIN columns to existing conductors table
-- Run this in your Supabase SQL Editor if you already created the conductors table

ALTER TABLE conductors 
ADD COLUMN IF NOT EXISTS mpin_hash VARCHAR(255),
ADD COLUMN IF NOT EXISTS mpin_set BOOLEAN DEFAULT FALSE;

-- Add comments
COMMENT ON COLUMN conductors.mpin_hash IS 'Bcrypt hashed MPIN (6 digits)';
COMMENT ON COLUMN conductors.mpin_set IS 'Whether MPIN has been set by conductor';
