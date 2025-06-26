const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server: SocketServer } = require('socket.io');
const path = require('path');
const fs = require('fs').promises;
const { existsSync } = require('fs');
const crypto = require('crypto');

const dev = process.env.NODE_ENV !== 'production';
// Use environment variables for production deployment
const hostname = process.env.SERVER_HOST || (dev ? 'localhost' : '0.0.0.0');
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Global state for socket connections
const connectedUsers = new Map(); // userId -> socketId
const socketSessions = new Map(); // socketId -> {userId, username}

// Simplified FileService
class FileService {
  static UPLOAD_DIR = path.join(process.cwd(), 'uploads');
  
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

// Simplified SocketService
class SocketService {
  static io = null;

  static initialize(server) {
    if (this.io) {
      return this.io;
    }

    this.io = new SocketServer(server, {
      cors: {
        origin: dev ? [
          'http://localhost:3000',
          'http://127.0.0.1:3000',
          /^http:\/\/192\.168\.\d+\.\d+:3000$/,
          /^http:\/\/10\.\d+\.\d+\.\d+:3000$/,
          /^http:\/\/172\.(1[6-9]|2\d|3[01])\.\d+\.\d+:3000$/
        ] : false,
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

      // Basic authentication handler (simplified)
      socket.on('authenticate', async (data) => {
        try {
          console.log(`🔐 Authentication attempt from socket: ${socket.id}`);
          
          // For now, just accept any authentication attempt
          // In production, you'd validate the token here
          const user = { id: 1, username: 'demo' };
          
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

          console.log(`✅ User authenticated: ${user.username} (${socket.id})`);

        } catch (error) {
          console.error('Authentication error:', error);
          socket.emit('auth_error', { error: 'Authentication failed' });
          socket.disconnect();
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

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url || '', true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Initialize Socket.io
  SocketService.initialize(server);

  // Initialize file storage
  FileService.initializeStorage().then(() => {
    console.log('> File storage initialized');
  }).catch((err) => {
    console.error('Error initializing file storage:', err);
  });

  server.listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log('> Socket.io server is running');
    if (!dev) {
      console.log('> Running in production mode');
      console.log(`> Access via: http://${process.env.DOMAIN_NAME || hostname}${port !== 80 ? ':' + port : ''}`);
    }
  });
}).catch((err) => {
  console.error('Error starting server:', err);
  process.exit(1);
}); 