/**
 * Direct database initialization script for LGU-Chat.
 * Creates the SQLite schema needed for SSO-based authentication.
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'data', 'localchat.db');
console.log(`Initializing database at: ${dbPath}`);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
    process.exit(1);
  }
  console.log('Connected to database.');
});

const run = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function(err) {
    if (err) reject(err);
    else resolve(this);
  });
});

const get = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => {
    if (err) reject(err);
    else resolve(row);
  });
});

async function init() {
  // Enable foreign keys
  await run('PRAGMA foreign_keys = ON');

  // Users table
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      sso_employee_uuid VARCHAR(36) UNIQUE NOT NULL,
      username VARCHAR(100) NOT NULL,
      email VARCHAR(255),
      role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'moderator', 'user', 'system')),
      sso_role VARCHAR(50),
      full_name VARCHAR(200),
      position VARCHAR(100),
      office_name VARCHAR(200),
      avatar_path VARCHAR(500),
      status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'banned')),
      profile_synced_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME
    )
  `);
  console.log('Created users table.');

  // Sessions table
  await run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id VARCHAR(255) PRIMARY KEY,
      user_id INTEGER NOT NULL,
      sso_token_hash VARCHAR(64),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL,
      ip_address VARCHAR(45),
      user_agent TEXT,
      is_active BOOLEAN DEFAULT 1,
      last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  console.log('Created sessions table.');

  // Groups table
  await run(`
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
  console.log('Created groups table.');

  // Group members table
  await run(`
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
  console.log('Created group_members table.');

  // Messages table
  await run(`
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
  console.log('Created messages table.');

  // Message reads table
  await run(`
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
  console.log('Created message_reads table.');

  // Audit Log table
  await run(`
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
  console.log('Created audit_logs table.');

  // System Metrics table
  await run(`
    CREATE TABLE IF NOT EXISTS system_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      metric_name VARCHAR(100) NOT NULL,
      metric_value REAL NOT NULL,
      metric_type VARCHAR(20) NOT NULL CHECK (metric_type IN ('counter', 'gauge', 'histogram')),
      labels TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('Created system_metrics table.');

  // Create indexes
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_users_sso_uuid ON users(sso_employee_uuid)',
    'CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)',
    'CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)',
    'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
    'CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at)',
    'CREATE INDEX IF NOT EXISTS idx_sessions_active ON sessions(is_active)',
    'CREATE INDEX IF NOT EXISTS idx_sessions_sso_token_hash ON sessions(sso_token_hash)',
    'CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id)',
    'CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp)',
    'CREATE INDEX IF NOT EXISTS idx_groups_created_by ON groups(created_by)',
    'CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp)',
  ];
  for (const idx of indexes) {
    await run(idx);
  }
  console.log('Created indexes.');

  // Create system user
  const systemUser = await get('SELECT id FROM users WHERE id = 0');
  if (!systemUser) {
    await run(
      'INSERT INTO users (id, sso_employee_uuid, username, role, status, full_name) VALUES (0, ?, ?, ?, ?, ?)',
      ['00000000-0000-0000-0000-000000000000', 'SYSTEM', 'system', 'active', 'System']
    );
    console.log('Created system user.');
  } else {
    console.log('System user already exists.');
  }

  console.log('\nDatabase initialization complete!');
  db.close();
}

init().catch((err) => {
  console.error('Init error:', err);
  db.close();
  process.exit(1);
});
