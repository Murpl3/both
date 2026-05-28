-- Add password_hash column to conductors table for Supabase
-- This allows admin-created conductors to have hashed passwords
-- that the mobile app validates via the backend API.

ALTER TABLE conductors ADD COLUMN IF NOT EXISTS password_hash TEXT;
