# DNS Troubleshooting Guide

## Current Setup Status
✅ DNS Server running on 192.168.32.14
✅ Domain lgu-chat.lguquezon.internal resolves to 192.168.32.14
✅ Web application configured for lgu-chat.lguquezon.internal
❌ Other devices not using this DNS server

## The Problem
Other devices on your network (under 192.168.32.1) are using your router's DNS, not this server's DNS.

## Solutions (Choose One)

### Solution 1: Configure Each Device Manually
On each device that needs access:

**Windows:**
1. Control Panel → Network and Internet → Network Connections
2. Right-click your connection → Properties
3. Select "Internet Protocol Version 4" → Properties
4. Use these DNS servers:
   - Preferred: 192.168.32.14
   - Alternate: 192.168.32.1

**After changing DNS, flush cache:**
```
ipconfig /flushdns
```

### Solution 2: Configure UniFi DHCP (Best Solution)
1. Login to UniFi Controller at https://192.168.32.1
2. Go to Settings → Networks → [Your LAN]
3. Find "DHCP Name Server" 
4. Change from "Auto" to "Manual"
5. Enter:
   - DNS 1: 192.168.32.14
   - DNS 2: 8.8.8.8
6. Save changes
7. Devices will get new DNS on next DHCP renewal

### Solution 3: Use IP Address
Just tell users to access: http://192.168.32.14

## Testing DNS From Other Devices

After configuring DNS on a device, test:

**Windows CMD:**
```
nslookup lgu-chat.lguquezon.internal 192.168.32.14
ping lgu-chat.lguquezon.internal
```

**If it shows 192.168.32.14, DNS is working!**

## Quick Diagnostic Commands

From another device on network:
```
# Test if DNS server is reachable
nslookup google.com 192.168.32.14

# Test specific domain
nslookup lgu-chat.lguquezon.internal 192.168.32.14

# Check current DNS server
ipconfig /all | findstr "DNS Servers"
```
