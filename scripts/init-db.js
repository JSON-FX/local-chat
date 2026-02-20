const { initializeDatabase, createSystemUser, cleanupExpiredSessions } = require('../lib/schema');
const { closeDatabase } = require('../lib/database');

async function initDb() {
  try {
    console.log('Initializing LGU-Chat database...');

    // Initialize database schema
    await initializeDatabase();

    // Create system user
    await createSystemUser();

    // Clean up any expired sessions
    await cleanupExpiredSessions();

    console.log('Database initialization completed successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Configure SSO environment variables');
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

module.exports = { initDb };
