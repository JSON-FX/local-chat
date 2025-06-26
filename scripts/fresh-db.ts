#!/usr/bin/env tsx

import { getDatabase, closeDatabase } from '../lib/database';
import { createDefaultAdmin } from '../lib/schema';
import { existsSync } from 'fs';

async function freshDatabase() {
  try {
    console.log('🔄 Performing fresh database migration...');
    console.log('⚠️  This will delete ALL data and reset to a clean state!');

    const db = await getDatabase();

    // Get all table names
    const tables = await db.all(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `);

    console.log(`📋 Found ${tables.length} tables to clean...`);

    // Disable foreign key constraints temporarily
    await db.run('PRAGMA foreign_keys = OFF');

    // Clear all data from tables (in reverse order to avoid FK issues)
    const tablesToClear = [
      'message_reads',
      'messages', 
      'group_members',
      'groups',
      'sessions',
      'users'
    ];

    for (const tableName of tablesToClear) {
      const tableExists = tables.find(t => t.name === tableName);
      if (tableExists) {
        console.log(`🧹 Clearing data from ${tableName}...`);
        await db.run(`DELETE FROM ${tableName}`);
        
        // Reset auto-increment sequences
        await db.run(`DELETE FROM sqlite_sequence WHERE name='${tableName}'`);
      }
    }

    // Re-enable foreign key constraints
    await db.run('PRAGMA foreign_keys = ON');

    console.log('✅ All data cleared successfully!');

    // Create default admin user
    console.log('👤 Creating default admin user...');
    await createDefaultAdmin();

    console.log('🎉 Database fresh migration completed successfully!');
    console.log('');
    console.log('📋 Ready to use:');
    console.log('• Database is clean with only default admin user');
    console.log('• Login with username: admin, password: admin123');
    console.log('• Change the default admin password immediately!');
    console.log('');

  } catch (error) {
    console.error('❌ Fresh database migration failed:', error);
    process.exit(1);
  } finally {
    await closeDatabase();
    process.exit(0);
  }
}

// Command line options
async function main() {
  const args = process.argv.slice(2);
  const force = args.includes('--force') || args.includes('-f');

  if (!force) {
    console.log('⚠️  WARNING: This will delete ALL data in the database!');
    console.log('');
    console.log('This includes:');
    console.log('• All users (except new default admin)');
    console.log('• All messages and conversations');
    console.log('• All groups and memberships');
    console.log('• All user sessions');
    console.log('• All uploaded files references');
    console.log('');
    console.log('To proceed, run: npm run fresh-db -- --force');
    console.log('Or directly: npx tsx scripts/fresh-db.ts --force');
    return;
  }

  await freshDatabase();
}

// Run if script is executed directly
if (require.main === module) {
  main();
}

export { freshDatabase }; 