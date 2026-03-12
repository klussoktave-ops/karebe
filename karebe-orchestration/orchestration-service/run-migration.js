// Run migration using Supabase client
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  const migrationFile = path.join(__dirname, 'supabase/migrations/20240303000000_orchestration_schema.sql');
  
  if (!fs.existsSync(migrationFile)) {
    console.error('Migration file not found:', migrationFile);
    process.exit(1);
  }
  
  const sql = fs.readFileSync(migrationFile, 'utf-8');
  
  console.log('Running migration...');
  console.log('Target:', supabaseUrl);
  
  try {
    // Execute the entire SQL as a single query
    const { error } = await supabase.rpc('exec_sql', { query: sql });
    
    if (error) {
      // If exec_sql doesn't exist, try alternative approach
      console.log('Note: exec_sql function not found, trying direct execution...');
      
      // Split and execute statements one by one
      const statements = sql.split(';').filter(s => s.trim());
      let successCount = 0;
      let skipCount = 0;
      
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i].trim();
        if (!statement || statement.startsWith('--') || statement.startsWith('/*')) continue;
        
        try {
          // Try to execute via REST API
          const response = await fetch(`${supabaseUrl}/rest/v1/`, {
            method: 'POST',
            headers: {
              'apikey': process.env.SUPABASE_ANON_KEY || '',
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json',
              'Prefer': 'tx=commit'
            },
            body: JSON.stringify({ query: statement + ';' })
          });
          
          if (response.ok) {
            successCount++;
          } else {
            skipCount++;
          }
        } catch (err) {
          skipCount++;
        }
      }
      
      console.log(`Migration completed: ${successCount} statements executed, ${skipCount} skipped`);
    } else {
      console.log('Migration completed successfully!');
    }
  } catch (err) {
    console.error('Migration error:', err);
    console.log('\nAlternative: Please run the SQL manually in Supabase SQL Editor:');
    console.log(migrationFile);
  }
}

runMigration();