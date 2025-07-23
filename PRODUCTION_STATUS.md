# LGU-Chat Production Deployment Status

## 🚨 CRITICAL CONFIGURATION NEEDED IN UNIFI

For 1000+ users to access via `lgu-chat.lguquezon.internal`, the UniFi controller MUST be configured:

### Required UniFi Settings:
```
DHCP Name Server 1: 192.168.32.14
DHCP Name Server 2: 8.8.8.8
```

## Current Production Status

### ✅ Server Components Ready:
1. **DNS Server**: Active on 192.168.32.14:53
   - Resolving: lgu-chat.lguquezon.internal → 192.168.32.14
   - Capacity: Configured for 10,000 cache entries
   - Fallback: Routes to UniFi (192.168.32.1) and Google DNS

2. **Web Application**: Running on port 80
   - URL: http://lgu-chat.lguquezon.internal
   - Process Manager: PM2 (auto-restart enabled)
   - Status: Online and accessible

3. **Network Configuration**:
   - Static IP: 192.168.32.14
   - Firewall: Ports 80 (HTTP) and 53 (DNS) open
   - DNS Server: High-performance mode enabled

### ⏳ Pending UniFi Configuration:
- **Action Required**: UniFi admin must update DHCP DNS servers
- **Impact**: Users cannot resolve lgu-chat.lguquezon.internal until configured
- **Timeline**: Takes effect as devices renew DHCP (1-24 hours)

## Production Verification Commands

Run these after UniFi configuration:

### From Server (192.168.32.14):
```bash
# Check DNS server
systemctl status dnsmasq

# Test resolution
dig @localhost lgu-chat.lguquezon.internal

# Monitor DNS queries
sudo tail -f /var/log/dnsmasq.log
```

### From Any User Device:
```cmd
# Check DNS server assignment
ipconfig /all | findstr "DNS"

# Test domain resolution  
nslookup lgu-chat.lguquezon.internal

# Access application
http://lgu-chat.lguquezon.internal
```

## Emergency Contacts
- DNS issues: Check dnsmasq service on 192.168.32.14
- Web issues: Check PM2 status (pm2 status)
- Network issues: Verify UniFi DHCP DNS configuration

## Service Dependencies
1. dnsmasq (DNS) - Must run 24/7
2. PM2/Node.js (Web App) - Must run 24/7
3. Nginx (Web Proxy) - Must run 24/7
4. UniFi DHCP - Must distribute 192.168.32.14 as DNS

⚠️ **IMPORTANT**: This server is now critical infrastructure serving DNS for 1000+ users!
