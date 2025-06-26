# Windows Server Deployment Guide

## Server Information
- **IP:** 192.168.32.6
- **Username:** Administrator  
- **Project Location:** `C:\inetpub\wwwroot\github\local-chat` (or similar)

## Deployment Steps

### 1. Access the Server
Use Remote Desktop Connection or PowerShell to access:
```
mstsc /v:192.168.32.6
```

### 2. Navigate to Project Directory
```cmd
cd C:\inetpub\wwwroot\github\local-chat
```
*Note: Adjust path if the project is in a different location*

### 3. Pull Latest Changes
```cmd
git pull origin main
```

### 4. Test the Deployment Setup
```cmd
deployment\test-deployment.bat
```
This will verify:
- All required files exist
- Node.js and npm are working
- Database can be initialized
- Scripts have valid syntax
- Dependencies are available

### 5. Run Production Deployment
```cmd
deployment\deploy-production.bat
```
This will:
- Install dependencies
- Build application (may show warnings - that's OK)
- Initialize production database
- Clean up demo users
- Set admin password to: `adminmm0m!s`
- Deploy production server
- Configure IIS (if available)

### 6. Start Production Server
```cmd
deployment\start-production.bat
```

### 7. Verify Deployment
- Server should start on port 3000 (or 80 for production)
- Access via: `http://192.168.32.6:3000` or `http://lgu-chat.lguquezon.com.local`
- Login with:
  - **Username:** admin
  - **Password:** adminmm0m!s

## Troubleshooting

### If Test Fails
1. Check Node.js is installed: `node --version`
2. Install missing dependencies: `npm install`
3. Check file permissions
4. Verify Git repository is up to date

### If Deployment Fails
1. Check error messages carefully
2. Ensure port 80/3000 is not in use: `netstat -an | findstr :80`
3. Stop existing Node.js processes: `taskkill /F /IM node.exe`
4. Re-run deployment

### If Server Won't Start
1. Check if port is already in use
2. Try starting on different port: `set PORT=3001 && deployment\start-production.bat`
3. Check firewall settings
4. Verify IIS configuration

### Database Issues
1. Check if `data` directory exists and is writable
2. Verify SQLite is working: `node -e "console.log(require('sqlite3'))"`
3. Check database file permissions

## Manual Commands (if batch files fail)

### Manual Deployment
```cmd
rem Stop existing server
taskkill /F /IM node.exe

rem Install dependencies
npm install

rem Initialize database
npx tsx scripts/init-db.ts

rem Clean demo users
node scripts/manage-users.js cleanup

rem Set admin password
node scripts/manage-users.js password admin adminmm0m!s

rem Copy production files
copy deployment\production-server.js server-production.js
copy deployment\production.env .env.production
```

### Manual Server Start
```cmd
set NODE_ENV=production
set PORT=3000
node server-production.js
```

## Production Checklist

- [ ] Server accessible on network
- [ ] Git repository updated
- [ ] Dependencies installed
- [ ] Database initialized
- [ ] Demo users removed
- [ ] Admin password set to production credentials
- [ ] Production server deployed
- [ ] Server starts without errors
- [ ] Can access via web browser
- [ ] Can login with admin credentials
- [ ] Real-time messaging works
- [ ] File uploads work

## Network Access

### For LAN Access
- Server should be accessible via: `http://192.168.32.6:3000`
- Ensure Windows Firewall allows Node.js
- Check that port 3000 is open

### For Domain Access  
- Configure DNS for `lgu-chat.lguquezon.com.local`
- Set up IIS reverse proxy if needed
- Update CORS settings in production.env

## Security Notes

1. **Change JWT Secret:** Edit `deployment/production.env` and update `JWT_SECRET`
2. **Secure Admin Password:** The password `adminmm0m!s` is set during deployment
3. **Network Security:** Ensure only authorized IPs can access the server
4. **Regular Backups:** Backup `data/localchat.db` regularly

## Support Commands

### Check Users
```cmd
node scripts/manage-users.js list
```

### Change Admin Password
```cmd
node scripts/manage-users.js password admin NEW_PASSWORD
```

### Create New User
```cmd
node scripts/manage-users.js create username password user
```

### Check Server Status
```cmd
netstat -an | findstr :3000
tasklist | findstr node
``` 