# Understanding Domain Resolution in Local Networks

## Why Domain Names Don't Work Automatically

When you type `lgu-chat.lguquezon.internal` in a browser, your device needs to know what IP address that domain points to. Unlike public domains (like google.com) which use global DNS servers, local/custom domains need to be configured on each device.

## Current Setup
- **Server IP**: 192.168.32.14 (VMware bridged connection)
- **Domain**: lgu-chat.lguquezon.internal
- **Application**: Running on port 3000, proxied through Nginx on port 80

## Access Methods for Other Devices

### 1. Direct IP Access (ALWAYS WORKS - NO SETUP NEEDED)
```
http://192.168.32.14
```
This always works because it's a direct connection to the IP address.

### 2. Domain Name Access (REQUIRES CONFIGURATION ON EACH DEVICE)

The domain `lgu-chat.lguquezon.internal` will ONLY work if you tell each device where to find it.

#### Option A: Edit Hosts File on Each Device

**Windows:**
1. Run Notepad as Administrator
2. Open: `C:\Windows\System32\drivers\etc\hosts`
3. Add: `192.168.32.14 lgu-chat.lguquezon.internal`
4. Save and restart browser

**macOS/Linux:**
1. Terminal: `sudo nano /etc/hosts`
2. Add: `192.168.32.14 lgu-chat.lguquezon.internal`
3. Save: Ctrl+O, Enter, Ctrl+X

**After adding to hosts file, access via:**
```
http://lgu-chat.lguquezon.internal
```

#### Option B: Local DNS Server (Best for Many Devices)
Set up a DNS server on your network (Pi-hole, dnsmasq, or your router's DNS) to resolve lgu-chat.lguquezon.internal to 192.168.32.14 for all devices automatically.

## Why This Happens
- Domain names are just human-friendly aliases for IP addresses
- Without DNS or hosts file entries, devices don't know that lgu-chat.lguquezon.internal = 192.168.32.14
- The server can't "broadcast" its domain name to other devices
- Each device must be told how to resolve the domain

## Quick Test Commands
From any device on the network:
```bash
# This will work (direct IP):
ping 192.168.32.14

# This will NOT work without hosts file:
ping lgu-chat.lguquezon.internal

# After adding hosts entry, both will work
```

## TL;DR
- **Easy way**: Just use http://192.168.32.14
- **Domain way**: Must configure each device's hosts file
- **The server is working correctly** - this is how networking works
