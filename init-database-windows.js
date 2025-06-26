const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

async function initializeDatabase() {
  try {
    console.log('🔄 Initializing LocalChat database...');
    
    // Create data directory if it doesn't exist
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log('📁 Created data directory');
    }
    
    const dbPath = path.join(dataDir, 'localchat.db');
    console.log(`📍 Database path: ${dbPath}`);
    
    // Create database
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('❌ Error opening database:', err);
        process.exit(1);
      }
      console.log('✅ Connected to SQLite database');
    });
    
    // Enable foreign keys
    db.run('PRAGMA foreign_keys = ON');
    
    // Create tables
    const createTables = `
      -- Users table
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE,
        password_hash TEXT NOT NULL,
        full_name TEXT,
        avatar_url TEXT,
        is_online BOOLEAN DEFAULT FALSE,
        last_seen DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      -- Groups table
      CREATE TABLE IF NOT EXISTS groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        avatar_url TEXT,
        created_by INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id)
      );
      
      -- Group members table
      CREATE TABLE IF NOT EXISTS group_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        group_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        role TEXT DEFAULT 'member',
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(group_id, user_id)
      );
      
      -- Messages table
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        sender_id INTEGER NOT NULL,
        recipient_id INTEGER,
        group_id INTEGER,
        message_type TEXT DEFAULT 'text',
        file_url TEXT,
        file_name TEXT,
        file_size INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sender_id) REFERENCES users(id),
        FOREIGN KEY (recipient_id) REFERENCES users(id),
        FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
      );
      
      -- Message reads table
      CREATE TABLE IF NOT EXISTS message_reads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(message_id, user_id)
      );
      
      -- Sessions table
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        data TEXT NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `;
    
    // Execute table creation
    db.exec(createTables, (err) => {
      if (err) {
        console.error('❌ Error creating tables:', err);
        process.exit(1);
      }
      console.log('✅ Database schema created');
      
      // Create default admin user
      const bcrypt = require('bcryptjs');
      const adminPassword = bcrypt.hashSync('admin123', 10);
      
      db.run(
        'INSERT OR IGNORE INTO users (username, password_hash, full_name, is_online) VALUES (?, ?, ?, ?)',
        ['admin', adminPassword, 'Administrator', false],
        function(err) {
          if (err) {
            console.error('❌ Error creating admin user:', err);
          } else {
            console.log('✅ Default admin user created');
          }
          
          db.close((err) => {
            if (err) {
              console.error('❌ Error closing database:', err);
            } else {
              console.log('✅ Database initialization completed!');
              console.log('');
              console.log('📋 Next steps:');
              console.log('1. Start the development server: npm run dev');
              console.log('2. Login with username: admin, password: admin123');
              console.log('3. Change the default admin password immediately!');
            }
            process.exit(0);
          });
        }
      );
    });
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

initializeDatabase(); 