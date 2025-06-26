# Production Troubleshooting Guide

## Quick Fix for Common Production Issues

If you're seeing errors like:
- `⚠️ JWT_SECRET not set in environment`
- `Error: no such column: m.user_deleted_by`
- `Token verification failed: invalid signature`
- `Username already exists`

**Run this single command to fix all issues:**

```cmd
deployment\fix-production-issues.bat
```

This will:
1. ✅ Copy environment file to correct location
2. ✅ Stop existing Node processes
3. ✅ Fresh database migration (fixes schema)
4. ✅ Build application
5. ✅ Start production server

## Manual Fix Steps

If the batch file doesn't work, follow these steps:

### 1. Fix Environment File Issue
```cmd
copy deployment\production.env .env.production
```

### 2. Fix Database Schema Issues
```cmd
npm run fresh-db -- --force
```

### 3. Build Application
```cmd
npm run build
```

### 4. Start Production Server
```cmd
npm run prod
```

## Common Error Solutions

### JWT_SECRET Warning
**Problem:** `⚠️ JWT_SECRET not set in environment`
**Solution:** Environment file not in correct location
```cmd
copy deployment\production.env .env.production
```

### Database Schema Errors
**Problem:** `Error: no such column: m.user_deleted_by`
**Solution:** Database schema is outdated
```cmd
npm run fresh-db -- --force
```

### Token Verification Failed
**Problem:** `Token verification failed: invalid signature`
**Solution:** Different JWT secrets between sessions
```cmd
# Clear browser storage and restart server
npm run fresh-db -- --force
npm run prod
```

### Username Already Exists
**Problem:** `Registration error: Username already exists`
**Solution:** Clean database with fresh migration
```cmd
npm run fresh-db -- --force
```

### Port Already in Use
**Problem:** `Error: listen EADDRINUSE :::3000`
**Solution:** Stop existing processes
```cmd
taskkill /F /IM node.exe
netstat -an | findstr :3000
```

## Production Checklist

After fixing issues, verify:

- [ ] ✅ Server starts without JWT_SECRET warning
- [ ] ✅ Can access via browser: `http://192.168.32.6:3000`
- [ ] ✅ Can login with: admin / admin123
- [ ] ✅ No database column errors in console
- [ ] ✅ Socket connections work (real-time chat)
- [ ] ✅ File uploads work
- [ ] ✅ No token verification errors

## Security Reminders

1. **Change JWT Secret:** Edit `.env.production` and update `JWT_SECRET`
2. **Change Admin Password:** After login, change from default `admin123`
3. **Network Security:** Ensure firewall is properly configured

## Getting Help

If issues persist:
1. Check the full error log
2. Verify Node.js version: `node --version`
3. Check database file exists: `dir data\localchat.db`
4. Verify environment variables: `set | findstr JWT` 