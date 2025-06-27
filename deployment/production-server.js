const express = require('express');
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server: SocketServer } = require('socket.io');
const path = require('path');
const fs = require('fs').promises;
const { existsSync } = require('fs');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

// Load environment variables from production.env if it exists
const envPath = path.join(__dirname, 'production.env');
if (existsSync(envPath)) {
  console.log('Loading environment variables from production.env');
  require('dotenv').config({ path: envPath });
}

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-this';

const app = next({ dev });
const handle = app.getRequestHandler();

// Global state for socket connections
const connectedUsers = new Map(); // userId -> socketId
const socketSessions = new Map(); // socketId -> {userId, username}

// Initialize database connection
let db;
async function initializeDatabase() {
  try {
    const dbPath = path.resolve(path.join(__dirname, '..', 'data', 'localchat.db'));
    console.log('🔍 Attempting to initialize database at:', dbPath);
    
    // Check if database directory exists
    const dbDir = path.dirname(dbPath);
    console.log('📁 Database directory:', dbDir);
    if (!existsSync(dbDir)) {
      console.log('📁 Creating database directory:', dbDir);
      await fs.mkdir(dbDir, { recursive: true });
    }
    
    // Check if database exists
    const dbExists = existsSync(dbPath);
    console.log('💾 Database file exists:', dbExists);
    if (!dbExists) {
      console.error('❌ Database file does not exist at:', dbPath);
      console.error('⚠️ Please run: npm run init-db');
      process.exit(1);
    }

    console.log('🔌 Opening database connection...');
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
    
    // List all tables in the database
    console.log('📋 Checking database tables...');
    const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table'");
    console.log('📋 Found tables:', tables.map(t => t.name).join(', '));
    
    // Verify database has required tables
    const tableExists = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='users'");
    if (!tableExists) {
      console.error('❌ Database exists but users table is missing.');
      console.error('📋 Current tables:', tables.map(t => t.name).join(', '));
      console.error('⚠️ Please run: npm run init-db');
      await db.close();
      process.exit(1);
    }
    
    // Verify we can actually query the users table
    try {
      const userCount = await db.get('SELECT COUNT(*) as count FROM users');
      console.log('👥 Number of users in database:', userCount.count);
    } catch (error) {
      console.error('❌ Failed to query users table:', error);
      await db.close();
      process.exit(1);
    }
    
    console.log('✅ Database connection initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    if (db) await db.close();
    process.exit(1);
  }
}

// Authentication helper
function verifyToken(token) {
  try {
    console.log(`[SocketServer] Verifying token with JWT_SECRET: ${JWT_SECRET.substring(0, 10)}...`);
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

// Get user from database
async function getUserFromDatabase(userId) {
  try {
    if (!db) await initializeDatabase();
    const user = await db.get('SELECT id, username FROM users WHERE id = ?', [userId]);
    return user;
  } catch (error) {
    console.error('Failed to get user from database:', error);
    return null;
  }
}

// Simplified FileService
class FileService {
  static UPLOAD_DIR = process.env.UPLOAD_PATH || path.join(process.cwd(), 'uploads');
  
  static async initializeStorage() {
    try {
      if (!existsSync(this.UPLOAD_DIR)) {
        await fs.mkdir(this.UPLOAD_DIR, { recursive: true });
        console.log('Upload directory created:', this.UPLOAD_DIR);
      }
    } catch (error) {
      console.error('Error initializing file storage:', error);
      throw error;
    }
  }
}

// Simplified SocketService with proper authentication
class SocketService {
  static io = null;
  static userSockets = new Map(); // Track user socket mappings

  static initialize(server) {
    if (this.io) return;

    // Initialize base allowed origins
    const baseAllowedOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      /^http:\/\/192\.168\.\d+\.\d+:3000$/,
      /^http:\/\/10\.\d+\.\d+\.\d+:3000$/,
      /^http:\/\/172\.(1[6-9]|2\d|3[01])\.\d+\.\d+:3000$/
    ];

    // Add production origins if not in dev mode
    const allowedOrigins = dev ? baseAllowedOrigins : [
      `http://${process.env.SERVER_IP}:${port}`,
      `http://${process.env.DOMAIN_NAME}`,
      `https://${process.env.DOMAIN_NAME}`,
      ...baseAllowedOrigins
    ];

    console.log('[SocketServer] Initializing with CORS allowed origins:', allowedOrigins);

    this.io = new SocketServer(server, {
      cors: {
        origin: allowedOrigins,
        methods: ['GET', 'POST'],
        credentials: true
      },
      path: '/socket.io/'
    });

    this.io.on('connection', async (socket) => {
      console.log(`🔌 Socket connected: ${socket.id}`);
      
      socket.on('authenticate', async (tokenData) => {
        try {
          console.log(`🔐 Authentication attempt from socket: ${socket.id}`);
          console.log(`[SocketServer] Received token for auth:`, tokenData);
          
          // Extract token string from token object
          const tokenString = typeof tokenData === 'string' ? tokenData : tokenData?.token;
          if (!tokenString) {
            console.error(`❌ No valid token provided for socket ${socket.id}`);
            socket.disconnect();
            return;
          }
          
          const decoded = verifyToken(tokenString);
          if (!decoded || !decoded.userId) {
            console.error(`❌ Invalid token for socket ${socket.id}:`, decoded);
            socket.disconnect();
            return;
          }

          const user = await getUserFromDatabase(decoded.userId);
          if (!user) {
            console.error(`❌ User not found for socket ${socket.id}, userId: ${decoded.userId}`);
            socket.disconnect();
            return;
          }

          // Store socket data
          socket.userId = user.id;
          socket.username = user.username;
          
          // Update socket mapping
          this.userSockets.set(user.id, socket.id);
          console.log(`✅ User authenticated: ${user.username} (${socket.id})`);
          console.log(`📍 Current socket mappings:`, Object.fromEntries(this.userSockets));

        } catch (error) {
          console.error(`❌ Authentication error for socket ${socket.id}:`, error);
          socket.disconnect();
        }
      });

      socket.on('disconnect', () => {
        console.log(`🔌 Socket disconnected: ${socket.id}`);
        if (socket.userId) {
          this.userSockets.delete(socket.userId);
          console.log(`📍 Updated socket mappings:`, Object.fromEntries(this.userSockets));
        }
      });
    });

    console.log('✅ Socket.io server initialized');
  }

  static async sendToUser(userId, event, data) {
    try {
      const socketId = this.userSockets.get(userId);
      console.log(`📨 Attempting to send to user ${userId}:`, { event, socketId, hasIo: !!this.io });
      
      if (!socketId) {
        console.warn(`⚠️ No socket found for user ${userId}`);
        return false;
      }

      if (!this.io) {
        console.error('❌ Socket.io not initialized');
        return false;
      }

      await this.io.to(socketId).emit(event, data);
      console.log(`✅ Message sent to user ${userId} (${socketId})`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to send to user ${userId}:`, error);
      return false;
    }
  }
}

async function startServer() {
  try {
    // Prepare Next.js first
    await app.prepare();
    console.log('✅ Next.js prepared');
    
    // Initialize database
    await initializeDatabase();
    
    // Initialize file storage
    await FileService.initializeStorage();
    console.log('> File storage initialized');

    // Create HTTP server
    const server = createServer(async (req, res) => {
      try {
        const parsedUrl = parse(req.url, true);
        await handle(req, res, parsedUrl);
      } catch (err) {
        console.error('Error handling request:', err);
        res.statusCode = 500;
        res.end('Internal Server Error');
      }
    });

    // Initialize Socket.io
    SocketService.initialize(server);

    // Start listening
    server.listen(port, '0.0.0.0', (err) => {
      if (err) throw err;
      console.log(`> Ready on http://0.0.0.0:${port}`);
      console.log('> Socket.io server is running');
      console.log('> Running in production mode');
      console.log(`> Access via: http://localhost:${port}`);
      console.log('> Production security enabled');
    });

  } catch (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
}

// Start the server
startServer(); 