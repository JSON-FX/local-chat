#!/usr/bin/env tsx

import { initializeDatabase, createSystemUser, cleanupExpiredSessions } from '../lib/schema';
import { closeDatabase } from '../lib/database';

async function initDb() {
  try {
    console.log('Initializing LGU-Chat database...');

    // Initialize database schema
    await initializeDatabase();

    // Create system user for system messages
    await createSystemUser();

    // Clean up any expired sessions
    await cleanupExpiredSessions();

    console.log('Database initialization completed successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Configure SSO environment variables (SSO_API_URL, SSO_CLIENT_ID, SSO_CLIENT_SECRET, etc.)');
    console.log('2. Start the development server: npm run dev');
    console.log('3. Users will authenticate via LGU-SSO');

  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  } finally {
    await closeDatabase();
    process.exit(0);
  }
}

// Run if script is executed directly
if (require.main === module) {
  initDb();
}

export { initDb };
