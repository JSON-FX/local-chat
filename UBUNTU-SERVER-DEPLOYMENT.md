# 🚀 LGU Chat - Ubuntu Server Production Deployment Guide

## 📋 Overview

This guide provides a complete step-by-step process to deploy LGU Chat on an Ubuntu Server using Docker, making it accessible via the domain `chat.lguquezon.local`.

## 🎯 Final Result
- **Production-ready LGU Chat application**
- **Accessible via**: `http://chat.lguquezon.local`
- **Secure, scalable, and maintainable deployment**
- **Automatic database initialization**
- **File upload and real-time messaging support**

---

## 📋 Prerequisites

- Ubuntu Server 20.04 LTS or later
- At least 2GB RAM (4GB recommended)
- 20GB+ available disk space
- Network access and sudo privileges
- Basic familiarity with command line

---

## 🔧 Phase 1: Ubuntu Server Setup

### 1.1 Update System Packages

```bash
# Update package list and upgrade system
sudo apt update && sudo apt upgrade -y

# Install essential tools
sudo apt install -y curl wget git vim htop unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release
```

### 1.2 Configure Firewall

```bash
# Enable UFW firewall
sudo ufw enable

# Allow SSH, HTTP, and HTTPS
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS (for future SSL setup)

# Check firewall status
sudo ufw status
```

### 1.3 Create Application User (Recommended)

```bash
# Create dedicated user for the application
sudo adduser lgu-admin
sudo usermod -aG sudo lgu-admin
sudo usermod -aG docker lgu-admin  # We'll create docker group later

# Switch to the new user
sudo su - lgu-admin
```

---

## 🐳 Phase 2: Docker Installation

### 2.1 Install Docker Engine

```bash
# Remove any old Docker installations
sudo apt remove -y docker docker-engine docker.io containerd runc

# Add Docker's official GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Add Docker repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Start and enable Docker service
sudo systemctl start docker
sudo systemctl enable docker

# Add current user to docker group
sudo usermod -aG docker $USER

# Apply group changes (logout and login again, or run):
newgrp docker

# Verify Docker installation
docker --version
docker compose version
```

### 2.2 Test Docker Installation

```bash
# Test Docker with hello-world
docker run hello-world

# If successful, clean up the test container
docker rmi hello-world
```

---

## 📂 Phase 3: Application Deployment

### 3.1 Clone the Repository

```bash
# Navigate to home directory
cd ~

# Clone the LGU Chat repository
git clone <YOUR_REPOSITORY_URL> lgu-chat
cd lgu-chat

# If repository is private, you may need to authenticate
# Use personal access token or SSH key
```

### 3.2 Configure Environment Variables

```bash
# Copy the production environment template
cp production.env .env

# Generate a secure JWT secret
JWT_SECRET=$(openssl rand -base64 32)

# Update the environment file with chat.lguquezon.local domain
cat > .env << EOF
# LGU-Chat Production Environment Configuration

# REQUIRED: Secure JWT secret (generated)
JWT_SECRET=$JWT_SECRET

# Server Configuration
NODE_ENV=production
PORT=3000
SERVER_HOST=0.0.0.0

# Domain configuration - Production domain for LGU Quezon
DOMAIN_NAME=chat.lguquezon.local

# Socket.IO URL - Production URL
NEXT_PUBLIC_SOCKET_URL=http://chat.lguquezon.local

# CORS allowed origins
ALLOWED_ORIGINS=http://chat.lguquezon.local

# JWT Token Expiration
JWT_EXPIRES_IN=24h

# Optional: Custom allowed IPs for network access
CUSTOM_ALLOWED_IPS=
EOF

echo "✅ Environment configured with secure JWT secret"
```

### 3.3 Update Docker Compose for Production

```bash
# Update docker-compose.prod.yml for the correct domain
sed -i 's/lgu-chat.lguquezon.local/chat.lguquezon.local/g' docker-compose.prod.yml

# Verify the configuration
grep "chat.lguquezon.local" docker-compose.prod.yml
```

### 3.4 Create Required Directories

```bash
# Create data and uploads directories
mkdir -p data uploads

# Set proper permissions
chmod 755 data uploads

# Ensure proper ownership
sudo chown -R $USER:$USER data uploads
```

---

## 🚀 Phase 4: Build and Deploy

### 4.1 Build the Application

