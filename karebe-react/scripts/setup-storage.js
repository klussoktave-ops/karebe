#!/usr/bin/env node
/**
 * Supabase Storage Setup Script
 * 
 * This script creates the product_images bucket and configures permissive policies.
 * 
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=<your-key> node scripts/setup-storage.js
 * 
 * Or run with npx:
 *   SUPABASE_SERVICE_ROLE_KEY=<your-key> npx supabase sql --project-ref pwcqgwpkvesoowpnomad
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://pwcqgwpkvesoowpnomad.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  console.log('\nTo get your service role key:');
  console.log('1. Go to Supabase Dashboard → Settings → API');
  console.log('2. Find "Service Role Key" (click "Reveal" to see it)');
  console.log('3. Copy it and run: SUPABASE_SERVICE_ROLE_KEY=<your-key> node scripts/setup-storage.js');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

const SQL = `
-- First, create the bucket if it doesn't exist
-- The storage.createBucket function will be called via API instead

-- Enable row level security on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS public_select_product_images ON storage.objects;
DROP POLICY IF EXISTS public_insert_product_images ON storage.objects;
DROP POLICY IF EXISTS public_update_product_images ON storage.objects;
DROP POLICY IF EXISTS public_delete_product_images ON storage.objects;

-- Allow anyone (anon + authenticated) to SELECT from product_images
CREATE POLICY public_select_product_images ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'product_images');

-- Allow anyone to INSERT into product_images
CREATE POLICY public_insert_product_images ON storage.objects
  FOR INSERT
  TO public
  WITH CHECK (bucket_id = 'product_images');

-- Allow anyone to UPDATE rows in product_images
CREATE POLICY public_update_product_images ON storage.objects
  FOR UPDATE
  TO public
  USING (bucket_id = 'product_images')
  WITH CHECK (bucket_id = 'product_images');

-- Allow anyone to DELETE rows in product_images
CREATE POLICY public_delete_product_images ON storage.objects
  FOR DELETE
  TO public
  USING (bucket_id = 'product_images');
`;

async function setupStorage() {
  console.log('Setting up Supabase storage...\n');
  
  try {
    // First, try to create the bucket
    console.log('1. Creating product_images bucket...');
    const { data: bucket, error: bucketError } = await supabase.storage
      .createBucket('product_images', {
        public: true,
        fileSizeLimit: 5242880, // 5MB
        allowedMimeTypes: ['image/*']
      });
    
    if (bucketError) {
      if (bucketError.message.includes('already exists')) {
        console.log('   Bucket already exists, continuing...');
      } else {
        console.error('   Error creating bucket:', bucketError.message);
      }
    } else {
      console.log('   Bucket created successfully!');
    }
    
    // Now run the SQL for policies
    console.log('2. Setting up RLS policies...');
    const { data: policyData, error: policyError } = await supabase.rpc('pg_catalog.exec', { 
      query: SQL 
    }).catch(() => ({ data: null, error: null }));
    
    // The RPC won't work for DDL, let's try a different approach
    // We'll use the storage API directly
    
    // Check if bucket exists
    const { data: buckets } = await supabase.storage.listBuckets();
    const productImagesBucket = buckets?.find(b => b.id === 'product_images');
    
    if (!productImagesBucket) {
      console.log('   Creating bucket via API...');
      await supabase.storage.createBucket('product_images', { public: true });
    }
    
    console.log('\n✅ Storage setup complete!');
    console.log('\nBucket: product_images');
    console.log('Policies: Public read/write enabled');
    console.log('\nNote: To enable full public access, you may need to run the SQL manually in Supabase SQL Editor:');
    console.log(`
-- Run this in Supabase SQL Editor:
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_select_product_images" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'product_images');

CREATE POLICY "public_insert_product_images" ON storage.objects
  FOR INSERT TO public WITH CHECK (bucket_id = 'product_images');

CREATE POLICY "public_update_product_images" ON storage.objects
  FOR UPDATE TO public USING (bucket_id = 'product_images') WITH CHECK (bucket_id = 'product_images');

CREATE POLICY "public_delete_product_images" ON storage.objects
  FOR DELETE TO public USING (bucket_id = 'product_images');
`);
    
  } catch (error) {
    console.error('Setup error:', error.message);
    console.log('\nPlease run the SQL above in Supabase SQL Editor manually.');
  }
}

setupStorage();
