# DNS Server Configuration Complete! 🎉

## DNS Server Details
- **DNS Server IP**: 192.168.32.14
- **Supported Domains**:
  - `lgu-chat.lguquezon.internal` → 192.168.32.14
  - `chat.internal` → 192.168.32.14
  - `lgu-chat.lan` → 192.168.32.14

## How to Configure Other Devices to Use This DNS

### Option 1: Configure Individual Devices

#### Windows:
1. Open Network Settings
2. Go to your network adapter properties
3. Select "Internet Protocol Version 4 (TCP/IPv4)"
4. Click "Properties"
5. Select "Use the following DNS server addresses"
6. Primary DNS: `192.168.32.14`
7. Secondary DNS: `192.168.32.1` (your router)
8. Click OK

#### macOS:
1. System Preferences → Network
2. Select your network connection
3. Click "Advanced" → "DNS"
4. Add `192.168.32.14` at the top
5. Click OK → Apply

#### Linux:
1. Edit `/etc/resolv.conf` or use NetworkManager
2. Add: `nameserver 192.168.32.14`

#### Mobile Devices:
- **Android**: Wi-Fi settings → Modify network → Advanced → DNS 1: 192.168.32.14
- **iOS**: Settings → Wi-Fi → (i) → Configure DNS → Manual → Add 192.168.32.14

### Option 2: Configure Router/DHCP (Recommended)

Configure your UniFi router to give out this DNS server:
1. Login to UniFi Controller
2. Settings → Networks → [Your Network]
3. DHCP Name Server → Manual
4. DNS Server 1: `192.168.32.14`
5. DNS Server 2: `192.168.32.1`

## Testing DNS Resolution

From any configured device:
```bash
# Windows
nslookup lgu-chat.lguquezon.internal

# macOS/Linux
dig lgu-chat.lguquezon.internal
host lgu-chat.lguquezon.internal

# Or just open browser
http://lgu-chat.lguquezon.internal
```

## DNS Server Management

### Check DNS server status:
```bash
sudo systemctl status dnsmasq
```

### View DNS query logs:
```bash
sudo journalctl -u dnsmasq -f
```

### Add more domains:
Edit `/etc/dnsmasq.conf` and add:
```
address=/newdomain.internal/192.168.x.x
```
Then restart: `sudo systemctl restart dnsmasq`

## Benefits of This Setup
✅ No need to edit hosts files on each device
✅ Works with all devices including mobile
✅ Can add unlimited local domains
✅ Automatic fallback to upstream DNS for internet
✅ Fast local DNS caching
