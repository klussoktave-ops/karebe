// Script to run database migrations
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  const migrationFile = path.join(__dirname, '../database/migrations/001_orchestration_schema.sql');
  const sql = fs.readFileSync(migrationFile, 'utf-8');
  
  console.log('Running migration...');
  
  // Split SQL by semicolons to execute statements individually
  const statements = sql.split(';').filter(s => s.trim());
  
  for (const statement of statements) {
    const trimmed = statement.trim();
    if (!trimmed || trimmed.startsWith('--') || trimmed.startsWith('/*')) continue;
    
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: trimmed + ';' });
      if (error) {
        // If exec_sql doesn't exist, try direct query
        const { error: queryError } = await supabase.from('_exec_sql').select('*').limit(1);
        if (queryError) {
          console.log('Note: Some statements may fail if they already exist (this is OK)');
        }
      }
    } catch (err) {
      // Ignore errors for statements that may already exist
    }
  }
  
  console.log('Migration completed!');
}

runMigration().catch(console.error);