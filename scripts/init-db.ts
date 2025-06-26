#!/usr/bin/env tsx

import { initializeDatabase, createDefaultAdmin, cleanupExpiredSessions } from '../lib/schema';
import { closeDatabase } from '../lib/database';

async function initDb() {
  try {
    console.log('🔄 Initializing LGU-Chat database...');
    
    // Initialize database schema
    await initializeDatabase();
    
    // Create default admin user
    await createDefaultAdmin();
    
    // Clean up any expired sessions
    await cleanupExpiredSessions();
    
    console.log('✅ Database initialization completed successfully!');
    console.log('');
    console.log('📋 Next steps:');
    console.log('1. Start the development server: npm run dev');
    console.log('2. Login with username: admin, password: admin123');
    console.log('3. Change the default admin password immediately!');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
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