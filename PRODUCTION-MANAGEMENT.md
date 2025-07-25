# LGU-Chat Production Server Management

## 🚀 Server Status

Your LGU-Chat application is now running in **production mode** with PM2 process management.

### Server URLs
- **Domain**: http://chat.lgu.local:3000
- **Local IP**: http://192.168.32.14:3000

## 📋 Quick Commands

Use the production management script for easy server management:

```bash
cd /var/www/html/local-chat

# Check server status (default)
./production-scripts.sh status

# View live logs
./production-scripts.sh logs

# Restart the server
./production-scripts.sh restart

# Deploy updates
./production-scripts.sh deploy

# Create database backup
./production-scripts.sh backup
```

## 🔧 Manual PM2 Commands

If you prefer using PM2 directly:

```bash
# Check status
pm2 status

# View logs
pm2 logs lgu-chat

# Restart
pm2 restart lgu-chat

# Stop
pm2 stop lgu-chat

# Start
pm2 start lgu-chat

# Monitor resources
pm2 monit
```

## 🛠️ System Integration

### Auto-Start on Boot
✅ **Already configured!** The server will automatically start when the system reboots.

### Process Management
- **Process Manager**: PM2
- **Auto-restart**: ✅ Enabled (if the app crashes)
- **Memory limit**: 1GB (auto-restart if exceeded)
- **Log rotation**: ✅ Enabled

### Log Files
- **Combined logs**: `/var/log/lgu-chat/combined.log`
- **Error logs**: `/var/log/lgu-chat/error.log`
- **Output logs**: `/var/log/lgu-chat/out.log`

## 🔄 Deployment Process

When you need to deploy updates:

1. **Stop manual npm start** if running
2. **Use the deploy script**:
   ```bash
   ./production-scripts.sh deploy
   ```

This will:
- Pull latest code changes
- Install dependencies
- Build the application
- Restart PM2 automatically

## 📊 Monitoring

### Real-time Monitoring
```bash
pm2 monit
```

### Check Logs
```bash
# Live logs
pm2 logs lgu-chat

# Error logs only
pm2 logs lgu-chat --err

# Specific number of lines
pm2 logs lgu-chat --lines 100
```

## 🔒 Security Notes

- Environment variables are loaded from `.env` file
- JWT secrets are properly configured
- Database is located at `./data/localchat.db`
- File uploads stored in `./uploads/`

## 📋 Maintenance Tasks

### Regular Backups
```bash
./production-scripts.sh backup
```

### Log Cleanup (if needed)
```bash
pm2 flush lgu-chat  # Clear PM2 logs
```

### Update Dependencies
```bash
npm update
npm run build
pm2 restart lgu-chat
```

## 🆘 Troubleshooting

### Server Not Responding
```bash
pm2 restart lgu-chat
```

### Check for Errors
```bash
pm2 logs lgu-chat --err --lines 50
```

### Complete Restart
```bash
pm2 stop lgu-chat
pm2 start ecosystem.config.js --env production
```

### System Resource Issues
```bash
pm2 monit  # Check CPU/Memory usage
```

## 📞 Support

- **Logs Location**: `/var/log/lgu-chat/`
- **Configuration**: `ecosystem.config.js`
- **Environment**: `.env`
- **Database**: `./data/localchat.db`

---

**✅ Your LGU-Chat server is now running in production mode!**

No need to manually run `npm start` anymore. PM2 handles everything automatically.
