# LGU-Chat Production Deployment Files

This directory contains the essential files needed for production deployment of LGU-Chat.

## Essential Files

### 🚀 **deploy-production.bat**
Complete production deployment script that:
- Stops existing server
- Installs dependencies
- Builds application
- Initializes database
- Deploys production server
- Updates IIS configuration

**Usage:** `deployment\deploy-production.bat`

### 🖥️ **start-production.bat**
Production server startup script
- Loads production environment variables
- Starts the production server with proper configuration

**Usage:** `deployment\start-production.bat`

### ⚙️ **production.env**
Production environment variables
- Database path, upload settings
- JWT secret (change this!)
- CORS and network configuration
- Domain and IP settings

**Important:** Change the JWT_SECRET before going live!

### 🔧 **production-server.js**
Secure production server implementation
- Proper JWT authentication (no demo users)
- Production CORS settings
- Real-time messaging via Socket.io
- File upload handling

### 🏗️ **setup-iis.ps1**
PowerShell script for IIS configuration
- Creates IIS site
- Configures URL rewriting
- Sets up Node.js hosting

## Quick Start

1. **Deploy:** `deployment\deploy-production.bat`
2. **Secure:** Change JWT_SECRET in production.env
3. **Clean:** `node scripts/manage-users.js cleanup`
4. **Start:** `deployment\start-production.bat`

## Security Checklist

- [ ] JWT_SECRET changed from default
- [ ] Admin password changed from default
- [ ] Demo users removed
- [ ] Database permissions secured
- [ ] CORS origins configured for your domain

For detailed instructions, see `PRODUCTION_SETUP.md` in the project root. 