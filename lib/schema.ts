import { getDatabase } from './database';

// Database schema creation and migration
export const initializeDatabase = async (): Promise<void> => {
  const db = await getDatabase();

  try {
    // Users table
    await db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'moderator', 'user')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME,
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'banned')),
        profile_data TEXT
      )
    `);

    // Sessions table
    await db.run(`
      CREATE TABLE IF NOT EXISTS sessions (
        id VARCHAR(255) PRIMARY KEY,
        user_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NOT NULL,
        ip_address VARCHAR(45),
        user_agent TEXT,
        is_active BOOLEAN DEFAULT 1,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Groups table
    await db.run(`
      CREATE TABLE IF NOT EXISTS groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        avatar_path VARCHAR(500),
        created_by INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT 1,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Group members table
    await db.run(`
      CREATE TABLE IF NOT EXISTS group_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        group_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT 1,
        FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(group_id, user_id)
      )
    `);

    // Messages table
    await db.run(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_id INTEGER NOT NULL,
        recipient_id INTEGER,
        group_id INTEGER,
        content TEXT NOT NULL,
        message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'image')),
        file_path VARCHAR(500),
        file_name VARCHAR(255),
        file_size INTEGER,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        edited_at DATETIME,
        is_deleted BOOLEAN DEFAULT 0,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
        CHECK ((recipient_id IS NOT NULL AND group_id IS NULL) OR (recipient_id IS NULL AND group_id IS NOT NULL))
      )
    `);

    // Run migrations for existing databases
    await runMigrations();

    // Create indexes for better performance
    await db.run('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON messages(recipient_id)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_messages_group_id ON messages(group_id)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id)');

    console.log('Database schema initialized successfully');
  } catch (error) {
    console.error('Error initializing database schema:', error);
    throw error;
  }
};

// Run database migrations for existing databases
const runMigrations = async (): Promise<void> => {
  const db = await getDatabase();
  
  try {
    // Check if avatar_path column exists in groups table
    const tableInfo = await db.all("PRAGMA table_info(groups)");
    const hasAvatarPath = tableInfo.some((column: any) => column.name === 'avatar_path');
    
    if (!hasAvatarPath) {
      console.log('Adding avatar_path column to groups table...');
      await db.run('ALTER TABLE groups ADD COLUMN avatar_path VARCHAR(500)');
      console.log('✅ avatar_path column added to groups table');
    }
  } catch (error) {
    console.error('Error running migrations:', error);
    // Don't throw here, as the table might not exist yet
  }
};

// Clean up expired sessions
export const cleanupExpiredSessions = async (): Promise<void> => {
  const db = await getDatabase();
  
  try {
    await db.run(
      'UPDATE sessions SET is_active = 0 WHERE expires_at < CURRENT_TIMESTAMP AND is_active = 1'
    );
  } catch (error) {
    console.error('Error cleaning up expired sessions:', error);
    throw error;
  }
};

// Create default admin user if none exists
export const createDefaultAdmin = async (username: string = 'admin', password: string = 'admin123'): Promise<void> => {
  const db = await getDatabase();
  const bcrypt = require('bcryptjs');
  
  try {
    // Check if any admin user exists
    const existingAdmin = await db.get('SELECT id FROM users WHERE role = ? LIMIT 1', ['admin']);
    
    if (!existingAdmin) {
      const passwordHash = await bcrypt.hash(password, 10);
      
      await db.run(
        'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
        [username, passwordHash, 'admin']
      );
      
      console.log(`Default admin user created: ${username}`);
      console.log(`Default password: ${password}`);
      console.log('Please change the default password after first login!');
    }
  } catch (error) {
    console.error('Error creating default admin user:', error);
    throw error;
  }
}; 