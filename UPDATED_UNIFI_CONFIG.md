# 🚨 UPDATED: UniFi Configuration for lgu-chat.lguquezon.internal

## New Domain Configuration
- **Old**: lgu-chat.lguquezon.internal
- **New**: lgu-chat.lguquezon.internal
- **Server**: 192.168.32.14

## UniFi Configuration Required

### For Network Administrator:

1. **Login to UniFi Controller** (https://192.168.32.1)

2. **Navigate to**: Settings → Networks → [Your LAN]

3. **Configure DHCP Name Server**:
   - Change to: Manual
   - DNS Server 1: `192.168.32.14`
   - DNS Server 2: `8.8.8.8`

4. **Save Changes**

### What This Enables:
- All 1000+ employees can access: `http://lgu-chat.lguquezon.internal`
- More professional domain structure
- Clear organization identification

### DNS Server Configuration:
✅ Primary domain: lgu-chat.lguquezon.internal → 192.168.32.14
✅ Alternative: chat.lguquezon.internal → 192.168.32.14
✅ Legacy support: lgu-chat.lguquezon.internal → 192.168.32.14

### Testing After UniFi Configuration:
From any employee computer:
```cmd
nslookup lgu-chat.lguquezon.internal
```
Should return: 192.168.32.14

Then access in browser:
```
http://lgu-chat.lguquezon.internal
```

### Timeline:
- New connections: Immediate
- Existing devices: 1-24 hours (DHCP renewal)
- Force update: ipconfig /renew

## Production Status:
- ✅ DNS Server: Configured for new domain
- ✅ Web Application: Updated and running
- ✅ Nginx: Accepting new domain
- ⏳ Waiting: UniFi DHCP configuration

---
**Action Required**: Configure UniFi DHCP to use DNS server 192.168.32.14
