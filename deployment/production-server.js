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
    const dbPath = path.join(__dirname, '..', 'data', 'chat.db');
    
    // Check if database directory exists
    const dbDir = path.dirname(dbPath);
    if (!existsSync(dbDir)) {
      console.log('Creating database directory:', dbDir);
      await fs.mkdir(dbDir, { recursive: true });
    }
    
    // Check if database exists, if not, we need to run initialization
    const dbExists = existsSync(dbPath);
    if (!dbExists) {
      console.error('Database file does not exist at:', dbPath);
      console.error('Please run: npm run init-db');
      process.exit(1);
    }

    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
    
    // Verify database has required tables
    const tableExists = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='users'");
    if (!tableExists) {
      console.error('Database exists but users table is missing. Please run: npm run init-db');
      process.exit(1);
    }
    
    console.log('✅ Database connection initialized');
  } catch (error) {
    console.error('Failed to initialize database:', error);
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

  static initialize(server) {
    if (this.io) {
      return this.io;
    }

    // Production CORS configuration
    const allowedOrigins = process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',')
      : [`http://${process.env.DOMAIN_NAME}`, `https://${process.env.DOMAIN_NAME}`];

    console.log('[SocketServer] Initializing with CORS allowed origins:', allowedOrigins);

    this.io = new SocketServer(server, {
      cors: {
        origin: dev ? [
          'http://localhost:3000',
          'http://127.0.0.1:3000',
          /^http:\/\/192\.168\.\d+\.\d+:3000$/,
          /^http:\/\/10\.\d+\.\d+\.\d+:3000$/,
          /^http:\/\/172\.(1[6-9]|2\d|3[01])\.\d+\.\d+:3000$/
        ] : [
          `http://${process.env.SERVER_IP}:${port}`,
          `http://${process.env.DOMAIN_NAME}`,
          `https://${process.env.DOMAIN_NAME}`,
          ...allowedOrigins
        ],
        methods: ['GET', 'POST'],
        credentials: true
      },
      path: '/socket.io/'
    });

    this.setupSocketHandlers();
    console.log('✅ Socket.io server initialized');
    
    return this.io;
  }

  static setupSocketHandlers() {
    if (!this.io) return;

    this.io.on('connection', (socket) => {
      console.log(`🔌 Socket connected: ${socket.id}`);

      // Proper authentication handler
      socket.on('authenticate', async (data) => {
        try {
          console.log(`🔐 Authentication attempt from socket: ${socket.id}`);
          console.log(`[SocketServer] Received token for auth: ${data.token}`);
          
          if (!data.token) {
            socket.emit('auth_error', { error: 'No token provided' });
            socket.disconnect();
            return;
          }

          // Verify JWT token
          const decoded = verifyToken(data.token);
          if (!decoded) {
            socket.emit('auth_error', { error: 'Invalid token' });
            socket.disconnect();
            return;
          }

          // Get user from database
          const user = await getUserFromDatabase(decoded.userId);
          if (!user) {
            socket.emit('auth_error', { error: 'User not found' });
            socket.disconnect();
            return;
          }
          
          socketSessions.set(socket.id, { 
            userId: user.id, 
            username: user.username 
          });
          
          connectedUsers.set(user.id, socket.id);
          socket.join(`user_${user.id}`);

          socket.emit('authenticated', { 
            userId: user.id, 
            username: user.username,
            message: 'Successfully authenticated' 
          });

          // Broadcast user online status
          socket.broadcast.emit('user_online', { 
            userId: user.id, 
            username: user.username 
          });

          console.log(`✅ User authenticated: ${user.username} (${socket.id})`);

        } catch (error) {
          console.error('Authentication error:', error);
          socket.emit('auth_error', { error: 'Authentication failed' });
          socket.disconnect();
        }
      });

      // Handle message sending
      socket.on('send_message', async (data) => {
        const session = socketSessions.get(socket.id);
        if (!session) {
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }

        try {
          // Basic message handling (extend as needed)
          const message = {
            id: Date.now(), // Simple ID generation
            senderId: session.userId,
            senderUsername: session.username,
            content: data.content,
            timestamp: new Date().toISOString(),
            type: data.type || 'text'
          };

          if (data.recipientId) {
            // Direct message
            const recipientSocketId = connectedUsers.get(data.recipientId);
            if (recipientSocketId) {
              this.io.to(recipientSocketId).emit('new_message', message);
            }
          } else if (data.groupId) {
            // Group message
            socket.to(`group_${data.groupId}`).emit('new_message', message);
          }

          socket.emit('message_sent', { messageId: message.id, status: 'delivered' });
        } catch (error) {
          console.error('Error sending message:', error);
          socket.emit('error', { message: 'Failed to send message' });
        }
      });

      // Handle joining groups
      socket.on('join_group', (data) => {
        const session = socketSessions.get(socket.id);
        if (session && data.groupId) {
          socket.join(`group_${data.groupId}`);
          console.log(`User ${session.username} joined group ${data.groupId}`);
        }
      });

      // Handle leaving groups
      socket.on('leave_group', (data) => {
        const session = socketSessions.get(socket.id);
        if (session && data.groupId) {
          socket.leave(`group_${data.groupId}`);
          console.log(`User ${session.username} left group ${data.groupId}`);
        }
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        console.log(`🔌 Socket disconnected: ${socket.id}`);
        
        const session = socketSessions.get(socket.id);
        if (session) {
          connectedUsers.delete(session.userId);
          socketSessions.delete(socket.id);
          
          socket.broadcast.emit('user_offline', { 
            userId: session.userId, 
            username: session.username 
          });
        }
      });
    });
  }

  static getOnlineUsers() {
    const users = [];
    for (const [socketId, session] of socketSessions.entries()) {
      users.push({
        userId: session.userId,
        username: session.username,
        socketId: socketId
      });
    }
    return users;
  }

  static isUserOnline(userId) {
    return connectedUsers.has(userId);
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