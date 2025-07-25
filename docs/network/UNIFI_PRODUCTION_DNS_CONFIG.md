# UniFi Production DNS Configuration for lgu-chat.lguquezon.internal

## Production Environment Requirements
- **Production Server**: 192.168.32.14 (Ubuntu with DNS + LGU-Chat)
- **Users**: 1000+ employees on UniFi network (192.168.32.1)
- **Required Access**: http://lgu-chat.lguquezon.internal
- **DNS Server Ready**: 192.168.32.14:53 (already configured)

## UniFi Controller Configuration Steps

### Step 1: Access UniFi Controller
1. Browse to: https://192.168.32.1 (or your UniFi controller URL)
2. Login with admin credentials

### Step 2: Configure Network DNS
1. Navigate to: **Settings** → **Networks**
2. Select your main network (usually "Default" or "LAN")
3. Scroll to **DHCP Name Server**
4. Change from "Auto" to "Manual"
5. Configure:
   ```
   Name Server 1: 192.168.32.14
   Name Server 2: 8.8.8.8
   ```

### Step 3: Apply Settings
1. Click **Save** or **Apply Changes**
2. The change will propagate as devices renew DHCP leases

### Alternative: UniFi Dream Machine Settings
If using UDM/UDM-Pro:
1. **Network** → **Settings** → **Networks**
2. Edit your LAN network
3. Under **Advanced** → **DHCP Name Server**
4. Set to Manual and enter DNS servers

## DNS Propagation Timeline
- Immediate: New devices connecting
- 1-4 hours: Most devices (DHCP renewal)
- 24 hours: All devices renewed

## To Force Immediate Update (Optional)
In UniFi Controller:
1. **Insights** → **Known Clients**
2. Select all → **Reconnect**

Or increase DHCP lease time temporarily to force renewal.

## Verification Steps

### From UniFi Controller:
Check that DNS settings show:
- Primary: 192.168.32.14
- Secondary: 8.8.8.8

### From Client Devices:
```cmd
ipconfig /all
```
Should show:
```
DNS Servers . . . . . : 192.168.32.14
                        8.8.8.8
```

### Test Resolution:
```cmd
nslookup lgu-chat.lguquezon.internal
```
Should return: 192.168.32.14

## Production Readiness Checklist
✅ DNS Server running on 192.168.32.14
✅ Domain configured: lgu-chat.lguquezon.internal → 192.168.32.14
✅ Web application accessible on port 80
✅ Firewall allows DNS (port 53)
⏳ UniFi DHCP configuration needed

## Support Information
If users still cannot access after DHCP renewal:
1. Clear DNS cache: `ipconfig /flushdns`
2. Renew IP: `ipconfig /renew`
3. Restart device

## Critical Note
Once configured in UniFi, ALL devices on the network will use 192.168.32.14 for DNS.
This server must remain available 24/7 for network DNS resolution.