```bash
# Build the Docker image (this may take 5-10 minutes)
docker compose -f docker-compose.prod.yml build

# Verify the image was built
docker images | grep lgu-chat
```

### 4.2 Start the Application

```bash
# Start the application in production mode
docker compose -f docker-compose.prod.yml up -d

# Check if containers are running
docker compose -f docker-compose.prod.yml ps

# View application logs
docker compose -f docker-compose.prod.yml logs -f lgu-chat
```

### 4.3 Verify Initial Setup

```bash
# Wait for application to initialize (about 30-60 seconds)
sleep 60

# Check application health
curl -I http://localhost:3000/api/auth/me

# Check if database was created
ls -la data/

# Expected output should show localchat.db file
```

---

## 🌐 Phase 5: Network Configuration

### 5.1 Configure Server Hostname (Optional)

```bash
# Set a friendly hostname for your server
sudo hostnamectl set-hostname lgu-chat-server

# Add hostname to hosts file
echo "127.0.0.1 lgu-chat-server" | sudo tee -a /etc/hosts
```

### 5.2 Configure Local Domain Resolution

```bash
# Get your server's IP address
SERVER_IP=$(hostname -I | awk '{print $1}')
echo "Server IP: $SERVER_IP"

# Add local domain resolution
echo "$SERVER_IP chat.lguquezon.local" | sudo tee -a /etc/hosts

# Test local domain resolution
ping -c 3 chat.lguquezon.local
```

### 5.3 Test Application Access

```bash
# Test direct access
curl -I http://localhost:3000

# Test domain access
curl -I http://chat.lguquezon.local

# Both should return "HTTP/1.1 200 OK"
```

---

## 👥 Phase 6: Client Device Setup

### 6.1 Network Discovery

```bash
# Find your server's network IP address
ip addr show | grep "inet " | grep -v "127.0.0.1"

# Or use this command
hostname -I
```

### 6.2 Client Configuration

For each device that needs to access the chat application, add the following line to their hosts file:

**Windows (Run as Administrator):**
```cmd
# Edit: C:\Windows\System32\drivers\etc\hosts
<SERVER_IP>    chat.lguquezon.local
```

**macOS/Linux:**
```bash
# Edit: /etc/hosts
sudo echo "<SERVER_IP>    chat.lguquezon.local" >> /etc/hosts
```

**Example:**
```
192.168.1.100    chat.lguquezon.local
```

---

## 🔒 Phase 7: Security Configuration

### 7.1 Change Default Admin Password

```bash
# Once the application is running, access it via browser:
# http://chat.lguquezon.local

# Default login credentials:
# Username: admin
# Password: admin123

# ⚠️ IMPORTANT: Change this password immediately after first login!
```

### 7.2 Configure Additional Security

```bash
# Create backup directory
mkdir -p ~/backups

# Set up log rotation for Docker logs
sudo mkdir -p /etc/docker
cat << EOF | sudo tee /etc/docker/daemon.json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF

# Restart Docker to apply logging changes
sudo systemctl restart docker

# Restart application containers
cd ~/lgu-chat
docker compose -f docker-compose.prod.yml restart
```

---

## 📊 Phase 8: Monitoring and Maintenance

### 8.1 Create Monitoring Script

```bash
cat > ~/monitor-lgu-chat.sh << 'EOF'
#!/bin/bash

echo "🔍 LGU Chat System Status - $(date)"
echo "=================================="

# Check Docker service
echo "📦 Docker Service:"
systemctl is-active docker
echo ""

# Check container status
echo "🐳 Container Status:"
cd ~/lgu-chat
docker compose -f docker-compose.prod.yml ps
echo ""

# Check application health
echo "🌐 Application Health:"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://chat.lguquezon.local/api/auth/me
echo ""

# Check disk usage
echo "💾 Disk Usage:"
df -h | grep -E "Filesystem|/$"
echo ""

# Check memory usage
echo "🧠 Memory Usage:"
free -h
echo ""

# Check database size
echo "🗄️ Database Size:"
if [ -f ~/lgu-chat/data/localchat.db ]; then
    ls -lh ~/lgu-chat/data/localchat.db
else
    echo "Database not found!"
fi
echo ""

# Check recent logs for errors
echo "📝 Recent Error Logs (last 5):"
cd ~/lgu-chat
docker compose -f docker-compose.prod.yml logs --tail=5 2>&1 | grep -i error || echo "No recent errors found"
echo ""

echo "✅ Status check complete"
EOF

chmod +x ~/monitor-lgu-chat.sh
```

