const { initializeDatabase, createDefaultAdmin, cleanupExpiredSessions } = require('./lib/schema');
const { closeDatabase } = require('./lib/database');

async function initDb() {
  try {
    console.log('🔄 Initializing LGU-Chat database...');
    await initializeDatabase();
    await createDefaultAdmin();
    await cleanupExpiredSessions();
    console.log('✅ Database initialization completed successfully!');
    console.log('📋 Login with username: admin, password: admin123');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
  } finally {
    await closeDatabase();
    process.exit(0);
  }
}

initDb(); 