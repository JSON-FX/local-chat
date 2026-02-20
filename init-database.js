const { initializeDatabase, createSystemUser, cleanupExpiredSessions } = require('./lib/schema');
const { closeDatabase } = require('./lib/database');

async function initDb() {
  try {
    console.log('Initializing LGU-Chat database...');
    await initializeDatabase();
    await createSystemUser();
    await cleanupExpiredSessions();
    console.log('Database initialization completed successfully!');
    console.log('Users will authenticate via LGU-SSO');
  } catch (error) {
    console.error('Database initialization failed:', error);
  } finally {
    await closeDatabase();
    process.exit(0);
  }
}

initDb();