### 8.2 Create Backup Script

```bash
cat > ~/backup-lgu-chat.sh << 'EOF'
#!/bin/bash

BACKUP_DIR=~/backups
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="lgu-chat-backup-$DATE.tar.gz"

echo "🔄 Starting LGU Chat backup..."

# Create backup directory
mkdir -p $BACKUP_DIR

# Stop application for consistent backup
cd ~/lgu-chat
docker compose -f docker-compose.prod.yml stop

# Create backup
tar -czf "$BACKUP_DIR/$BACKUP_FILE" data/ uploads/ .env

# Restart application
docker compose -f docker-compose.prod.yml start

# Check backup file
if [ -f "$BACKUP_DIR/$BACKUP_FILE" ]; then
    echo "✅ Backup completed: $BACKUP_FILE"
    echo "📊 Backup size: $(ls -lh $BACKUP_DIR/$BACKUP_FILE | awk '{print $5}')"
    
    # Keep only last 7 backups
    cd $BACKUP_DIR
    ls -t lgu-chat-backup-*.tar.gz | tail -n +8 | xargs -r rm
    echo "🧹 Old backups cleaned up"
else
    echo "❌ Backup failed!"
    exit 1
fi
EOF

chmod +x ~/backup-lgu-chat.sh
```

### 8.3 Setup Automated Monitoring

```bash
# Add monitoring to crontab (runs every 30 minutes)
(crontab -l 2>/dev/null; echo "*/30 * * * * ~/monitor-lgu-chat.sh >> ~/lgu-chat-monitor.log 2>&1") | crontab -

# Add daily backup to crontab (runs at 2 AM daily)
(crontab -l 2>/dev/null; echo "0 2 * * * ~/backup-lgu-chat.sh >> ~/lgu-chat-backup.log 2>&1") | crontab -

# Verify crontab
crontab -l
```

---

## 🎯 Phase 9: Verification and Testing

### 9.1 Complete System Test

```bash
# Run the monitoring script
~/monitor-lgu-chat.sh

# Test application endpoints
echo "Testing main page..."
curl -s -o /dev/null -w "Main page: %{http_code}\n" http://chat.lguquezon.local

echo "Testing API endpoint..."
curl -s -o /dev/null -w "API endpoint: %{http_code}\n" http://chat.lguquezon.local/api/auth/me

echo "Testing Socket.IO..."
curl -s -o /dev/null -w "Socket.IO: %{http_code}\n" http://chat.lguquezon.local/socket.io/

# Check logs for any issues
echo "Checking for errors in logs..."
cd ~/lgu-chat
docker compose -f docker-compose.prod.yml logs --tail=20 | grep -i error || echo "No errors found"
```

### 9.2 Performance Baseline

```bash
# Create performance monitoring
cat > ~/performance-check.sh << 'EOF'
#!/bin/bash

echo "📈 Performance Check - $(date)"
echo "=============================="

# CPU usage
echo "🖥️ CPU Usage:"
top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1

# Memory usage
echo "🧠 Memory Usage:"
free | grep Mem | awk '{printf "%.1f%%\n", $3/$2 * 100.0}'

# Disk I/O
echo "💾 Disk Usage:"
df -h / | awk 'NR==2{printf "%s\n", $5}'

# Container resource usage
echo "🐳 Container Resources:"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"

# Network connections
echo "🌐 Active Connections:"
netstat -tuln | grep :3000 | wc -l

echo ""
EOF

chmod +x ~/performance-check.sh
```

---

## 🚨 Troubleshooting Guide

### Common Issues and Solutions

#### 1. Container Won't Start
```bash
# Check Docker service
sudo systemctl status docker

# Check container logs
docker compose -f docker-compose.prod.yml logs lgu-chat

# Rebuild if necessary
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d
```

#### 2. Database Issues
```bash
# Check if database file exists
ls -la data/

# Check database permissions
ls -la data/localchat.db

# Recreate database if corrupted
docker compose -f docker-compose.prod.yml down
rm -f data/localchat.db
docker compose -f docker-compose.prod.yml up -d
```

#### 3. Network Access Issues
```bash
# Check if application is listening
netstat -tuln | grep :3000

# Check firewall
sudo ufw status

# Test local connectivity
curl -I http://localhost:3000

# Check domain resolution
nslookup chat.lguquezon.local
```

