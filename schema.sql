-- Schema for Karebe MVP (Single State Sync)

-- 1. Create a table to store the JSON state
CREATE TABLE IF NOT EXISTS app_state (
    id TEXT PRIMARY KEY,
    state JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert a default row for the state
INSERT INTO app_state (id, state) 
VALUES ('karebe_mvp_state', '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS (Row Level Security) - allow public read/write for MVP simplicity
-- Note: In a real production app, you should restrict writes to authenticated admins.
ALTER TABLE app_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to state" ON app_state FOR SELECT USING (true);
CREATE POLICY "Allow public update to state" ON app_state FOR UPDATE USING (true);
CREATE POLICY "Allow public insert to state" ON app_state FOR INSERT USING (true);

-- 2. Create the Storage Bucket for Product Images
-- This requires the Supabase Storage extension to be active.
-- Run this in the Supabase SQL Editor.
INSERT INTO storage.buckets (id, name, public) 
VALUES ('product_images', 'product_images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public access to the bucket
CREATE POLICY "Public Access" 
  ON storage.objects FOR SELECT 
  USING ( bucket_id = 'product_images' );

CREATE POLICY "Public Upload" 
  ON storage.objects FOR INSERT 
  WITH CHECK ( bucket_id = 'product_images' );
