-- Fix: Change last_actor_id column from UUID to TEXT to accept any string
-- This allows both UUIDs (production) and string IDs (demo) to be stored

ALTER TABLE orders ALTER COLUMN last_actor_id TYPE TEXT;