#### 4. Performance Issues
```bash
# Check system resources
~/performance-check.sh

# Check Docker resource usage
docker stats

# Monitor logs for bottlenecks
docker compose -f docker-compose.prod.yml logs -f --tail=50
```

---

## 🔄 Maintenance Tasks

### Daily Tasks
```bash
# Quick health check
~/monitor-lgu-chat.sh

# Check for critical errors
docker compose -f docker-compose.prod.yml logs --since=24h | grep -i "error\|critical\|fatal"
```

### Weekly Tasks
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Manual backup
~/backup-lgu-chat.sh

# Check disk space
df -h

# Review logs
tail -100 ~/lgu-chat-monitor.log
```

### Monthly Tasks
```bash
# Docker cleanup
docker system prune -f

# Check for application updates
cd ~/lgu-chat
git fetch --all
git log --oneline HEAD..origin/main

# Review and rotate logs
sudo journalctl --vacuum-time=30d
```

---

## 📋 Deployment Checklist

### Pre-Deployment ✅
- [ ] Ubuntu Server 20.04+ installed and updated
- [ ] Network connectivity confirmed
- [ ] Sufficient disk space (20GB+) available
- [ ] User account with sudo privileges created

### Docker Installation ✅
- [ ] Docker Engine installed and running
- [ ] Docker Compose installed
- [ ] User added to docker group
- [ ] Test container runs successfully

### Application Setup ✅
- [ ] Repository cloned successfully
- [ ] Environment variables configured with secure JWT secret
- [ ] Domain updated to chat.lguquezon.local
- [ ] Data and uploads directories created
- [ ] Docker image built successfully

### Deployment ✅
- [ ] Application containers running
- [ ] Database initialized automatically
- [ ] Health checks passing
- [ ] Logs show no critical errors

### Network Configuration ✅
- [ ] Firewall configured (ports 22, 80, 443)
- [ ] Local domain resolution working
- [ ] Application accessible via chat.lguquezon.local
- [ ] Client devices configured with hosts entries

### Security ✅
- [ ] Default admin password changed
- [ ] JWT secret is secure and unique
- [ ] Docker logging configured
- [ ] Application running as non-root user

### Monitoring ✅
- [ ] Monitoring script created and tested
- [ ] Backup script created and tested
- [ ] Automated monitoring scheduled
- [ ] Performance baseline established

---

## 🎉 Success Confirmation

Your LGU Chat deployment is successful when:

✅ **Server Access**:
```bash
curl -I http://chat.lguquezon.local
# Returns: HTTP/1.1 200 OK
```

✅ **Application Login**:
- Navigate to `http://chat.lguquezon.local`
- Login with admin credentials
- Change default password
- Create test users and groups

✅ **Real-time Features**:
- Send messages between users
- Upload and download files
- Receive real-time notifications

✅ **System Health**:
```bash
~/monitor-lgu-chat.sh
# All services show as healthy
```

---

## 📞 Support Commands

### Quick Status Check
```bash
cd ~/lgu-chat && docker compose -f docker-compose.prod.yml ps
```

### View Live Logs
```bash
cd ~/lgu-chat && docker compose -f docker-compose.prod.yml logs -f
```

### Restart Application
```bash
cd ~/lgu-chat && docker compose -f docker-compose.prod.yml restart
```

### Stop Application
```bash
cd ~/lgu-chat && docker compose -f docker-compose.prod.yml down
```

### Start Application
```bash
cd ~/lgu-chat && docker compose -f docker-compose.prod.yml up -d
```

---

## 🔗 Quick Reference

- **Application URL**: `http://chat.lguquezon.local`
- **Default Admin**: `admin` / `admin123` (⚠️ Change immediately!)
- **Application Directory**: `~/lgu-chat`
- **Data Directory**: `~/lgu-chat/data`
- **Uploads Directory**: `~/lgu-chat/uploads`
- **Monitoring Script**: `~/monitor-lgu-chat.sh`
- **Backup Script**: `~/backup-lgu-chat.sh`
- **Logs**: `docker compose -f docker-compose.prod.yml logs`

---

**🎯 Your LGU Chat application is now production-ready and accessible at `http://chat.lguquezon.local`!**

*Remember to change the default admin password and configure client devices with the server's IP address in their hosts files.* 