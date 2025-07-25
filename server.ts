// Load environment variables first
import dotenv from 'dotenv';
dotenv.config();

import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { networkInterfaces } from 'os';
import { SocketService } from './lib/socket';
import { FileService } from './lib/files';

const dev = process.env.NODE_ENV !== 'production';

// Function to get local IP address
function getLocalIPAddress(): string {
  const networks = networkInterfaces();
  for (const name of Object.keys(networks)) {
    for (const net of networks[name] || []) {
      if (!net.internal && net.family === 'IPv4') {
        return net.address;
      }
    }
  }
  return 'localhost';
}

// Use environment variables for production deployment
const hostname = process.env.SERVER_HOST || (dev ? '0.0.0.0' : '0.0.0.0');
const port = parseInt(process.env.PORT || '3000', 10);
const localIP = getLocalIPAddress();

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
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
    console.log('');
    console.log('🚀 LGU-Chat Server Started Successfully!');
    console.log('='.repeat(50));
    
    if (dev) {
      console.log('📍 DEVELOPMENT MODE');
      console.log(`📱 Local Access:     http://localhost:${port}`);
      console.log(`🌐 Network Access:   http://${localIP}:${port}`);
      console.log('');
      console.log('👥 Share with others using the Network Access URL');
      console.log('💡 Users on the same network can connect via your IP');
    } else {
      console.log('🏭 PRODUCTION MODE');
      console.log(`🌐 Server Address:   http://${process.env.DOMAIN_NAME || hostname}${port !== 80 ? ':' + port : ''}`);
      console.log(`📍 Local IP:         http://${localIP}:${port}`);
    }
    
    console.log('');
    console.log('⚡ Socket.io server is running');
    console.log('🔧 Ready to accept connections');
    console.log('='.repeat(50));
  });
}).catch((err) => {
  console.error('Error starting server:', err);
  process.exit(1);
});
