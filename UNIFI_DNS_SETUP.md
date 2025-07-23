# UniFi DNS Configuration for lgu-chat.lguquezon.internal

## Current Situation
- ✅ Server IP (192.168.32.14) is reachable from network
- ❌ Domain name (lgu-chat.lguquezon.internal) is NOT configured in DNS
- Being able to ping the IP doesn't create a domain name

## How to Add DNS Record in UniFi

### For UniFi Dream Machine / UDM Pro:

1. **Access UniFi Controller**
   - Open browser: https://192.168.32.1
   - Login with your UniFi credentials

2. **Navigate to Network Settings**
   - Click on "Settings" (gear icon)
   - Go to "Networks"
   - Select your main LAN network

3. **Add DNS Entry** (depending on UniFi version):
   
   **Option A - DHCP Name Server:**
   - Scroll to "DHCP Name Server"
   - Set to "Manual"
   - Add entry: `lgu-chat.lguquezon.internal` → `192.168.32.14`

   **Option B - Domain Name:**
   - Find "Domain Name" field
   - Add custom DNS records if available

4. **Alternative - Gateway Settings:**
   - Go to "Gateway" → "Settings"
   - Look for "Static DNS Entries" or "DNS"
   - Add:
     - Hostname: `lgu-chat.lguquezon.internal`
     - IP: `192.168.32.14`

### For Older UniFi Controllers:

1. **SSH into UniFi Device**
   ```bash
   ssh admin@192.168.32.1
   ```

2. **Add to hosts file**
   ```bash
   echo "192.168.32.14 lgu-chat.lguquezon.internal" >> /etc/hosts
   ```

3. **Configure dnsmasq** (if available)
   ```bash
   echo "address=/lgu-chat.lguquezon.internal/192.168.32.14" >> /etc/dnsmasq.d/custom.conf
   service dnsmasq restart
   ```

## Testing After Configuration

From any device on the network:
```bash
# Should return 192.168.32.14
nslookup lgu-chat.lguquezon.internal

# Should work in browser
http://lgu-chat.lguquezon.internal
```

## If DNS Configuration Not Available in UniFi

Consider these alternatives:

1. **Use Pi-hole** - Install on a Raspberry Pi for network-wide DNS
2. **Configure each device** - Add to hosts file on each device
3. **Use IP address** - Just use http://192.168.32.14

## Quick Test Commands

After adding DNS record in UniFi, test from any device:
```bash
# Windows
nslookup lgu-chat.lguquezon.internal

# macOS/Linux  
dig lgu-chat.lguquezon.internal
host lgu-chat.lguquezon.internal
```
