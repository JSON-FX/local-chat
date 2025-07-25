# URL Redirection Fix - chat.lgu.local

## Problem
- Accessing `chat.lgu.local` in browser was redirecting to `192.168.32.14`
- URL was changing from domain name to IP address

## Root Cause Analysis
1. **Nginx Configuration Issues:**
   - Missing proper nginx server block for `chat.lgu.local`
   - Default server redirect was causing fallback to IP address

2. **Environment Variable Mismatches:**
   - `NEXT_PUBLIC_SOCKET_URL` was set to `http://lgu-chat.lguquezon.internal`
   - Should be `http://chat.lgu.local` for proper domain handling

3. **CORS Configuration:**
   - Missing CORS headers for `chat.lgu.local` domain
   - Socket.IO connections were not properly configured

## Fixes Applied

### 1. Nginx Configuration
**File:** `/etc/nginx/sites-available/chat.lgu.local`
- Created dedicated server block for `chat.lgu.local`
- Added proper CORS headers for all routes
- Configured proxy settings to prevent redirects
- Key setting: `proxy_redirect off`

**CORS Headers Added:**
```nginx
add_header 'Access-Control-Allow-Origin' 'http://chat.lgu.local' always;
add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
add_header 'Access-Control-Allow-Credentials' 'true' always;
```

### 2. Environment Variables Update
**File:** `/var/www/html/local-chat/.env`

**Changed:**
```env
# OLD
DOMAIN_NAME=lgu-chat.lguquezon.internal
NEXT_PUBLIC_SOCKET_URL=http://lgu-chat.lguquezon.internal

# NEW
DOMAIN_NAME=chat.lgu.local
NEXT_PUBLIC_SOCKET_URL=http://chat.lgu.local
```

**Updated CORS Origins:**
```env
ALLOWED_ORIGINS=http://chat.lgu.local,http://lgu-chat.lguquezon.internal,http://192.168.32.14
```

### 3. Application Restart
- Stopped existing Node.js processes
- Restarted application with new environment variables
- Nginx configuration reloaded

## Verification Tests

### Server-Level Tests
```bash
# Test nginx response
curl -I http://chat.lgu.local
# Result: HTTP/1.1 200 OK (no redirects)

# Test CORS headers
curl -v http://chat.lgu.local | grep "Access-Control"
# Result: Proper CORS headers present
```

### Browser-Level Verification
- Access `http://chat.lgu.local` in browser
- URL should remain `chat.lgu.local` (no redirect to IP)
- Check browser developer tools for CORS errors
- Verify Socket.IO connection uses correct domain

## File Changes Summary

### Created/Modified Files:
1. `/etc/nginx/sites-available/chat.lgu.local` - New nginx server block
2. `/etc/nginx/sites-enabled/chat.lgu.local` - Enabled site
3. `/var/www/html/local-chat/.env` - Updated environment variables

### Backup Files Created:
1. `/var/www/html/local-chat/.env.backup-before-domain-fix` - Environment backup

## Status
- ✅ Server-level redirects: **FIXED**
- ✅ CORS configuration: **FIXED** 
- ✅ Environment variables: **UPDATED**
- ✅ Nginx configuration: **CONFIGURED**
- ✅ Application restarted: **COMPLETED**

## Next Steps for User
1. Clear browser cache and cookies for `chat.lgu.local`
2. Try accessing `http://chat.lgu.local` in browser
3. Verify URL stays as `chat.lgu.local` during navigation
4. Test Socket.IO functionality (real-time messaging)

---
**Fix Applied:** 2025-07-23 03:42 UTC  
**Status:** Ready for testing
