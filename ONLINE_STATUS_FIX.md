# Online/Offline Status Fix - chat.lgu.local

## Problem
- User shows as "offline" after logging in
- Socket.IO connection might not be establishing properly in browser

## Root Causes Identified & Fixed

### 1. Environment Variables Not Loaded by PM2
**Issue**: PM2 was not loading environment variables from `.env` file
**Fix Applied**: Updated `ecosystem.config.js` to properly load dotenv:
```javascript
require('dotenv').config();
// ... spread process.env into PM2 env config
```

### 2. CORS Origins Mismatch
**Issue**: Socket.IO server had hardcoded `lgu-chat.lguquezon.local` instead of `chat.lgu.local`
**Fix Applied**: Updated `/var/www/html/local-chat/lib/socket.ts` to use correct domain

### 3. Socket.IO Connection Configuration
**Verified Working**: 
- WebSocket upgrade: ✅ Working
- Polling fallback: ✅ Working
- Authentication flow: ✅ Working
- CORS headers: ✅ Properly configured

## Current Status

### Server-Side Verification
```bash
# Authentication endpoint working
curl -X POST http://chat.lgu.local/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
# Result: ✅ Returns valid JWT token

# Socket.IO endpoint accessible
curl http://chat.lgu.local/socket.io/socket.io.js
# Result: ✅ Returns Socket.IO client library

# WebSocket upgrade working
# Result: ✅ 101 Switching Protocols

# Command-line Socket.IO test
# Result: ✅ Successfully connects and authenticates
```

## Browser Troubleshooting Steps

### 1. Clear Browser Data
- Clear all cookies for `chat.lgu.local`
- Clear localStorage
- Clear browser cache
- Use Incognito/Private mode to test

### 2. Check Browser Console
Open Developer Tools (F12) and check:
- Console tab for errors
- Network tab → WS filter to see WebSocket connections
- Look for blocked requests or CORS errors

### 3. Common Browser Issues & Solutions

#### Mixed Content (HTTPS/HTTP)
- **Check**: Is browser forcing HTTPS?
- **Solution**: Ensure accessing via `http://chat.lgu.local` (not https)

#### Browser Extensions
- **Check**: Ad blockers, privacy extensions
- **Solution**: Disable extensions or use incognito mode

#### Firewall/Antivirus
- **Check**: Some security software blocks WebSocket
- **Solution**: Add exception for chat.lgu.local

### 4. Socket.IO Connection Debug
Add to browser console:
```javascript
localStorage.debug = 'socket.io-client:*';
// Reload page to see detailed Socket.IO logs
```

## HTTPS Consideration

Currently configured for HTTP only. If HTTPS is required:

### Option 1: Self-Signed Certificate (Quick)
```bash
sudo apt-get install -y certbot
sudo certbot certonly --standalone -d chat.lgu.local
```

### Option 2: Let's Encrypt (if public domain)
```bash
sudo certbot --nginx -d chat.lgu.local
```

### Option 3: Use existing certificate
Update nginx configuration with SSL settings

## Quick Test Commands

### From Server:
```bash
# Check if app is running
pm2 status lgu-chat

# Check recent logs
pm2 logs lgu-chat --lines 50

# Monitor real-time logs
pm2 logs lgu-chat
```

### From Browser Console:
```javascript
// Check if socket is connected
if (window.socket) {
  console.log('Socket connected:', window.socket.connected);
  console.log('Socket ID:', window.socket.id);
}
```

## Status Summary
- ✅ Server configuration: Fixed
- ✅ CORS configuration: Fixed
- ✅ Environment variables: Fixed
- ✅ Socket.IO server: Working
- ✅ Authentication: Working
- ⚠️ Browser connection: Requires user verification

## Next Steps
1. Clear browser data completely
2. Access http://chat.lgu.local in incognito mode
3. Login with credentials
4. Check online status indicator
5. If still offline, check browser console for errors

---
**Fix Applied:** 2025-07-23 04:15 UTC
**Server Status:** Fully operational
