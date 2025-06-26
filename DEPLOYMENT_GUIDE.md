# LGU Chat - Windows Server 2019 Deployment Guide

This guide will help you deploy the LGU Chat application to Windows Server 2019 with IIS, accessible via `lgu-chat.local`.

## Prerequisites

### 1. Install Node.js
- Download Node.js LTS (v18 or v20) from [nodejs.org](https://nodejs.org)
- Install with default settings
- Verify installation: Open Command Prompt and run:
  ```cmd
  node --version
  npm --version
  ```

### 2. Install IIS Node.js Module
- Download `iisnode` from [GitHub releases](https://github.com/azure/iisnode/releases)
- Install the x64 version for Windows Server 2019
- This allows IIS to host Node.js applications

### 3. Install URL Rewrite Module
- Download from [Microsoft IIS Download](https://www.iis.net/downloads/microsoft/url-rewrite)
- Install the module (required for routing)

### 4. Enable IIS Features
Open PowerShell as Administrator and run:
```powershell
Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServerRole, IIS-WebServer, IIS-CommonHttpFeatures, IIS-HttpErrors, IIS-HttpRedirect, IIS-ApplicationDevelopment, IIS-NetFxExtensibility45, IIS-HealthAndDiagnostics, IIS-HttpLogging, IIS-Security, IIS-RequestFiltering, IIS-Performance, IIS-WebServerManagementTools, IIS-ManagementConsole, IIS-IIS6ManagementCompatibility, IIS-Metabase
```

## Deployment Steps

### Step 1: Prepare Your Application

1. **Clone/Copy your application** to the Windows Server
2. **Navigate to application directory** in Command Prompt
3. **Build the application**:
   ```cmd
   deployment\build.bat
   ```

### Step 2: Configure IIS

1. **Run IIS configuration script** as Administrator:
   ```powershell
   .\deployment\setup-iis.ps1
   ```

   This script will:
   - Create a new IIS site named "LGU-Chat"
   - Configure application pool for Node.js
   - Set proper file permissions
   - Create necessary directories

### Step 3: Deploy Application

1. **Deploy to IIS directory**:
   ```cmd
   deployment\deploy.bat
   ```

   This will copy all files to `C:\inetpub\wwwroot\lgu-chat`

### Step 4: Configure DNS

1. **Run DNS configuration script** as Administrator:
   ```cmd
   deployment\configure-dns.bat
   ```

   This will:
   - Create DNS A records for `lgu-chat.local`
   - Add entries to the hosts file
   - Configure network access

### Step 5: Start the Application

1. **Open IIS Manager**
2. **Navigate to Sites → LGU-Chat**
3. **Click "Start" in the Actions panel**

## Network Configuration

### Firewall Configuration
Ensure Windows Firewall allows HTTP traffic:
```powershell
New-NetFirewallRule -DisplayName "Allow HTTP" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow
```

### DNS Server Configuration
For network-wide access, configure your DNS server:
1. Open DNS Manager
2. Create forward lookup zone for `lgu-chat.local`
3. Add A record pointing to your server's IP address

### Client Configuration
On client computers, ensure they use your Windows Server as their DNS server:
1. Go to Network Settings
2. Change DNS server to your Windows Server IP
3. Test access: `http://lgu-chat.local`

## Application Configuration

### Default Login
- **Username**: `admin`
- **Password**: `admin123`
- **⚠️ Important**: Change the default password immediately after first login!

### Environment Variables
Edit `C:\inetpub\wwwroot\lgu-chat\deployment\production.env` to configure:
- JWT secret (REQUIRED for security)
- Allowed IP ranges
- File upload limits

### Database Location
- SQLite database is stored in: `C:\inetpub\wwwroot\lgu-chat\data\localchat.db`
- Backup this file regularly

### File Uploads
- Upload directory: `C:\inetpub\wwwroot\lgu-chat\uploads\`
- Ensure IIS_IUSRS has write permissions

## Troubleshooting

### Application Won't Start
1. Check Event Viewer → Windows Logs → Application
2. Look for Node.js or iisnode errors
3. Verify Node.js is installed correctly
4. Check file permissions on application directory

### DNS Issues
1. Verify DNS service is running: `Get-Service DNS`
2. Check DNS records: `nslookup lgu-chat.local`
3. Ensure clients use correct DNS server

### Socket.io Issues
- Socket.io may require additional configuration for network access
- Check firewall settings for WebSocket connections
- Verify CORS settings in application

### File Upload Issues
1. Check upload directory permissions
2. Verify IIS_IUSRS has write access
3. Check upload file size limits

### Database Issues
1. Ensure data directory has write permissions
2. Check if SQLite database file exists
3. Re-run database initialization: `npm run init-db`

## Maintenance

### Regular Backups
Create scheduled backups of:
- Database: `C:\inetpub\wwwroot\lgu-chat\data\localchat.db`
- Uploads: `C:\inetpub\wwwroot\lgu-chat\uploads\`

### Log Files
Monitor logs in:
- IIS logs: `C:\inetpub\logs\LogFiles\`
- Application logs: `C:\inetpub\wwwroot\lgu-chat\iisnode\`

### Updates
To update the application:
1. Build new version with `deployment\build.bat`
2. Stop IIS site
3. Run `deployment\deploy.bat`
4. Start IIS site

## Security Considerations

1. **Change default admin password**
2. **Update JWT secret** in production.env
3. **Configure HTTPS** for production use
4. **Regular security updates** for Windows Server and Node.js
5. **Firewall configuration** - only allow necessary ports
6. **File permissions** - ensure minimal required access

## Performance Optimization

1. **Enable compression** in IIS
2. **Configure caching** headers
3. **Monitor resource usage** with Task Manager
4. **Regular database maintenance** (SQLite VACUUM)

## Support

For issues with this deployment:
1. Check application logs
2. Verify IIS configuration
3. Test network connectivity
4. Review Windows Event Logs 