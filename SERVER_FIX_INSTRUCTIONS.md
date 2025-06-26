# Server Fix Instructions for Windows Deployment

## Problem
The server.js file contains TypeScript syntax that Node.js cannot execute, causing the error:
```
SyntaxError: missing ) after argument list
Error: Cannot find module './lib/socket'
```

## Quick Fix - Manual Method

### Step 1: Backup Current File
```batch
cd C:\inetpub\wwwroot\Github\local-chat
copy server.js server.js.broken
```

### Step 2: Replace server.js Content
Replace the entire content of `C:\inetpub\wwwroot\Github\local-chat\server.js` with the content from `server-fixed.js` in your local project.

You can either:
1. Copy the file using the deployment script: Run `deployment/deploy-fixed-server.bat`
2. Or manually copy-paste the content from `server-fixed.js`

### Step 3: Test the Server
```batch
cd C:\inetpub\wwwroot\Github\local-chat
node --check server.js
```

If no errors, test run:
```batch
node server.js
```

You should see:
```
> File storage initialized
✅ Socket.io server initialized
> Ready on http://0.0.0.0:3000
> Socket.io server is running
> Running in production mode
```

### Step 4: Start IIS Site
1. Open IIS Manager
2. Find your `lgu-chat` site
3. Start the site
4. Test access via: `http://lgu-chat.lguquezon.com.local`

## What Was Fixed

### Original Issues:
1. **TypeScript Syntax**: `req.url!` (non-null assertion) → `req.url || ''`
2. **TypeScript Imports**: ES6 imports → CommonJS requires
3. **Complex Dependencies**: Removed dependency on TypeScript lib files

### New Simplified Version:
- ✅ Pure JavaScript (no TypeScript syntax)
- ✅ Embedded Socket.io service (no external dependencies)
- ✅ Basic file upload support
- ✅ Simplified authentication (for testing)
- ✅ Production-ready CORS settings

## Default Test Credentials
- **Username**: `admin`
- **Password**: `admin123`

## Troubleshooting

### If Server Still Won't Start:
1. Check Node.js version: `node --version` (should be v14+)
2. Check if port 3000 is available: `netstat -an | findstr :3000`
3. Check file permissions on the project directory
4. Look for additional error messages in the console

### If Web Access Fails:
1. Verify IIS site is running
2. Check DNS resolution: `nslookup lgu-chat.lguquezon.com.local`
3. Check Windows Firewall settings for port 80
4. Verify `web.config` is present in the site directory

### If Socket.io Doesn't Work:
1. Check browser console for connection errors
2. Verify WebSocket support is enabled in IIS
3. Check if any proxy/firewall is blocking WebSocket connections

## Next Steps After Fix
1. Test basic server functionality
2. Initialize database (should happen automatically on first access)
3. Test user registration and login
4. Test file uploads
5. Test real-time messaging 