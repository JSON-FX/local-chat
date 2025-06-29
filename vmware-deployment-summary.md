# 🖥️ LGU-Chat VMware Fusion Deployment - Complete Guide Package

## 📋 Overview

This package provides everything you need to deploy LGU-Chat on Ubuntu Server 24.04 running in VMware Fusion with Bridge Network, making it accessible from all devices on your network using the domain `lgu-chat.lguquezon.local`.

## 📚 Guide Package Contents

### 1. 📖 Main Deployment Guide
**File**: `ubuntu-server-vmware-deployment.md`
- **Purpose**: Complete step-by-step manual installation guide
- **Covers**: VM setup, Ubuntu installation, Docker setup, application deployment
- **Best for**: Detailed understanding and manual control

### 2. 🚀 Quick Setup Script
**File**: `quick-vm-setup.sh`
- **Purpose**: Automated setup script for Ubuntu Server
- **Usage**: `./quick-vm-setup.sh`
- **Best for**: Fast deployment after Ubuntu Server is installed

### 3. 📱 Client Device Setup
**File**: `client-setup-guides.md`
- **Purpose**: Configure Windows, macOS, iOS, Android devices for network access
- **Covers**: Hosts file setup, router DNS, mobile device configuration
- **Best for**: Setting up access from multiple devices

## 🚀 Quick Start Process

### Phase 1: VMware & Ubuntu Setup
1. **Create VM** in VMware Fusion:
   - Ubuntu Server 24.04 LTS
   - Bridge Network mode
   - 2GB+ RAM, 20GB+ disk

2. **Install Ubuntu Server** with OpenSSH enabled

### Phase 2: Automated Setup
```bash
# On Ubuntu Server, run:
wget https://raw.githubusercontent.com/your-repo/lgu-chat/main/quick-vm-setup.sh
chmod +x quick-vm-setup.sh
./quick-vm-setup.sh
```

### Phase 3: Network Access Setup
- Follow `client-setup-guides.md` for each device type
- Add hosts entry: `[VM_IP]    lgu-chat.lguquezon.local`

## 🎯 End Result

- **Server**: Ubuntu Server VM running LGU-Chat in Docker
- **Access**: `http://lgu-chat.lguquezon.local` from any network device
- **Security**: Production-ready with secure JWT secrets
- **Monitoring**: Built-in status monitoring and health checks

## 📊 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Local Network                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   macOS     │  │   Windows   │  │   Mobile    │         │
│  │   Device    │  │   Device    │  │   Device    │         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
│         │                │                │                │
│         └────────────────┼────────────────┘                │
│                          │                                 │
│  ┌─────────────────────┬─┴─────────────────────────────┐   │
│  │    VMware Fusion    │                               │   │
│  │  ┌─────────────────┬┴─────────────────────────────┐ │   │
│  │  │ Ubuntu Server   │   Bridge Network Mode       │ │   │
│  │  │                 │   IP: 192.168.1.100         │ │   │
│  │  │ ┌─────────────┐ │                             │ │   │
│  │  │ │   Docker    │ │                             │ │   │
│  │  │ │ ┌─────────┐ │ │                             │ │   │
│  │  │ │ │LGU-Chat│ │ │                             │ │   │
│  │  │ │ │  :3000 │ │ │                             │ │   │
│  │  │ │ └─────────┘ │ │                             │ │   │
│  │  │ └─────────────┘ │                             │ │   │
│  │  └─────────────────┴─────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘

Domain: lgu-chat.lguquezon.local → 192.168.1.100
```

## 🔧 Technical Specifications

### VM Requirements
- **OS**: Ubuntu Server 24.04 LTS
- **RAM**: 2GB minimum (4GB recommended)
- **Disk**: 20GB minimum (40GB recommended)
- **Network**: Bridge Mode for network accessibility
- **Cores**: 2 CPU cores minimum

### Application Stack
- **Runtime**: Docker & Docker Compose
- **Framework**: Next.js (Production build)
- **Database**: SQLite with persistent storage
- **WebSocket**: Socket.IO for real-time messaging
- **Security**: JWT authentication with secure secrets

### Network Configuration
- **Port**: 80 (HTTP) - no port needed in URLs
- **Domain**: `lgu-chat.lguquezon.local`
- **CORS**: Production-configured for domain access
- **Firewall**: UFW with ports 22, 80, 443 open

## 📋 Deployment Checklist

### ✅ VM Setup Phase
- [ ] VMware Fusion installed
- [ ] Ubuntu Server 24.04 ISO downloaded
- [ ] VM created with Bridge Network
- [ ] Ubuntu Server installed with SSH
- [ ] VM has network IP address

### ✅ Application Setup Phase
- [ ] Dependencies installed (Docker, Git, etc.)
- [ ] Repository cloned
- [ ] Environment configured with secure JWT
- [ ] Docker containers built and running
- [ ] Application accessible on VM

### ✅ Network Access Phase
- [ ] Domain configured on server
- [ ] Hosts entries added on client devices
- [ ] Network access tested from multiple devices
- [ ] Admin password changed from default
- [ ] Monitoring scripts configured

## 🚨 Troubleshooting Quick Reference

### VM Issues
```bash
# Check VM IP
hostname -I

# Check network connectivity
ping 8.8.8.8
```

### Application Issues
```bash
# Check Docker status
docker compose ps

# View logs
docker compose logs -f

# Restart application
docker compose restart
```

### Network Access Issues
```bash
# Test from VM
curl -I http://lgu-chat.lguquezon.local

# Check firewall
sudo ufw status

# Monitor application
~/monitor-lgu-chat.sh
```

## 📞 Support & Maintenance

### Daily Operations
```bash
# Quick status check
~/monitor-lgu-chat.sh

# View application logs
cd ~/lgu-chat && docker compose logs -f

# Restart if needed
cd ~/lgu-chat && docker compose restart
```

### Regular Maintenance
```bash
# Update system (weekly)
sudo apt update && sudo apt upgrade -y

# Backup data (weekly)
cd ~/lgu-chat
docker compose stop
tar -czf ~/backup-$(date +%Y%m%d).tar.gz data/ uploads/
docker compose start

# Check disk space
df -h
```

## 🎉 Success Criteria

Your deployment is successful when:

✅ **Server Side**:
- Ubuntu Server VM running with network IP
- Docker containers healthy and auto-restarting
- Application responds to health checks
- Logs show no errors

✅ **Network Access**:
- Domain resolves from all client devices
- Login page loads from any device browser
- Real-time messaging works between devices
- File uploads function properly

✅ **Security**:
- Default admin password changed
- JWT secret is secure (32+ characters)
- Firewall properly configured
- Regular backups scheduled

## 🚀 Next Steps After Deployment

1. **SSL/HTTPS Setup**: Configure reverse proxy with SSL certificates
2. **Domain Setup**: Register actual domain for internet access
3. **Backup Strategy**: Implement automated backup system
4. **Monitoring**: Set up more comprehensive monitoring
5. **Scaling**: Consider multi-container setup for larger deployments

---

## 📁 File Structure Summary

```
lgu-chat-deployment/
├── ubuntu-server-vmware-deployment.md  # Complete manual guide
├── quick-vm-setup.sh                   # Automated setup script
├── client-setup-guides.md              # Multi-device access setup
├── vmware-deployment-summary.md        # This overview file
└── existing-production-files/
    ├── docker-compose.prod.yml
    ├── production-deployment.md
    ├── production.env
    └── production-ready-summary.md
```

🎯 **Ready to deploy!** Start with the VM setup, run the quick setup script, then configure client devices for network-wide access to your LGU-Chat server. 