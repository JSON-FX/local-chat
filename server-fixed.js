const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { SocketService } = require('./lib/socket');
const { FileService } = require('./lib/files');

const dev = process.env.NODE_ENV !== 'production';
// Use environment variables for production deployment
const hostname = process.env.SERVER_HOST || (dev ? 'localhost' : '0.0.0.0');
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

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