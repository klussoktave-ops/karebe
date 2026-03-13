/**
 * Phone Normalization Migration Script
 * 
 * This script:
 * 1. Scans existing phone records in the database
 * 2. Normalizes them to canonical E.164 format (+254XXXXXXXXX)
 * 3. Reports duplicates that need manual resolution
 * 
 * IMPORTANT: Run with --dry-run first to preview changes
 * 
 * Usage:
 *   npx tsx src/scripts/normalize-phones.ts           # Preview changes
 *   npx tsx src/scripts/normalize-phones.ts --execute  # Execute changes
 */

import { supabase } from '../lib/supabase';
import { normalizePhone } from '../lib/phone';
import { logger } from '../lib/logger';

const EXECUTE = process.argv.includes('--execute');

/**
 * Main execution
 */
async function main() {
  logger.info('='.repeat(60));
  logger.info('Phone Normalization Migration');
  logger.info(`Mode: ${EXECUTE ? 'EXECUTE' : 'DRY RUN (preview only)'}`);
  logger.info('='.repeat(60));

  // Track all phones and their records
  const phoneToRecords = new Map<string, Array<{table: string; id: string; current: string}>>();
  let totalRecords = 0;

  // Scan customer_profiles
  logger.info('\nScanning customer_profiles...');
  const { data: customers } = await supabase.from('customer_profiles').select('id, phone');
  if (customers) {
    for (const c of customers) {
      if (c.phone) {
        const norm = normalizePhone(c.phone);
        if (norm.success) {
          const key = norm.data;
          phoneToRecords.set(key, [...(phoneToRecords.get(key) || []), { table: 'customer_profiles', id: c.id, current: c.phone }]);
          totalRecords++;
        }
      }
    }
    logger.info(`  Found ${customers.length} records`);
  }

  // Scan riders
  logger.info('Scanning riders...');
  const { data: riders } = await supabase.from('riders').select('id, phone');
  if (riders) {
    for (const r of riders) {
      if (r.phone) {
        const norm = normalizePhone(r.phone);
        if (norm.success) {
          const key = norm.data;
          phoneToRecords.set(key, [...(phoneToRecords.get(key) || []), { table: 'riders', id: r.id, current: r.phone }]);
          totalRecords++;
        }
      }
    }
    logger.info(`  Found ${riders.length} records`);
  }

  // Scan admin_users
  logger.info('Scanning admin_users...');
  const { data: admins } = await supabase.from('admin_users').select('id, phone');
  if (admins) {
    for (const a of admins) {
      if (a.phone) {
        const norm = normalizePhone(a.phone);
        if (norm.success) {
          const key = norm.data;
          phoneToRecords.set(key, [...(phoneToRecords.get(key) || []), { table: 'admin_users', id: a.id, current: a.phone }]);
          totalRecords++;
        }
      }
    }
    logger.info(`  Found ${admins.length} records`);
  }

  // Find duplicates
  const duplicates: Array<{phone: string; records: Array<{table: string; id: string; current: string}>}> = [];
  for (const [phone, records] of phoneToRecords) {
    if (records.length > 1) {
      duplicates.push({ phone, records });
    }
  }

  logger.info('\n' + '='.repeat(60));
  logger.info('DUPLICATE ANALYSIS');
  logger.info('='.repeat(60));

  if (duplicates.length > 0) {
    logger.warn(`\n⚠️  Found ${duplicates.length} groups of duplicates that need manual resolution:`);
    for (const dup of duplicates) {
      logger.warn(`\n  Canonical: ${dup.phone}`);
      for (const r of dup.records) {
        logger.warn(`    - ${r.table}: ${r.current} (${r.id})`);
      }
    }
    logger.warn('\n  Please resolve these duplicates before running with --execute');
  } else {
    logger.info('\n✅ No duplicates found - safe to proceed');
  }

  // Preview/Execute
  logger.info('\n' + '='.repeat(60));
  logger.info(EXECUTE ? 'EXECUTING CHANGES' : 'PREVIEWING CHANGES');
  logger.info('='.repeat(60));

  let updated = 0;
  let skipped = 0;

  for (const [normalizedPhone, records] of phoneToRecords) {
    for (const record of records) {
      // Skip if already correct
      if (record.current === normalizedPhone) {
        skipped++;
        continue;
      }

      // Skip if would create duplicate
      const allForPhone = phoneToRecords.get(normalizedPhone) || [];
      if (allForPhone.length > 1) {
        logger.warn(`  SKIP (duplicate): ${record.table}.${record.id}`);
        skipped++;
        continue;
      }

      if (EXECUTE) {
        const { error } = await supabase
          .from(record.table)
          .update({ phone: normalizedPhone })
          .eq('id', record.id);

        if (error) {
          logger.error(`  ERROR: ${record.table}.${record.id}: ${error.message}`);
        } else {
          logger.info(`  UPDATED: ${record.table}.${record.id}: ${record.current} → ${normalizedPhone}`);
          updated++;
        }
      } else {
        logger.info(`  Would update: ${record.table}.${record.id}: ${record.current} → ${normalizedPhone}`);
        updated++;
      }
    }
  }

  // Summary
  logger.info('\n' + '='.repeat(60));
  logger.info('SUMMARY');
  logger.info('='.repeat(60));
  logger.info(`Total records scanned: ${totalRecords}`);
  logger.info(`Records to update: ${updated}`);
  logger.info(`Records already correct: ${skipped}`);
  logger.info(`Duplicate groups: ${duplicates.length}`);

  if (!EXECUTE) {
    logger.info('\n💡 Run with --execute to apply changes');
  }

  if (EXECUTE && duplicates.length > 0) {
    logger.error('\n❌ Aborted: Duplicate groups need manual resolution');
    process.exit(1);
  }

  logger.info('\n✅ Migration complete');
}

main().catch((error) => {
  logger.error('Migration failed:', error);
  process.exit(1);
});
