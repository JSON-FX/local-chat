# LGU-Chat Production Setup Guide

This guide will help you deploy LGU-Chat in production mode with proper security and remove any demo/test users.

## Quick Production Deployment

### 1. Stop Current Server
```bash
taskkill /F /IM node.exe
```

### 2. Deploy Production Configuration
```bash
# Run the automated deployment
cd /path/to/lgu-chat
deployment\deploy-production.bat
```

### 3. Clean Up Demo Users
```bash
# Remove demo/test users and data
node scripts/manage-users.js cleanup

# List current users to verify
node scripts/manage-users.js list
```

### 4. Secure Admin Account
```bash
# Change admin password immediately
node scripts/manage-users.js password admin YOUR_NEW_SECURE_PASSWORD
```

### 5. Start Production Server
```bash
deployment\start-production.bat
```

## Manual Production Setup

### 1. Environment Configuration

Edit `deployment/production.env`:
```env
NODE_ENV=production
PORT=80
DB_PATH=./data/localchat.db
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760

# CHANGE THIS SECRET KEY!
JWT_SECRET=YOUR-UNIQUE-SECRET-KEY-HERE

ALLOWED_ORIGINS=http://lgu-chat.lguquezon.com.local,https://lgu-chat.lguquezon.com.local
CUSTOM_ALLOWED_IPS=192.168.32.0/24,192.168.1.0/24,10.0.0.0/8,172.16.0.0/12
SERVER_HOST=0.0.0.0
DOMAIN_NAME=lgu-chat.lguquezon.com.local
SERVER_IP=192.168.32.6
```

### 2. Install Production Dependencies
```bash
npm ci --only=production
```

### 3. Build Application
```bash
npm run build
```

### 4. Initialize Database
```bash
npx tsx scripts/init-db.ts
```

### 5. User Management

#### Remove Demo Users
```bash
# Clean up all demo/test data
node scripts/manage-users.js cleanup

# Or remove specific users
node scripts/manage-users.js remove demo
node scripts/manage-users.js remove test
```

#### Change Admin Password
```bash
node scripts/manage-users.js password admin YourNewSecurePassword123
```

#### Create New Users
```bash
# Create regular user
node scripts/manage-users.js create john password123 user

# Create admin user
node scripts/manage-users.js create manager securepass admin
```

#### List All Users
```bash
node scripts/manage-users.js list
```

### 6. Start Production Server

#### Option A: Use Batch Script
```bash
deployment\start-production.bat
```

#### Option B: Manual Start
```bash
set NODE_ENV=production
node server-production.js
```

## Production Security Checklist

### ✅ Required Steps
- [ ] Change JWT_SECRET in production.env
- [ ] Change default admin password
- [ ] Remove all demo/test users
- [ ] Verify database is properly initialized
- [ ] Test authentication without demo users
- [ ] Verify CORS settings for your domain
- [ ] Test file upload functionality
- [ ] Verify SSL/HTTPS if using secure connections

### ✅ Network Security
- [ ] Firewall configured for port 80/443
- [ ] Network access limited to allowed IP ranges
- [ ] DNS properly configured
- [ ] IIS properly configured with secure headers

### ✅ Application Security
- [ ] All default passwords changed
- [ ] No test/demo accounts exist
- [ ] File upload directory secured
- [ ] Database file permissions set correctly
- [ ] Log files configured and rotated

## Troubleshooting

### Server Won't Start
1. Check if port is already in use: `netstat -an | findstr :80`
2. Verify Node.js is installed: `node --version`
3. Check environment variables are loaded
4. Verify database file exists and is accessible

### Demo User Still Appears
1. Stop the server completely
2. Run: `node scripts/manage-users.js cleanup`
3. Verify: `node scripts/manage-users.js list`
4. If using old server-fixed.js, switch to server-production.js

### Authentication Issues
1. Verify JWT_SECRET is set and matches frontend
2. Check database has proper admin user
3. Verify CORS settings for your domain
4. Check browser network tab for authentication errors

### Cannot Login After Password Change
1. Clear browser cookies/localStorage
2. Verify password was changed: `node scripts/manage-users.js list`
3. Check server logs for authentication errors
4. Try creating a new admin user as backup

## Production Monitoring

### Log Files
- Server logs: Check console output
- IIS logs: `C:\inetpub\logs\LogFiles\W3SVC1\`
- Application errors: Browser developer console

### Health Checks
```bash
# Check server is running
curl http://lgu-chat.lguquezon.com.local

# Check socket.io
curl http://lgu-chat.lguquezon.com.local/socket.io/

# Verify users can authenticate
# (Test with production credentials)
```

## Backup and Recovery

### Regular Backups
```bash
# Backup database
copy data\localchat.db data\localchat.db.backup.%date%

# Backup uploads
xcopy uploads uploads_backup\ /E /I

# Backup configuration
copy deployment\production.env production.env.backup
```

### Restore from Backup
```bash
# Stop server
taskkill /F /IM node.exe

# Restore database
copy data\localchat.db.backup.YYYYMMDD data\localchat.db

# Restart server
deployment\start-production.bat
```

## Support

For issues with production deployment, check:
1. This guide's troubleshooting section
2. Server console logs
3. IIS logs
4. Browser developer tools

Remember to keep your JWT_SECRET secure and change all default passwords before going live! 