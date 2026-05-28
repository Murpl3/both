-- Create conductors table for EzSakay
-- Run this in Supabase SQL Editor

-- Drop existing table if you want to recreate
-- DROP TABLE IF EXISTS conductors;

CREATE TABLE IF NOT EXISTS conductors (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  full_name VARCHAR(100),
  mpin_hash VARCHAR(10),
  mpin_set BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster username lookups
CREATE INDEX IF NOT EXISTS idx_conductors_username ON conductors(username);

-- Enable Row Level Security
ALTER TABLE conductors ENABLE ROW LEVEL SECURITY;

-- Allow all operations (adjust for production)
DROP POLICY IF EXISTS "Allow all operations on conductors" ON conductors;
CREATE POLICY "Allow all operations on conductors" ON conductors
  FOR ALL USING (true) WITH CHECK (true);

-- If table already exists and missing columns, run these:
-- ALTER TABLE conductors ADD COLUMN IF NOT EXISTS full_name VARCHAR(100);
-- ALTER TABLE conductors ADD COLUMN IF NOT EXISTS mpin_hash VARCHAR(10);
-- ALTER TABLE conductors ADD COLUMN IF NOT EXISTS mpin_set BOOLEAN DEFAULT FALSE;
