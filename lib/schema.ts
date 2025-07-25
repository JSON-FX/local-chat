import { getDatabase } from './database';

// Database schema creation and migration
export const initializeDatabase = async (): Promise<void> => {
  const db = await getDatabase();

  try {
    // Users table with enhanced admin fields
    await db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'moderator', 'user', 'system')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME,
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'banned')),
        name VARCHAR(100),
        last_name VARCHAR(100),
        middle_name VARCHAR(100),
        position VARCHAR(100),
        department VARCHAR(100),
        email VARCHAR(255),
        mobile_number VARCHAR(20),
        avatar_path VARCHAR(500),
        ban_reason TEXT,
        banned_until DATETIME,
        failed_login_attempts INTEGER DEFAULT 0,
        last_failed_login DATETIME,
        profile_data TEXT
      )
    `);

    // Sessions table with enhanced tracking
    await db.run(`
      CREATE TABLE IF NOT EXISTS sessions (
        id VARCHAR(255) PRIMARY KEY,
        user_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NOT NULL,
        ip_address VARCHAR(45),
        user_agent TEXT,
        is_active BOOLEAN DEFAULT 1,
        last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
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

    // Messages table with enhanced fields
    await db.run(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_id INTEGER,
        recipient_id INTEGER,
        group_id INTEGER,
        content TEXT,
        message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'image', 'system')),
        file_path VARCHAR(500),
        file_size INTEGER,
        file_type VARCHAR(100),
        original_filename VARCHAR(255),
        file_name TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_deleted BOOLEAN DEFAULT 0,
        is_read BOOLEAN DEFAULT 0,
        read_at DATETIME,
        queued BOOLEAN DEFAULT 0,
        user_deleted_by TEXT,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE SET NULL
      )
    `);

    // Message reads table for tracking read status
    await db.run(`
      CREATE TABLE IF NOT EXISTS message_reads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(message_id, user_id)
      )
    `);

    // Audit Log table - optimized for high-volume logging
    await db.run(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        username VARCHAR(50),
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('user', 'message', 'group', 'file', 'session', 'system')),
        entity_id INTEGER,
        details TEXT,
        ip_address VARCHAR(45),
        user_agent TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        severity VARCHAR(20) DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // System Metrics table for performance monitoring
    await db.run(`
      CREATE TABLE IF NOT EXISTS system_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        metric_name VARCHAR(100) NOT NULL,
        metric_value REAL NOT NULL,
        metric_type VARCHAR(20) NOT NULL CHECK (metric_type IN ('counter', 'gauge', 'histogram')),
        labels TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Run migrations to ensure all columns exist
    await runMigrations();
    
    // Create indexes for optimal performance in high-volume environment
    console.log('Creating performance indexes...');
    
    // User indexes
    await db.run('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');

    // Session indexes
    await db.run('CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_sessions_active ON sessions(is_active)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_sessions_last_activity ON sessions(last_activity)');

    // Message indexes for admin search and monitoring
    await db.run('CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON messages(recipient_id)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_messages_group_id ON messages(group_id)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(message_type)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_messages_deleted ON messages(is_deleted)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_messages_content_search ON messages(content)'); // For text search

    // Group indexes
    await db.run('CREATE INDEX IF NOT EXISTS idx_groups_created_by ON groups(created_by)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_groups_active ON groups(is_active)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_groups_created_at ON groups(created_at)');

    // Group member indexes
    await db.run('CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_group_members_role ON group_members(role)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_group_members_active ON group_members(is_active)');

    // Message reads indexes
    await db.run('CREATE INDEX IF NOT EXISTS idx_message_reads_message_id ON message_reads(message_id)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_message_reads_user_id ON message_reads(user_id)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_message_reads_read_at ON message_reads(read_at)');

    // Audit log indexes - critical for admin performance
    await db.run('CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_audit_logs_username ON audit_logs(username)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id ON audit_logs(entity_id)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON audit_logs(severity)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_audit_logs_ip_address ON audit_logs(ip_address)');

    // System metrics indexes
    await db.run('CREATE INDEX IF NOT EXISTS idx_system_metrics_name ON system_metrics(metric_name)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_system_metrics_type ON system_metrics(metric_type)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_system_metrics_timestamp ON system_metrics(timestamp)');

    // Composite indexes for common admin queries
    await db.run('CREATE INDEX IF NOT EXISTS idx_audit_logs_user_timestamp ON audit_logs(user_id, timestamp)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_timestamp ON audit_logs(entity_type, entity_id, timestamp)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_messages_sender_timestamp ON messages(sender_id, timestamp)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_messages_group_timestamp ON messages(group_id, timestamp)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_system_metrics_name_timestamp ON system_metrics(metric_name, timestamp)');

    console.log('✅ Database schema and indexes created successfully');

  } catch (error) {
    console.error('Database initialization error:', error);
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

    // Check and add additional user profile columns
    const userTableInfo = await db.all("PRAGMA table_info(users)");
    const userColumns = userTableInfo.map((column: any) => column.name);
    
    const profileColumns = [
      { name: 'name', type: 'VARCHAR(100)' },
      { name: 'last_name', type: 'VARCHAR(100)' },
      { name: 'middle_name', type: 'VARCHAR(100)' },
      { name: 'position', type: 'VARCHAR(100)' },
      { name: 'department', type: 'VARCHAR(100)' },
      { name: 'email', type: 'VARCHAR(255)' },
      { name: 'mobile_number', type: 'VARCHAR(20)' },
      { name: 'avatar_path', type: 'VARCHAR(500)' },
      { name: 'ban_reason', type: 'TEXT' },
      { name: 'banned_until', type: 'DATETIME' },
      { name: 'failed_login_attempts', type: 'INTEGER' },
      { name: 'last_failed_login', type: 'DATETIME' },
      { name: 'profile_data', type: 'TEXT' }
    ];

    for (const column of profileColumns) {
      if (!userColumns.includes(column.name)) {
        console.log(`Adding ${column.name} column to users table...`);
        await db.run(`ALTER TABLE users ADD COLUMN ${column.name} ${column.type}`);
        console.log(`✅ ${column.name} column added to users table`);
        
        // Set default values for specific columns that need them
        if (column.name === 'failed_login_attempts') {
          await db.run('UPDATE users SET failed_login_attempts = 0 WHERE failed_login_attempts IS NULL');
        }
      }
    }

    // Check and add user_deleted_by column to messages table
    const messageTableInfo = await db.all("PRAGMA table_info(messages)");
    const messageColumns = messageTableInfo.map((column: any) => column.name);
    
    if (!messageColumns.includes('user_deleted_by')) {
      console.log('Adding user_deleted_by column to messages table...');
      await db.run('ALTER TABLE messages ADD COLUMN user_deleted_by TEXT');
      console.log('✅ user_deleted_by column added to messages table');
    }

    // Check and add file_name column to messages table
    if (!messageColumns.includes('file_name')) {
      console.log('Adding file_name column to messages table...');
      await db.run('ALTER TABLE messages ADD COLUMN file_name TEXT DEFAULT NULL');
      console.log('✅ file_name column added to messages table');

    }

    // Check and add last_activity column to sessions table
    const sessionTableInfo = await db.all("PRAGMA table_info(sessions)");
    const sessionColumns = sessionTableInfo.map((column: any) => column.name);
    
    if (!sessionColumns.includes('last_activity')) {
      console.log('Adding last_activity column to sessions table...');
      await db.run('ALTER TABLE sessions ADD COLUMN last_activity DATETIME');
      // Update existing rows to have a default last_activity value
      await db.run('UPDATE sessions SET last_activity = created_at WHERE last_activity IS NULL');
      console.log('✅ last_activity column added to sessions table');

    // Ensure system user exists (for system messages)
    console.log(.Ensuring system user exists...);
    await db.run(`
      INSERT OR IGNORE INTO users (
        id, username, password_hash, role, name, status, created_at
      ) VALUES (
        0, "system", "system", "system", "System", "active", datetime("now")
      )
    `);
    console.log(.✅ System user ensured.);
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

// Create system user for system messages
export const createSystemUser = async (): Promise<void> => {
  const db = await getDatabase();
  
  try {
    // Check if system user exists
    const systemUser = await db.get('SELECT id FROM users WHERE id = 0');
    
    if (!systemUser) {
      // Insert system user with ID 0
      await db.run(
        'INSERT INTO users (id, username, password_hash, role, status) VALUES (0, ?, ?, ?, ?)',
        ['SYSTEM', 'N/A', 'system', 'active']
      );
      
      console.log('System user created for system messages');
    }
  } catch (error) {
    console.error('Error creating system user:', error);
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