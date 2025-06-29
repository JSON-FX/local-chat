# Docker Deployment Guide for LGU-Chat

This guide will help you deploy LGU-Chat using Docker and Docker Compose.

## Prerequisites

- Docker installed on your system
- Docker Compose installed (usually comes with Docker Desktop)
- At least 1GB of available disk space

## Quick Start

### 1. Clone and Prepare

```bash
git clone <your-repo-url>
cd lgu-chat
```

### 2. Set Up Local Domain (Recommended)

Set up `lgu-chat.local` domain for a better development experience:

**Option A: Automatic Setup (macOS/Linux)**
```bash
./setup-local-domain.sh
```

**Option B: Automatic Setup (Windows)**
```cmd
setup-local-domain.bat
```
(Run as Administrator)

**Option C: Manual Setup**
Add this line to your hosts file:
- **macOS/Linux:** `/etc/hosts`
- **Windows:** `C:\Windows\System32\drivers\etc\hosts`

```
127.0.0.1    lgu-chat.local
```

### 3. Set Up Environment (Optional)

Copy the example environment file and customize it:

```bash
cp docker.env.example .env
```

Edit `.env` with your preferred settings, especially the `JWT_SECRET` for production use.

### 4. Build and Run

```bash
# Build and start the application
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the application
docker-compose down
```

The application will be available at:
- **With local domain:** `http://lgu-chat.local`
- **Without local domain:** `http://localhost` (port 80)

## Default Login

- **Username:** `admin`
- **Password:** `admin123`

**⚠️ Important:** Change the default admin password immediately after first login!

## Configuration

### Environment Variables

The following environment variables can be configured in your `.env` file:

| Variable | Default | Description |
|----------|---------|-------------|
| `JWT_SECRET` | `change-this-in-production...` | JWT signing secret (change in production!) |
| `NODE_ENV` | `production` | Node.js environment |
| `PORT` | `3000` | Application port |
| `SERVER_HOST` | `0.0.0.0` | Server bind address |
| `DOMAIN_NAME` | `lgu-chat.local` | Your domain name (lgu-chat.local for development) |
| `CUSTOM_ALLOWED_IPS` | - | Comma-separated IPs for network access |
| `NEXT_PUBLIC_SOCKET_URL` | `http://lgu-chat.local` | Socket.IO URL (lgu-chat.local for development) |
| `JWT_EXPIRES_IN` | `24h` | JWT token expiration time |

### Volumes

The Docker setup uses the following volumes for data persistence:

- `./data:/app/data` - SQLite database storage
- `./uploads:/app/uploads` - User uploaded files

## Production Deployment

### 1. Security Considerations

1. **Change JWT Secret:**
   ```bash
   # Generate a secure random string
   openssl rand -base64 32
   ```
   Add this to your `.env` file as `JWT_SECRET`

2. **Change Default Admin Password:**
   - Login with `admin`/`admin123`
   - Go to admin panel and change the password immediately

3. **Set Proper Domain:**
   ```env
   DOMAIN_NAME=chat.yourdomain.com
   NEXT_PUBLIC_SOCKET_URL=https://chat.yourdomain.com
   ```

### 2. Reverse Proxy Setup (Nginx)

Example Nginx configuration:

```nginx
server {
    listen 80;
    server_name chat.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Socket.IO specific
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 3. SSL/TLS Setup

Use Let's Encrypt with Certbot:

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d chat.yourdomain.com
```

## Management Commands

### View Logs
```bash
docker-compose logs -f lgu-chat
```

### Restart Application
```bash
docker-compose restart lgu-chat
```

### Update Application
```bash
# Pull latest changes
git pull

# Rebuild and restart
docker-compose up -d --build
```

### Backup Data
```bash
# Backup database and uploads
tar -czf lgu-chat-backup-$(date +%Y%m%d).tar.gz data/ uploads/
```

### Restore Data
```bash
# Stop application
docker-compose down

# Restore backup
tar -xzf lgu-chat-backup-YYYYMMDD.tar.gz

# Start application
docker-compose up -d
```

## Troubleshooting

### Database Issues

If you encounter database problems:

```bash
# Stop the application
docker-compose down

# Remove existing database (⚠️ This will delete all data!)
rm -rf data/

# Start fresh
docker-compose up -d
```

### Permission Issues

If you encounter permission issues:

```bash
# Fix ownership
sudo chown -R $USER:$USER data/ uploads/

# Fix permissions
chmod -R 755 data/ uploads/
```

### Port Conflicts

If port 3000 is already in use, change it in `docker-compose.yml`:

```yaml
ports:
  - "8080:3000"  # Change 8080 to any available port
```

### Container Health Check

Check if the container is healthy:

```bash
docker-compose ps
docker inspect lgu-chat-app --format='{{.State.Health.Status}}'
```

## Advanced Configuration

### Using Named Volumes

For better data management, you can use named Docker volumes:

```yaml
# In docker-compose.yml
volumes:
  - lgu-chat-data:/app/data
  - lgu-chat-uploads:/app/uploads

# Add at the bottom of docker-compose.yml
volumes:
  lgu-chat-data:
  lgu-chat-uploads:
```

### Multi-Container Setup

For high availability, you might want to separate the database:

```yaml
# Example with external SQLite volume
services:
  lgu-chat:
    # ... existing configuration
    depends_on:
      - db-init
  
  db-init:
    image: alpine
    volumes:
      - ./data:/shared/data
    command: sh -c "mkdir -p /shared/data && chmod 755 /shared/data"
```

## Support

For issues and questions:

1. Check the logs: `docker-compose logs -f`
2. Verify environment variables are set correctly
3. Ensure ports are not in use by other applications
4. Check Docker and Docker Compose versions

## Development

To run in development mode with hot reloading:

```bash
# Use development override
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

Create `docker-compose.dev.yml`:

```yaml
version: '3.8'
services:
  lgu-chat:
    environment:
      - NODE_ENV=development
    volumes:
      - .:/app
      - /app/node_modules
    command: npm run dev
``` 